/**
 * mindmap-data.ts — 七个模块的思维导图数据组装
 *
 * 每个模块都吃同一份数据：根（模块名）→ 组（章节 / 子模块 / 篇）→ 条目（题）。
 * 组与条目全部来自既有数据文件，不手工补写：
 *  - java   ← src/data/chapters.json + src/data/questions/*.json
 *  - hot200 ← src/data/hot200/lc*.json（按 category 分组）
 *  - 其余六个 ← src/data/project/*.json（按 module 分组，MySQL 再按 tags[0] 分篇）
 *
 * 链接一律用 canonicalQuestionPath，和站内其余入口（章节页 / 闪卡 / 复习队列）保持一致。
 */
import { DIFF_LABEL, loadHot200ByCategory } from './hot200';
import {
  aiModules,
  dbModules,
  moduleQuestions,
  mwModules,
  projectModules,
  trainModules,
  type ProjectQuestion
} from './project';
import { canonicalQuestionPath } from './canonical';
import { loadQuestions } from './questions';
import chaptersJson from '../data/chapters.json';
import type { MMNode } from './mindmap';

export type TopicKey = 'java' | 'hot200' | 'project' | 'mw' | 'mysql' | 'ai' | 'train';

export interface TopicMeta {
  key: TopicKey;
  /** 页面标题 */
  title: string;
  /** hub 卡片上的短名 */
  short: string;
  /** 一句话定位 */
  desc: string;
  /** 组名统称：章节 / 分类 / 子模块 / 篇 */
  unit: string;
  /** 模块首页 */
  href: string;
  tone: 'zhu' | 'qing';
}

export interface TopicData extends TopicMeta {
  root: MMNode;
  count: number;
  groups: number;
  /** 有评分的题才算均分；hot200 没有评分给 null */
  avg: number | null;
  /** 状态是 pending / skeleton 的条目数 */
  pending: number;
  /** 有评分且 <75 的条目数，用来标弱项 */
  weak: number;
}

export const TOPIC_ORDER: TopicKey[] = ['java', 'hot200', 'project', 'mw', 'mysql', 'ai', 'train'];

const META: Record<TopicKey, TopicMeta> = {
  java: {
    key: 'java',
    title: 'Java 基础',
    short: 'Java 基础',
    desc: '8 个章组 58 题：集合 / 并发 / JVM / Spring / 语法 / 网络 / 操作系统',
    unit: '章',
    href: '/notes',
    tone: 'zhu'
  },
  hot200: {
    key: 'hot200',
    title: 'Hot200 手撕题',
    short: 'Hot200',
    desc: '12 个题型分类，按 LC 题号顺序排，全部已写',
    unit: '类',
    href: '/hot200',
    tone: 'qing'
  },
  project: {
    key: 'project',
    title: '项目经历',
    short: '项目',
    desc: '券享购 OneCoupon 的 7 个子模块：后管 / 引擎 / 分发 / 结算 / 组件 / 搜索 / 拷打',
    unit: '模块',
    href: '/project',
    tone: 'zhu'
  },
  mw: {
    key: 'mw',
    title: '中间件',
    short: '中间件',
    desc: 'Redis / RocketMQ / ES / Kafka 四套中间件 48 题',
    unit: '模块',
    href: '/mw',
    tone: 'qing'
  },
  mysql: {
    key: 'mysql',
    title: 'MySQL',
    short: 'MySQL',
    desc: '46 题按原文篇目分：基础 / 索引 / 事务 / 锁 / 日志 / 调优',
    unit: '篇',
    href: '/mysql',
    tone: 'qing'
  },
  ai: {
    key: 'ai',
    title: 'Ragent AI',
    short: 'AI',
    desc: '底座 / 项目题 / 评测 / LLM 基础 / AI 工程化 68 题',
    unit: '模块',
    href: '/ai',
    tone: 'qing'
  },
  train: {
    key: 'train',
    title: '训练场',
    short: '训练',
    desc: '进阶 / 手写 / 分布式 / 排查 / 行为面 / 简历 / SQL / 笔试 103 题',
    unit: '模块',
    href: '/train',
    tone: 'zhu'
  }
};

const clampText = (s: string, n: number) => {
  const t = String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const avgOf = (list: ProjectQuestion[]): number | null => {
  const scored = list.filter((q) => q.review?.total > 0);
  if (!scored.length) return null;
  return Math.round((scored.reduce((a, q) => a + q.review.total, 0) / scored.length) * 10) / 10;
};

const weakOf = (list: { score?: number | null }[]) => list.filter((x) => typeof x.score === 'number' && x.score > 0 && x.score < 75).length;

/** 章节排序用的固定顺序（与 /mysql 页面一致，未命中的放最后） */
const MYSQL_ORDER = ['基础篇', '索引篇', '事务篇', '锁', '日志', '性能调优', 'MySQL'];

/* ── java ─────────────────────────────────────────────── */
function buildJava(): TopicData {
  const questions = loadQuestions();
  const chapters = chaptersJson as any[];
  const groups = chapters
    .map((c) => ({
      c,
      list: questions.filter((q: any) => q.chapter === c.key)
    }))
    .filter((g) => g.list.length > 0);

  const nameCount = new Map<string, number>();
  const shortOf = (name: string) => name.replace(/^第\d+章\s*/, '');
  for (const g of groups) nameCount.set(shortOf(g.c.name), (nameCount.get(shortOf(g.c.name)) ?? 0) + 1);

  const leaves = groups.flatMap((g) =>
    g.list.map((q: any) => ({
      id: q.id,
      label: q.title,
      score: q.score?.total,
      href: `/notes/${q.chapter}/${q.id}`,
      summary: clampText(q.summary ?? '', 150)
    }))
  );

  const root: MMNode = {
    id: 'java',
    label: 'Java 基础',
    sub: `${questions.length} 题 · ${groups.length} 组`,
    href: '/notes',
    summary: `${questions.length} 道 Java 题的总入口`,
    children: groups.map((g) => {
      const base = shortOf(g.c.name);
      const dup = (nameCount.get(base) ?? 0) > 1;
      const sub = String(g.c.sub ?? '');
      const label = dup && sub ? `${base}·${sub.replace(/\s*Q\d+-\d+$/, '')}` : base;
      return {
        id: g.c.key,
        label,
        sub: `${g.list.length} 题 · 均分 ${g.c.avg}`,
        href: `/notes/${g.c.key}`,
        summary: `${g.c.name}${sub ? ' · ' + sub : ''}：${g.list.length} 题`,
        children: g.list.map((q: any) => ({
          id: q.id,
          label: q.title,
          score: q.score?.total,
          href: `/notes/${q.chapter}/${q.id}`,
          summary: clampText(q.summary ?? '', 150)
        }))
      };
    })
  };

  const avg = Math.round((questions.reduce((a: number, q: any) => a + q.score.total, 0) / questions.length) * 10) / 10;
  return {
    ...META.java,
    root,
    count: questions.length,
    groups: groups.length,
    avg,
    pending: 0,
    weak: weakOf(leaves)
  };
}

/* ── hot200 ───────────────────────────────────────────── */
function buildHot200(): TopicData {
  const cats = loadHot200ByCategory();
  const all = cats.flatMap((c) => c.items);
  const leaves = all.map((q) => ({
    id: q.slug,
    label: q.title,
    href: `/hot200/${q.slug}`,
    summary: clampText(q.explain?.oneLiner ?? q.approach ?? '', 150),
    meta: q.lc ? `LC${q.lc}` : DIFF_LABEL[q.difficulty ?? ''] ?? '',
    badge: q.status === 'written' ? '' : '待写'
  }));

  const root: MMNode = {
    id: 'hot200',
    label: 'Hot200',
    sub: `${all.length} 题 · ${cats.length} 类`,
    href: '/hot200',
    summary: `${all.length} 道手撕题，按题型分类`,
    children: cats.map((c) => ({
      id: `cat-${c.category}`,
      label: c.category,
      sub: `${c.items.length} 题`,
      href: '/hot200',
      summary: `${c.category}：${c.items.length} 题`,
      children: c.items.map((q) => ({
        id: q.slug,
        label: q.title,
        href: `/hot200/${q.slug}`,
        summary: clampText(q.explain?.oneLiner ?? q.approach ?? '', 150),
        meta: q.lc ? `LC${q.lc}` : '',
        badge: q.status === 'written' ? '' : '待写'
      }))
    }))
  };

  return {
    ...META.hot200,
    root,
    count: all.length,
    groups: cats.length,
    avg: null,
    pending: all.filter((q) => q.status !== 'written').length,
    weak: 0
  };
}

/* ── 六个 project 系模块（项目 / 中间件 / MySQL / AI / 训练场）───────── */
function buildFromModules(
  meta: TopicMeta,
  modules: { key: string; name: string; en: string; count: number }[],
  listOf: (key: string) => ProjectQuestion[],
  rootId: string,
  rootLabel: string,
  branchHref: (m: { key: string; en: string }) => string,
  groupBy?: (q: ProjectQuestion) => string,
  groupOrder?: string[]
): TopicData {
  interface Bucket {
    label: string;
    href: string;
    summary: string;
    questions: ProjectQuestion[];
  }
  const buckets: Bucket[] = [];

  for (const m of modules) {
    const list = listOf(m.key);
    if (!list.length) continue;
    if (!groupBy) {
      buckets.push({ label: m.name, href: branchHref(m), summary: `${m.name}：${list.length} 题`, questions: list });
      continue;
    }
    const map = new Map<string, ProjectQuestion[]>();
    for (const q of list) {
      const k = groupBy(q);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(q);
    }
    const order = groupOrder ?? [];
    for (const [label, qs] of [...map.entries()].sort((a, b) => {
      const ia = order.indexOf(a[0]);
      const ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b[1].length - a[1].length;
    })) {
      buckets.push({ label, href: branchHref(m), summary: `${m.name} · ${label}：${qs.length} 题`, questions: qs });
    }
  }

  const all = buckets.flatMap((b) => b.questions);
  const leaves = all.map((q) => ({
    id: q.id,
    label: q.title,
    score: q.review?.total ?? 0,
    href: canonicalQuestionPath(q.module, q.id),
    summary: clampText(q.oneLine ?? '', 150),
    meta: q.star ? `★${q.star}` : '',
    badge: q.status === 'pending' ? '待写' : ''
  }));

  const root: MMNode = {
    id: rootId,
    label: rootLabel,
    sub: `${all.length} 题 · ${buckets.length} 组`,
    href: meta.href,
    summary: meta.desc,
    children: buckets.map((b, i) => ({
      id: `${rootId}-g${i}`,
      label: b.label,
      sub: `${b.questions.length} 题`,
      href: b.href,
      summary: b.summary,
      children: b.questions.map((q) => ({
        id: q.id,
        label: q.title,
        score: q.review?.total ?? 0,
        href: canonicalQuestionPath(q.module, q.id),
        summary: clampText(q.oneLine ?? '', 150),
        meta: q.star ? `★${q.star}` : '',
        badge: q.status === 'pending' ? '待写' : ''
      }))
    }))
  };

  return {
    ...meta,
    root,
    count: all.length,
    groups: buckets.length,
    avg: avgOf(all),
    pending: all.filter((q) => q.status === 'pending').length,
    weak: weakOf(leaves)
  };
}

const mbHref = (m: { en: string }) => `/project/${m.en}`;

function buildProject(): TopicData {
  const mods = projectModules.filter((m) => !mwModules.some((x) => x.key === m.key) && !dbModules.some((x) => x.key === m.key) && !aiModules.some((x) => x.key === m.key) && !trainModules.some((x) => x.key === m.key));
  return buildFromModules(META.project, mods as any, (k) => moduleQuestions(k), 'project', '项目经历', mbHref);
}

function buildMw(): TopicData {
  return buildFromModules(META.mw, mwModules as any, (k) => moduleQuestions(k), 'mw', '中间件', (m) => `/mw/${m.en}`);
}

function buildAi(): TopicData {
  return buildFromModules(META.ai, aiModules as any, (k) => moduleQuestions(k), 'ai', 'Ragent AI', (m) => `/ai/${m.en}`);
}

function buildTrain(): TopicData {
  return buildFromModules(META.train, trainModules as any, (k) => moduleQuestions(k), 'train', '训练场', (m) => `/train/${m.en}`);
}

function buildMysql(): TopicData {
  const items = moduleQuestions('mysql');
  const buckets = new Map<string, ProjectQuestion[]>();
  for (const q of items) {
    const k = (q.tags?.[0] as string) || 'MySQL';
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(q);
  }
  const ordered = [...buckets.entries()].sort((a, b) => {
    const ia = MYSQL_ORDER.indexOf(a[0]);
    const ib = MYSQL_ORDER.indexOf(b[0]);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const all = items;
  const root: MMNode = {
    id: 'mysql',
    label: 'MySQL',
    sub: `${all.length} 题 · ${ordered.length} 篇`,
    href: '/mysql',
    summary: META.mysql.desc,
    children: ordered.map(([label, qs]) => ({
      id: `mysql-${label}`,
      label,
      sub: `${qs.length} 题`,
      href: '/mysql',
      summary: `${label}：${qs.length} 题`,
      children: qs.map((q) => ({
        id: q.id,
        label: q.title,
        score: q.review?.total ?? 0,
        href: canonicalQuestionPath(q.module, q.id),
        summary: clampText(q.oneLine ?? '', 150),
        meta: q.star ? `★${q.star}` : '',
        badge: q.status === 'pending' ? '待写' : ''
      }))
    }))
  };
  return {
    ...META.mysql,
    root,
    count: all.length,
    groups: ordered.length,
    avg: avgOf(all),
    pending: all.filter((q) => q.status === 'pending').length,
    weak: weakOf(all.map((q) => ({ score: q.review?.total ?? 0 })))
  };
}

const BUILDERS: Record<TopicKey, () => TopicData> = {
  java: buildJava,
  hot200: buildHot200,
  project: buildProject,
  mw: buildMw,
  mysql: buildMysql,
  ai: buildAi,
  train: buildTrain
};

const cache = new Map<TopicKey, TopicData>();

export function topicByKey(key: string): TopicData {
  const k = key as TopicKey;
  if (!BUILDERS[k]) throw new Error(`未知模块：${key}`);
  if (!cache.has(k)) cache.set(k, BUILDERS[k]());
  return cache.get(k)!;
}

export function allTopics(): TopicData[] {
  return TOPIC_ORDER.map((k) => topicByKey(k));
}
