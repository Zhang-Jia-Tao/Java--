#!/usr/bin/env node
/**
 * 生成项目题目的 JSON 骨架 + 模块元数据。
 *
 * 用法：node scripts/scaffold-project.mjs [--force]
 * 依赖：先跑 scripts/parse-project.mjs
 * 产出：src/data/project/*.json（已存在的默认不覆盖）、src/data/project-meta.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const UNITS = path.join(ROOT, '_review/.cache/project-units.json');
const OUT = path.join(ROOT, 'site/src/data/project');
const META = path.join(ROOT, 'site/src/data/project-meta.json');
const FORCE = process.argv.includes('--force');

if (!fs.existsSync(UNITS)) {
  console.error('缺少 project-units.json，先跑 node scripts/parse-project.mjs');
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(UNITS, 'utf8'));

/**
 * 第一批（P0）收录清单：22 题。
 * match = 文档标题里能唯一定位的片段；star = 面试频次。
 */
const CURATED = [
  { id: 'ma-01', module: 'merchant-admin', star: 5, match: '为什么优惠券模板这张表需要考虑分库分表' },
  { id: 'ma-02', module: 'merchant-admin', star: 4, match: '为什么选择店铺编号作为分片键' },
  { id: 'ma-03', module: 'merchant-admin', star: 5, match: '分库分表后如何实现分页查询' },
  { id: 'ma-04', module: 'merchant-admin', star: 5, match: '基于责任链模式创建优惠券模板' },
  { id: 'ma-05', module: 'merchant-admin', star: 4, match: '防重复提交' },
  { id: 'ma-06', module: 'merchant-admin', star: 3, match: '并发增加发行量' },
  { id: 'ma-07', module: 'merchant-admin', star: 3, match: '定时任务不也能做吗' },
  { id: 'ma-08', module: 'merchant-admin', star: 4, match: 'Excel 行数统计异步化' },
  { id: 'en-01', module: 'engine', star: 3, match: '为什么一定要给模板查询加缓存' },
  { id: 'en-02', module: 'engine', star: 5, match: '双重判定锁' },
  { id: 'en-03', module: 'engine', star: 4, match: '双重判定锁有什么隐患' },
  { id: 'en-04', module: 'engine', star: 5, match: '布隆过滤器 \\+ 空值缓存' },
  { id: 'en-05', module: 'engine', star: 3, match: '布隆过滤器如何预估数据规模' },
  { id: 'en-06', module: 'engine', star: 3, match: 'volatile-lfu' },
  { id: 'en-07', module: 'engine', star: 5, match: '扣减数据库库存为什么要用' },
  { id: 'en-08', module: 'engine', star: 3, match: '写后再查一次' },
  { id: 'en-09', module: 'engine', star: 5, match: '用户券状态机' },
  { id: 'en-10', module: 'engine', star: 5, match: '为什么要用位图' },
  { id: 'dist-01', module: 'distribution', star: 4, match: 'Excel 驱动的优惠券分发整体流程' },
  { id: 'dist-02', module: 'distribution', star: 5, match: '从 1 分钟压到 1 秒' },
  { id: 'dist-03', module: 'distribution', star: 5, match: '深分页问题是怎么暴露出来的' },
  { id: 'dist-04', module: 'distribution', star: 5, match: '消费端还要做幂等' }
];

const MODULES = [
  { key: 'merchant-admin', name: '后管服务', en: 'merchant-admin', desc: '券模板的创建、分页、终止、增发，以及 Excel 分发任务的发起', order: 1 },
  { key: 'engine', name: '券引擎', en: 'engine', desc: '模板查询缓存、秒杀领券、锁券核销退款、预约提醒', order: 2 },
  { key: 'distribution', name: '分发服务', en: 'distribution', desc: '百万级 Excel 解析、批量发券、失败记录与深分页', order: 3 },
  { key: 'settlement', name: '结算服务', en: 'settlement', desc: '可用券查询、折扣金额计算、多线程并行', order: 4 },
  { key: 'search', name: '搜索服务', en: 'search', desc: 'Canal + RocketMQ + ES 数据同步', order: 5 },
  { key: 'framework', name: '公共组件', en: 'framework', desc: '幂等注解、防重注解、统一响应、缓存配置', order: 6 }
];

const norm = (s) => s.replace(/\s+/g, '').replace(/["“”]/g, '');
const units = report.units;

const used = new Set();
const rows = [];
const missing = [];

for (const c of CURATED) {
  const needle = norm(c.match.replace(/\\/g, ''));
  const hit = units.find(
    (u) => !used.has(u.id) && u.module === c.module && norm(u.title).includes(needle)
  );
  if (!hit) {
    missing.push(c.id + ' ← ' + c.match);
    continue;
  }
  used.add(hit.id);
  rows.push({ curated: c, unit: hit });
}

fs.mkdirSync(OUT, { recursive: true });

for (const { curated, unit } of rows) {
  const file = path.join(OUT, `${curated.id}.json`);
  if (fs.existsSync(file) && !FORCE) continue;
  const skeleton = {
    id: curated.id,
    module: curated.module,
    title: unit.title.replace(/^⭐+/, '').trim(),
    question: '',
    star: curated.star,
    tags: [],
    status: 'pending',
    oneLine: '',
    speak: { s60: '', s180: '', s600: '' },
    points: [],
    codeAnchors: [],
    flow: [],
    diagram: null,
    metrics: [],
    pitfalls: [],
    followUps: [],
    variants: [],
    review: { A: 0, B: 0, C: 0, D: 0, E: 0, total: 0, verdict: 'pending', hardErrors: [], deductions: [], bonus: [], srcCheck: { checked: 0, ok: 0, mismatch: [] } },
    drill: { keywords: [], blanks: [] },
    source: {
      raw: `_review/项目经历.md#L${unit.line}-L${unit.endLine}`,
      startLine: unit.line,
      endLine: unit.endLine,
      docTitle: unit.rawTitle
    }
  };
  fs.writeFileSync(file, JSON.stringify(skeleton, null, 2) + '\n', 'utf8');
}

const counts = MODULES.map((m) => ({ ...m, count: rows.filter((r) => r.curated.module === m.key).length }));
fs.writeFileSync(
  META,
  JSON.stringify(
    {
      title: '券享购 OneCoupon · 项目经历',
      modules: counts,
      total: rows.length,
      scannedAt: report.scannedAt,
      sourceDoc: report.source
    },
    null,
    2
  ) + '\n',
  'utf8'
);

console.log(`生成 ${rows.length} 个骨架 → site/src/data/project/`);
console.log(`模块元数据 → site/src/data/project-meta.json`);
for (const m of counts) console.log(`  ${m.key.padEnd(15)} ${m.count} 题`);
if (missing.length) {
  console.log('\n未定位到（需人工确认匹配片段）：');
  for (const m of missing) console.log('  ✗ ' + m);
}
