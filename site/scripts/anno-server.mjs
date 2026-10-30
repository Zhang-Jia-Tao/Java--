#!/usr/bin/env node
/**
 * 批注同步服务（本地/自建皆可）
 *
 * 用法：node scripts/anno-server.mjs            # 默认 4400
 *      ANNO_PORT=4500 node scripts/anno-server.mjs
 *
 * 存储：./server-data/annos.json（纯文本，可 git 管、可直接改）
 *       ./server-data/intern-edits.json（实习经历页的字段编辑）
 * 接口：
 *   GET    /api/anno/all                → { pages: { "/path": [anno...] }, updatedAt }
 *   GET    /api/anno?page=/path         → [anno...]
 *   POST   /api/anno                    → { page, anno }  按 id 覆盖
 *   DELETE /api/anno?id=xx&page=/path   → { ok }
 *   POST   /api/anno/bulk               → { pages: {...} } 合并（同 id 取 updatedAt 新者）
 *   GET    /api/intern/all              → { tasks: { taskId: { path: { value, updatedAt, history } } } }
 *   POST   /api/intern                  → { task, path, value, updatedAt } 单字段保存
 *   POST   /api/intern/bulk             → { tasks: {...} } 整包合并（取 updatedAt 新者）
 *   GET    /api/health                  → { ok, pages, internTasks }
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PORT = Number(process.env.ANNO_PORT || 4400);
const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'server-data');
const FILE = path.join(DIR, 'annos.json');
const INTERN_FILE = path.join(DIR, 'intern-edits.json');
const CONTENT_FILE = path.join(DIR, 'content-overrides.json');
const USAGE_FILE = path.join(DIR, 'usage.json');
const UPLOAD_DIR = path.join(DIR, 'uploads');
const ALLOW = new Set([
  'http://localhost:4321',
  'http://127.0.0.1:4321',
  'http://localhost:4400',
  'http://127.0.0.1:4400'
]);

let store = { pages: {}, updatedAt: 0 };
try {
  if (fs.existsSync(FILE)) store = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.warn('读取存储失败，从空开始：', e.message);
}

let intern = { tasks: {}, updatedAt: 0 };
try {
  if (fs.existsSync(INTERN_FILE)) intern = JSON.parse(fs.readFileSync(INTERN_FILE, 'utf8'));
} catch (e) {
  console.warn('读取实习编辑存储失败，从空开始：', e.message);
}
if (!intern.tasks) intern.tasks = {};

const loadJson = (f, fallback) => {
  try {
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    console.warn(`读取 ${path.basename(f)} 失败，从空开始：`, e.message);
  }
  return fallback;
};
let content = loadJson(CONTENT_FILE, { pages: {}, updatedAt: 0 });
if (!content.pages) content.pages = {};
let usage = loadJson(USAGE_FILE, { modules: {}, updatedAt: 0 });
if (!usage.modules) usage.modules = {};

const debounceWriter = (getStore, file) => {
  let t = null;
  return () => {
    clearTimeout(t);
    t = setTimeout(() => {
      fs.mkdirSync(DIR, { recursive: true });
      const store = getStore();
      store.updatedAt = Date.now();
      fs.writeFileSync(file, JSON.stringify(store, null, 1), 'utf8');
    }, 150);
  };
};
const persistContent = debounceWriter(() => content, CONTENT_FILE);
const persistUsage = debounceWriter(() => usage, USAGE_FILE);

/** 路径 → 模块 key */
const MODULES = [
  ['/notes', 'java'],
  ['/hot200', 'hot200'],
  ['/project', 'project'],
  ['/mysql', 'mysql'],
  ['/mw', 'mw'],
  ['/ai', 'ai'],
  ['/train', 'train'],
  ['/review', 'review'],
  ['/intern', 'intern']
];
const moduleOf = (p) => {
  if (p === '/' || p === '' || p === '/index.html') return 'home';
  const hit = MODULES.find(([prefix]) => p === prefix || p.startsWith(`${prefix}/`));
  return hit ? hit[1] : 'other';
};

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

let timer = null;
const persist = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.mkdirSync(DIR, { recursive: true });
    store.updatedAt = Date.now();
    fs.writeFileSync(FILE, JSON.stringify(store, null, 1), 'utf8');
  }, 120);
};

let internTimer = null;
const persistIntern = () => {
  clearTimeout(internTimer);
  internTimer = setTimeout(() => {
    fs.mkdirSync(DIR, { recursive: true });
    intern.updatedAt = Date.now();
    fs.writeFileSync(INTERN_FILE, JSON.stringify(intern, null, 1), 'utf8');
  }, 120);
};

const send = (res, code, body) => {
  const data = JSON.stringify(body);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': res.req.headers.origin || '*',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(data);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });

const mergePage = (page, incoming) => {
  const cur = store.pages[page] ?? [];
  const byId = new Map(cur.map((a) => [a.id, a]));
  for (const a of incoming) {
    const old = byId.get(a.id);
    if (!old || (a.updatedAt ?? a.created ?? 0) >= (old.updatedAt ?? old.created ?? 0)) byId.set(a.id, a);
  }
  store.pages[page] = [...byId.values()];
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, {});
  }
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/api/anno/all' && req.method === 'GET') {
    return send(res, 200, { pages: store.pages, updatedAt: store.updatedAt, serverTime: Date.now() });
  }

  if (p === '/api/anno' && req.method === 'GET') {
    const page = url.searchParams.get('page') || '';
    return send(res, 200, store.pages[page] ?? []);
  }

  if (p === '/api/anno' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.page || !body.anno?.id) return send(res, 400, { error: 'page/anno 必填' });
    mergePage(body.page, [{ ...body.anno, updatedAt: Date.now() }]);
    persist();
    return send(res, 200, { ok: true, count: store.pages[body.page].length });
  }

  if (p === '/api/anno' && req.method === 'DELETE') {
    const page = url.searchParams.get('page') || '';
    const id = url.searchParams.get('id') || '';
    store.pages[page] = (store.pages[page] ?? []).filter((a) => a.id !== id);
    persist();
    return send(res, 200, { ok: true });
  }

  if (p === '/api/anno/bulk' && req.method === 'POST') {
    const body = await readBody(req);
    const pages = body.pages ?? {};
    for (const [page, items] of Object.entries(pages)) {
      if (Array.isArray(items)) mergePage(page, items);
    }
    persist();
    const total = Object.values(store.pages).reduce((s, v) => s + v.length, 0);
    return send(res, 200, { ok: true, total });
  }

  if (p === '/api/intern/all' && req.method === 'GET') {
    return send(res, 200, { ...intern, serverTime: Date.now() });
  }

  if (p === '/api/intern' && req.method === 'POST') {
    const body = await readBody(req);
    const { task, path: field, value } = body;
    if (!task || !field) return send(res, 400, { error: 'task/path 必填' });
    if (value === undefined) return send(res, 400, { error: 'value 必填' });
    const at = Number(body.updatedAt) || Date.now();
    if (!intern.tasks[task]) intern.tasks[task] = {};
    const prev = intern.tasks[task][field];
    if (prev && (prev.updatedAt ?? 0) > at) {
      return send(res, 200, { ok: true, skipped: 'remote is newer', updatedAt: prev.updatedAt });
    }
    const history = [
      ...(prev?.history ?? []),
      { at, before: prev ? prev.value : null, after: value }
    ].slice(-10);
    intern.tasks[task][field] = { value, updatedAt: at, history };
    persistIntern();
    return send(res, 200, { ok: true, task, path: field, updatedAt: at });
  }

  if (p === '/api/intern/bulk' && req.method === 'POST') {
    const body = await readBody(req);
    let merged = 0;
    for (const [task, fields] of Object.entries(body.tasks ?? {})) {
      for (const [field, entry] of Object.entries(fields ?? {})) {
        if (!entry || entry.value === undefined) continue;
        if (!intern.tasks[task]) intern.tasks[task] = {};
        const prev = intern.tasks[task][field];
        if (prev && (prev.updatedAt ?? 0) > (entry.updatedAt ?? 0)) continue;
        intern.tasks[task][field] = entry;
        merged++;
      }
    }
    persistIntern();
    return send(res, 200, { ok: true, merged });
  }

  // ---------- 通用内容覆盖 ----------
  if (p === '/api/content/all' && req.method === 'GET') {
    return send(res, 200, { pages: content.pages, updatedAt: content.updatedAt, serverTime: Date.now() });
  }

  if (p === '/api/content' && req.method === 'POST') {
    const body = await readBody(req);
    const pagePath = body.page;
    const sel = body.sel;
    if (!pagePath || !sel) return send(res, 400, { error: 'page/sel 必填' });
    const at = Number(body.at) || Date.now();
    if (!content.pages[pagePath]) content.pages[pagePath] = {};
    const prev = content.pages[pagePath][sel];
    content.pages[pagePath][sel] = {
      html: String(body.html ?? ''),
      at,
      origin: body.origin ?? prev?.origin ?? '',
      history: [...(prev?.history ?? []), { at, html: prev?.html ?? '' }].slice(-10)
    };
    persistContent();
    return send(res, 200, { ok: true, sel, at });
  }

  if (p === '/api/content/bulk' && req.method === 'POST') {
    const body = await readBody(req);
    let merged = 0;
    for (const [pagePath, sels] of Object.entries(body.pages ?? {})) {
      if (!content.pages[pagePath]) content.pages[pagePath] = {};
      for (const [sel, entry] of Object.entries(sels ?? {})) {
        const prev = content.pages[pagePath][sel];
        if (prev && (prev.at ?? 0) > (entry.at ?? 0)) continue;
        content.pages[pagePath][sel] = entry;
        merged++;
      }
    }
    persistContent();
    return send(res, 200, { ok: true, merged });
  }

  // ---------- 图片上传 ----------
  if (p === '/api/upload' && req.method === 'POST') {
    const body = await readBody(req);
    const m = /^data:(image\/(?:png|jpeg|jpg|gif|webp|svg\+xml));base64,(.+)$/i.exec(String(body.data || ''));
    if (!m) return send(res, 400, { error: '只接受 base64 图片 dataURL' });
    const extMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg'
    };
    const mime = m[1].toLowerCase();
    const ext = extMap[mime] || '.png';
    const buf = Buffer.from(m[2], 'base64');
    if (!buf.length) return send(res, 400, { error: '空图片' });
    if (buf.length > 12 * 1024 * 1024) return send(res, 413, { error: '图片超过 12MB' });
    const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const file = path.join(UPLOAD_DIR, `${hash}${ext}`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, buf);
    return send(res, 200, { ok: true, url: `/uploads/${hash}${ext}`, bytes: buf.length });
  }

  if (p.startsWith('/uploads/') && req.method === 'GET') {
    const name = path.basename(decodeURIComponent(p));
    const file = path.join(UPLOAD_DIR, name);
    if (!file.startsWith(UPLOAD_DIR) || !fs.existsSync(file)) return send(res, 404, { error: 'not found' });
    const data = fs.readFileSync(file);
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream',
      'content-length': data.length,
      'cache-control': 'public, max-age=31536000, immutable',
      'access-control-allow-origin': '*'
    });
    return res.end(data);
  }

  // ---------- 使用统计 ----------
  if (p === '/api/usage' && req.method === 'POST') {
    const body = await readBody(req);
    const pagePath = String(body.path || '/');
    const mod = moduleOf(pagePath);
    const ms = Math.max(0, Math.min(Number(body.ms) || 0, 6 * 3600 * 1000));
    const visit = Number(body.visit) ? 1 : 0;
    const at = Date.now();
    if (!usage.modules[mod]) usage.modules[mod] = { visits: 0, ms: 0, lastAt: 0, paths: {} };
    const node = usage.modules[mod];
    node.visits += visit;
    node.ms += ms;
    node.lastAt = at;
    if (!node.paths[pagePath]) node.paths[pagePath] = { visits: 0, ms: 0, lastAt: 0 };
    const pn = node.paths[pagePath];
    pn.visits += visit;
    pn.ms += ms;
    pn.lastAt = at;
    persistUsage();
    return send(res, 200, { ok: true, module: mod });
  }

  if (p === '/api/usage/summary' && req.method === 'GET') {
    const mods = Object.values(usage.modules);
    return send(res, 200, {
      modules: usage.modules,
      totalMs: mods.reduce((a, m) => a + (m.ms || 0), 0),
      totalVisits: mods.reduce((a, m) => a + (m.visits || 0), 0),
      updatedAt: usage.updatedAt
    });
  }

  if (p === '/api/health')
    return send(res, 200, {
      ok: true,
      pages: Object.keys(store.pages).length,
      internTasks: Object.keys(intern.tasks).length,
      contentPages: Object.keys(content.pages).length,
      uploads: fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR).length : 0,
      usageModules: Object.keys(usage.modules).length
    });
  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  const total = Object.values(store.pages).reduce((s, v) => s + (v?.length ?? 0), 0);
  console.log(`批注同步服务已启动：http://127.0.0.1:${PORT}`);
  console.log(`存储文件：${FILE}（当前 ${Object.keys(store.pages).length} 页 / ${total} 条）`);
});
