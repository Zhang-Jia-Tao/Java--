/**
 * 笔记站本地数据（server-data）的备份/恢复。
 *
 * 为什么需要：批注、就地编辑、实习期编辑、使用统计、复习记录全在 site/server-data 下，
 * 而这个目录被 gitignore（属于本机数据，不该进仓库）。换机器 / 重装 / 清缓存前，
 * 必须能把它们整体打包带走，否则几百条批注只能手工拷。
 *
 * bundle 是单个 JSON（中间夹 uploads 的 base64），便于丢网盘、发给自己。
 */
import fs from 'node:fs';
import path from 'node:path';

export const APP_ID = 'java-ultimate-notes';
export const BUNDLE_KIND = 'server-data-backup';
export const BUNDLE_VERSION = 1;

const JSON_FILES = [
  ['annos', 'annos.json'],
  ['content', 'content-overrides.json'],
  ['intern', 'intern-edits.json'],
  ['usage', 'usage.json'],
  ['review', 'review-log.json']
];

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

export const dataDir = (root = path.resolve(import.meta.dirname, '..')) =>
  process.env.NOTES_DATA_DIR || path.join(root, 'server-data');

const readJson = (file, fallback) => {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (file, value, indent = 1) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, indent), 'utf8');
};

/** 把 server-data 目录读成一个 bundle */
export const readBundle = (dir) => {
  const files = {};
  for (const [key, name] of JSON_FILES) files[key] = readJson(path.join(dir, name), null);

  const uploads = {};
  const upDir = path.join(dir, 'uploads');
  if (fs.existsSync(upDir)) {
    for (const name of fs.readdirSync(upDir)) {
      const f = path.join(upDir, name);
      if (!fs.statSync(f).isFile()) continue;
      const ext = path.extname(name).toLowerCase();
      uploads[name] = {
        mime: MIME_BY_EXT[ext] || 'application/octet-stream',
        base64: fs.readFileSync(f).toString('base64')
      };
    }
  }

  const pages = Object.keys(files.annos?.pages ?? {}).length;
  const annos = Object.values(files.annos?.pages ?? {}).reduce((s, list) => s + (Array.isArray(list) ? list.length : 0), 0);

  return {
    app: APP_ID,
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    source: { dataDir: dir },
    stats: { pages, annos, uploads: Object.keys(uploads).length, contentPages: Object.keys(files.content?.pages ?? {}).length },
    files,
    uploads
  };
};

/** 写出 bundle：先备份现有目录到 del/old，再按 mode 写入 */
export const writeBundle = (dir, bundle, { mode = 'merge' } = {}) => {
  if (bundle?.app !== APP_ID || bundle?.kind !== BUNDLE_KIND) {
    throw new Error('不是本工具的备份文件（app/kind 不匹配）');
  }
  if (!Number.isInteger(bundle.version) || bundle.version > BUNDLE_VERSION) {
    throw new Error(`备份版本过新：${bundle.version}（当前支持 ${BUNDLE_VERSION}）`);
  }

  const restored = { mode, annos: 0, content: 0, intern: 0, usage: 0, review: 0, uploads: 0 };
  fs.mkdirSync(dir, { recursive: true });

  for (const [key, name] of JSON_FILES) {
    const inc = bundle.files?.[key];
    if (!inc) continue;
    const file = path.join(dir, name);
    const cur = readJson(file, null);

    let next;
    if (mode === 'replace' || !cur) next = inc;
    else if (key === 'annos') next = mergeAnnos(cur, inc, restored);
    else if (key === 'content') next = mergeContent(cur, inc, restored);
    else if (key === 'intern') next = mergeTasks(cur, inc, restored);
    else next = mergeCounters(cur, inc, restored); // usage / review

    if (next === inc && cur) next = { ...inc, updatedAt: Date.now() };
    writeJson(file, next);
    if (typeof inc === 'object') restored[key] = restored[key] || 1;
  }

  const upDir = path.join(dir, 'uploads');
  fs.mkdirSync(upDir, { recursive: true });
  for (const [name, entry] of Object.entries(bundle.uploads ?? {})) {
    if (!/^[A-Za-z0-9._-]{1,120}$/.test(name)) continue; // 防路径穿越
    const target = path.join(upDir, name);
    const buf = Buffer.from(entry.base64 ?? '', 'base64');
    if (!buf.length) continue;
    if (mode === 'merge' && fs.existsSync(target) && fs.statSync(target).size === buf.length) continue;
    fs.writeFileSync(target, buf);
    restored.uploads++;
  }

  return restored;
};

const mergeAnnos = (cur, inc, restored) => {
  const pages = { ...(cur.pages ?? {}) };
  for (const [page, list] of Object.entries(inc.pages ?? {})) {
    const base = Array.isArray(pages[page]) ? pages[page] : [];
    const map = new Map(base.map((a) => [a.id, a]));
    for (const a of Array.isArray(list) ? list : []) {
      const old = map.get(a.id);
      if (!old || (a.at ?? 0) >= (old.at ?? 0)) map.set(a.id, a);
    }
    pages[page] = [...map.values()];
    restored.annos += pages[page].length;
  }
  return { ...cur, pages, updatedAt: Date.now() };
};

const mergeContent = (cur, inc, restored) => {
  const pages = { ...(cur.pages ?? {}) };
  let n = 0;
  for (const [page, sels] of Object.entries(inc.pages ?? {})) {
    const base = { ...(pages[page] ?? {}) };
    for (const [sel, entry] of Object.entries(sels ?? {})) {
      const old = base[sel];
      if (!old || (entry?.at ?? 0) >= (old?.at ?? 0)) base[sel] = entry;
      n++;
    }
    pages[page] = base;
  }
  restored.content = n;
  return { ...cur, pages, updatedAt: Date.now() };
};

const mergeTasks = (cur, inc, restored) => {
  const tasks = { ...(cur.tasks ?? {}) };
  let n = 0;
  for (const [id, task] of Object.entries(inc.tasks ?? {})) {
    const old = tasks[id];
    if (!old || (task?.at ?? 0) >= (old?.at ?? 0)) tasks[id] = task;
    n++;
  }
  restored.intern = n;
  return { ...cur, tasks, updatedAt: Date.now() };
};

/** 计数类（usage 模块计数 / review 记录）：取较大值，避免合并两次直接翻倍 */
const mergeCounters = (cur, inc, restored) => {
  const out = { ...cur };
  let n = 0;
  for (const field of ['modules', 'items']) {
    if (!inc[field]) continue;
    out[field] = { ...(cur[field] ?? {}) };
    for (const [k, v] of Object.entries(inc[field])) {
      if (typeof v === 'number') out[field][k] = Math.max(out[field][k] ?? 0, v);
      else out[field][k] = { ...(out[field][k] ?? {}), ...v };
      n++;
    }
  }
  out.updatedAt = Date.now();
  restored.usage += n;
  return out;
};

export const defaultExportPath = (root = path.resolve(import.meta.dirname, '..')) => {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return path.join(root, 'backups', `notes-backup-${stamp}.json`);
};
