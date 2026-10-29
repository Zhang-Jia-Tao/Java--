/**
 * 合并 AI 新增题库分片（src/data/newq/part-*.json，数组）到站点题库。
 * 每题补齐完整 ProjectQuestion 结构：review 全 0、status=draft、aiAdded=true。
 * 同时把新模块登记进 src/data/project-meta.json（area=train / project）。
 *
 * 用法：node scripts/merge-newq.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NEWQ = path.join(ROOT, 'src', 'data', 'newq');
const QDIR = path.join(ROOT, 'src', 'data', 'project');
const META = path.join(ROOT, 'src', 'data', 'project-meta.json');

const MODULES = {
  javax: { key: 'javax', name: 'Java 进阶', en: 'javax', desc: 'IO/NIO、类加载、Java 8+、事务与 AOP、SpringCloud、MyBatis', order: 31, area: 'train' },
  handwrite: { key: 'handwrite', name: '手写题', en: 'handwrite', desc: '单例 / 线程池 / 生产者消费者 / LRU / 限流 / 分布式锁', order: 32, area: 'train' },
  distributed: { key: 'distributed', name: '分布式与系统设计', en: 'distributed', desc: 'CAP / 一致性哈希 / 分布式 ID 与锁 / 事务 / 分库分表', order: 33, area: 'train' },
  scenario: { key: 'scenario', name: '线上排查场景', en: 'scenario', desc: 'RT 抖动 / CPU 100% / OOM / 死锁 / 缓存三连 / MQ 堆积', order: 34, area: 'train' },
  behavior: { key: 'behavior', name: '行为面', en: 'behavior', desc: '自我介绍 / STAR / 冲突与失败 / 反问 / 稳定性', order: 35, area: 'train' },
  resume: { key: 'resume', name: '简历与投递', en: 'resume', desc: '项目三行版 / 投递运营 / 面试复盘表', order: 36, area: 'train' },
  sql: { key: 'sql', name: 'SQL 手写', en: 'sql', desc: '多表 join / TopN / 窗口函数 / 连续登录 / 行转列', order: 37, area: 'train' },
  quiz: { key: 'quiz', name: '笔试客观题', en: 'quiz', desc: 'Integer 缓存 / finally / 泛型擦除 / JVM 参数判读', order: 38, area: 'train' },
  defense: { key: 'defense', name: '项目拷打面', en: 'defense', desc: '90 秒自述 / 选型对比 / 数据估算 / 重做方案', order: 11, area: 'project' },
  search: { key: 'search', name: '搜索模块', en: 'search', desc: '索引 / 召回排序 / 一致性 / 降级 / 效果评估', order: 13, area: 'project' },
  rocketmq: { key: 'rocketmq', name: 'RocketMQ', en: 'rocketmq', desc: '架构 / 存储 / 顺序 / 事务 / 重试 / 高可用', order: 22, area: 'mw' },
  es: { key: 'es', name: 'Elasticsearch', en: 'es', desc: '倒排 / 分词 / 聚合 / 深分页 / 写入与查询', order: 24, area: 'mw' },
  kafka: { key: 'kafka', name: 'Kafka', en: 'kafka', desc: 'ISR / ack / 分区顺序 / 幂等与事务', order: 25, area: 'mw' },
  llm: { key: 'llm', name: 'LLM 基础', en: 'llm', desc: 'Transformer / KV Cache / LoRA / 量化 / 推理加速', order: 26, area: 'project' },
  aiproj: { key: 'aiproj', name: 'AI 工程化', en: 'aiproj', desc: 'Agent 进阶 / RAG 工程 / 安全 / 成本 / 部署', order: 27, area: 'project' }
};

const files = fs.existsSync(NEWQ) ? fs.readdirSync(NEWQ).filter((f) => /^part-.+\.json$/.test(f)) : [];
if (!files.length) {
  console.log('没有 part-*.json，退出');
  process.exit(0);
}

const sanitize = (text) => {
  let out = "";
  let inStr = false;
  let esc = false;
  for (const ch of text) {
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { out += ch; inStr = false; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") continue;
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out;
};

const all = [];
for (const f of files) {
  const raw = fs.readFileSync(path.join(NEWQ, f), 'utf8').replace(/^\uFEFF/, '').trim();
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    const fixed = sanitize(raw).replace(/\/\/[^\n]*/g, '').replace(/,\s*([}\]])/g, '$1');
    arr = JSON.parse(fixed);
    console.log(`⚠ ${f} 有换行/逗号瑕疵，已修复后解析`);
  }
  if (!Array.isArray(arr)) {
    console.log(`⚠ ${f} 不是数组，跳过`);
    continue;
  }
  console.log(`${f}: ${arr.length} 题`);
  all.push(...arr);
}

const fill = (x) => {
  const id = String(x.id || '').trim();
  if (!id || !x.module || !MODULES[x.module]) throw new Error(`非法条目：${JSON.stringify(x).slice(0, 80)}`);
  const speak = (typeof x.speak === 'object' && x.speak) || {};
  return {
    id,
    module: x.module,
    title: String(x.title || '').trim(),
    star: Number(x.star) || 3,
    question: String(x.question || x.title || '').trim(),
    tags: Array.isArray(x.tags) && x.tags.length ? x.tags : [MODULES[x.module].name],
    status: 'draft',
    aiAdded: true,
    oneLine: String(x.oneLine || '').trim(),
    speak: {
      s60: String(x.s60 || speak.s60 || '').trim(),
      s180: String(x.s180 || speak.s180 || '').trim(),
      s600: String(x.s600 || speak.s600 || '').trim()
    },
    points: (Array.isArray(x.points) ? x.points : []).map((p) =>
      typeof p === 'string' ? { point: p, state: 'done' } : { point: String(p.point || ''), state: p.state || 'done', ...(p.note ? { note: p.note } : {}) }
    ),
    codeAnchors: [],
    flow: [],
    diagram: null,
    metrics: [],
    pitfalls: (x.pitfalls || []).map(String),
    followUps: (x.followUps || []).map((f) => ({ q: String(f.q || ''), a: String(f.a || ''), star: 4 })),
    variants: [],
    review: {
      A: 0, B: 0, C: 0, D: 0, E: 0, total: 0, verdict: 'draft',
      hardErrors: [], deductions: [], bonus: [], srcCheck: { checked: 0, ok: 0, mismatch: [] }
    },
    provenance: { doc: ['AI 新增（无原文，依据公开技术资料整理）'], code: [], supplement: [String(x.provenanceNote || 'AI 新增')] },
    drill: {
      keywords: (x.drill || []).map(String),
      blanks: []
    },
    source: { raw: '', startLine: 0, endLine: 0, docTitle: '' }
  };
};

let written = 0;
for (const x of all) {
  const q = fill(x);
  fs.writeFileSync(path.join(QDIR, `${q.id}.json`), JSON.stringify(q, null, 2) + '\n', 'utf8');
  written++;
}

// meta 更新
const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const counts = {};
for (const f of fs.readdirSync(QDIR).filter((f) => f.endsWith('.json'))) {
  const q = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
  counts[q.module] = (counts[q.module] ?? 0) + 1;
}
for (const m of Object.values(MODULES)) {
  const existing = meta.modules.find((x) => x.key === m.key);
  if (existing) Object.assign(existing, m, { count: counts[m.key] ?? 0 });
  else meta.modules.push({ ...m, count: counts[m.key] ?? 0 });
}
meta.modules.sort((a, b) => a.order - b.order);
meta.total = fs.readdirSync(QDIR).filter((f) => f.endsWith('.json')).length;
fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n', 'utf8');

console.log(`写入 ${written} 题；meta.total=${meta.total}`);
for (const m of Object.values(MODULES)) console.log(`  ${m.key}: ${counts[m.key] ?? 0} 题`);
