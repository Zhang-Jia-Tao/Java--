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

const PORT = Number(process.env.ANNO_PORT || 4400);
const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'server-data');
const FILE = path.join(DIR, 'annos.json');
const INTERN_FILE = path.join(DIR, 'intern-edits.json');
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

  if (p === '/api/health')
    return send(res, 200, {
      ok: true,
      pages: Object.keys(store.pages).length,
      internTasks: Object.keys(intern.tasks).length
    });
  send(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  const total = Object.values(store.pages).reduce((s, v) => s + (v?.length ?? 0), 0);
  console.log(`批注同步服务已启动：http://127.0.0.1:${PORT}`);
  console.log(`存储文件：${FILE}（当前 ${Object.keys(store.pages).length} 页 / ${total} 条）`);
});
