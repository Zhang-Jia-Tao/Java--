/**
 * 构建后生成 sitemap.xml + robots.txt
 *
 * 做法是直接扫 dist：页面是 Astro 静态生成的，扫目录最不容易漏（1090 页里包含
 * /project 镜像页，镜像页在 sitemap 里会被 canonical 收掉，这里直接跳过，避免重复收录）。
 *
 * 用法：node scripts/gen-seo.mjs [--site https://example.com]
 * 环境变量：SITE_URL（优先）
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

const argSite = (() => {
  const i = process.argv.indexOf('--site');
  return i > -1 ? process.argv[i + 1] : '';
})();
const SITE = (process.env.SITE_URL || argSite || 'http://localhost:4321').replace(/\/+$/, '');

if (!fs.existsSync(DIST)) {
  console.error('✗ 没有 dist，先跑 astro build');
  process.exit(1);
}

/** dist 下的 index.html → 路由 */
const routes = [];
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === '_astro' || ent.name === 'vendor') continue;
      walk(p);
    } else if (ent.name === 'index.html') {
      const rel = path.relative(DIST, dir).replace(/\\/g, '/');
      routes.push(rel ? `/${rel}` : '/');
    }
  }
};
walk(DIST);

/** 镜像页（/project 下与模块专区重复的）不进 sitemap */
const MIRROR = /^\/project\/(mysql|redis|rocketmq|es|kafka|foundation|ragent|eval|llm|aiproj|javax|handwrite|distributed|scenario|behavior|resume|sql|quiz)(\/|$)/;
const DOC_MIRROR = /^\/project\/read\/[^/]+$/;

const keep = routes
  .filter((r) => r !== '/errors')
  .filter((r) => !MIRROR.test(r))
  .filter((r) => !DOC_MIRROR.test(r))
  .sort();

const today = new Date().toISOString().slice(0, 10);
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...keep.map((r) => {
    const pri = r === '/' ? '1.0' : r.split('/').filter(Boolean).length <= 1 ? '0.8' : '0.6';
    return `  <url><loc>${SITE}${r === '/' ? '/' : r + '/'}</loc><lastmod>${today}</lastmod><priority>${pri}</priority></url>`;
  }),
  '</urlset>',
  ''
].join('\n');

fs.writeFileSync(path.join(DIST, 'sitemap.xml'), xml, 'utf8');

fs.writeFileSync(
  path.join(DIST, 'robots.txt'),
  ['User-agent: *', 'Allow: /', `Sitemap: ${SITE}/sitemap.xml`, ''].join('\n'),
  'utf8'
);

console.log(`✓ sitemap.xml：${keep.length} 条（跳过镜像页 ${routes.length - keep.length - 1} 条）· 站点 ${SITE}`);
