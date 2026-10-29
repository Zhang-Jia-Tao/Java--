import metaJson from '../data/project-meta.json';

export interface ProjectPoint {
  point: string;
  state: 'done' | 'partial' | 'missing';
  note?: string;
}

export interface ProjectAnchor {
  file: string;
  symbol: string;
  line?: number;
  snippet?: string;
  why?: string;
}

export interface ProjectMetric {
  k: string;
  v: string;
  source?: string;
}

export interface ProjectFollowUp {
  q: string;
  a: string;
  star?: number;
}

export interface ProjectReview {
  A: number;
  B: number;
  C: number;
  D: number;
  E: number;
  total: number;
  verdict: string;
  hardErrors: { level: 1 | 2 | 3 | 4; wrong: string; right: string; note?: string }[];
  deductions: string[];
  bonus: string[];
  srcCheck: { checked: number; ok: number; mismatch: string[] };
}

/** AI 题专属：可复述的流水线步骤 */
export interface PipelineStep {
  no: number;
  title: string;
  input: string;
  output: string;
  code: string;
  fail: string;
  shortCircuit?: boolean;
}

/** AI 题专属：Prompt 解剖块 */
export interface PromptBlock {
  role: 'system' | 'user' | 'assistant';
  text: string;
  tags: ('角色' | '任务' | '约束' | '输入' | '分隔符')[];
}

/** AI 题专属：满分回答（与 s60/s180/s600 组成三档 + 满分版） */
export interface FullAnswer {
  text: string;
  why: string;
  diff: string;
}

export interface ProjectQuestion {
  id: string;
  module: string;
  title: string;
  question: string;
  star: number;
  tags: string[];
  status: 'pending' | 'draft' | 'reviewed' | 'done';
  oneLine: string;
  speak: { s60: string; s180: string; s600: string };
  points: ProjectPoint[];
  codeAnchors: ProjectAnchor[];
  flow: string[];
  diagram: { src: string; caption: string } | null;
  metrics: ProjectMetric[];
  pitfalls: string[];
  followUps: ProjectFollowUp[];
  variants: string[];
  review: ProjectReview;
  drill: { keywords: string[]; blanks: { line: string; answer: string; prompt?: string }[] };
  provenance?: { doc?: string[]; code?: string[]; supplement?: string[] };
  source: { raw: string; startLine: number; endLine: number; docTitle: string };
  // —— AI 专区可选字段（其余模块缺省）——
  pipeline?: { name: string; steps: PipelineStep[] };
  promptBlocks?: PromptBlock[];
  fullAnswer?: FullAnswer;
  params?: { k: string; v: string; note?: string }[];
}

export interface ProjectModule {
  area?: 'project' | 'mw';
  key: string;
  name: string;
  en: string;
  desc: string;
  order: number;
  count: number;
}

const mods = import.meta.glob<ProjectQuestion>('../data/project/*.json', { eager: true, import: 'default' });

export const projectMeta = metaJson as { title: string; modules: ProjectModule[]; total: number; sourceDoc: string };

export const allProjectQuestions: ProjectQuestion[] = Object.values(mods)
  .map((q) => q as unknown as ProjectQuestion)
  .sort((a, b) => a.id.localeCompare(b.id, 'en'));

export const projectModules = [...projectMeta.modules].sort((a, b) => a.order - b.order);

export function moduleQuestions(key: string): ProjectQuestion[] {
  return allProjectQuestions.filter((q) => q.module === key);
}

export function getQuestion(id: string): ProjectQuestion | undefined {
  return allProjectQuestions.find((q) => q.id === id);
}

export function neighbors(id: string): { prev?: ProjectQuestion; next?: ProjectQuestion } {
  const list = moduleQuestions(getQuestion(id)?.module ?? '');
  const i = list.findIndex((q) => q.id === id);
  return { prev: list[i - 1], next: list[i + 1] };
}

export const statusLabel: Record<ProjectQuestion['status'], string> = {
  pending: '待撰写',
  draft: '初稿',
  reviewed: '已评审',
  done: '可背'
};

export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

export const scoreOf = (q: ProjectQuestion) => q.review.total;

/** AI 专区的三个模块（与项目区的 ma/en/dist/st 分开） */
export const AI_MODULE_KEYS = ['foundation', 'ragent', 'eval'] as const;
export type AiModuleKey = (typeof AI_MODULE_KEYS)[number];

export const aiModules = projectModules.filter((m) => (AI_MODULE_KEYS as readonly string[]).includes(m.key));

/** 中间件专区（MySQL / Redis / RocketMQ） */
export const MW_MODULE_KEYS = ['mysql', 'redis', 'rocketmq'] as const;
export type MwModuleKey = (typeof MW_MODULE_KEYS)[number];

export const mwModules = projectModules.filter((m) => (MW_MODULE_KEYS as readonly string[]).includes(m.key));

export const mwQuestions = allProjectQuestions.filter((q) => (MW_MODULE_KEYS as readonly string[]).includes(q.module));

/** 项目经历（不含 AI 与中间件） */
export const projectOnlyModules = projectModules.filter(
  (m) => !(AI_MODULE_KEYS as readonly string[]).includes(m.key) && !(MW_MODULE_KEYS as readonly string[]).includes(m.key)
);

export const mwStats = () => {
  const scored = mwQuestions.filter((q) => q.review.total > 0);
  return {
    total: mwQuestions.length,
    scoredCount: scored.length,
    avg: scored.length ? Math.round((scored.reduce((a, q) => a + q.review.total, 0) / scored.length) * 10) / 10 : 0
  };
};

export const aiQuestions = allProjectQuestions.filter((q) => (AI_MODULE_KEYS as readonly string[]).includes(q.module));

export const projectOnlyQuestions = allProjectQuestions.filter(
  (q) => !(AI_MODULE_KEYS as readonly string[]).includes(q.module) && !(MW_MODULE_KEYS as readonly string[]).includes(q.module)
);

export const aiStats = () => {
  const scored = aiQuestions.filter((q) => q.review.total > 0);
  return {
    total: aiQuestions.length,
    avg: scored.length ? Math.round(scored.reduce((a, q) => a + q.review.total, 0) / scored.length) : 0,
    excellent: aiQuestions.filter((q) => q.review.total >= 90).length,
    good: aiQuestions.filter((q) => q.review.total >= 80 && q.review.total < 90).length,
    anchors: aiQuestions.reduce((a, q) => a + q.codeAnchors.length, 0),
    hardErrors: aiQuestions.reduce((a, q) => a + (q.review.hardErrors?.length ?? 0), 0)
  };
};

/** 题目详情页地址：AI 三模块走 /ai，其余走 /project */
export function questionHref(q: Pick<ProjectQuestion, 'id' | 'module'>): string {
  const mod = projectModules.find((m) => m.key === q.module);
  const en = mod?.en ?? q.module;
  const base = (AI_MODULE_KEYS as readonly string[]).includes(q.module) ? '/ai' : '/project';
  return `${base}/${en}/${q.id}`;
}

/** 题目的分区前缀，用于列表页分组与链接拼接 */
export function questionBase(moduleKey: string): string {
  return (AI_MODULE_KEYS as readonly string[]).includes(moduleKey) ? '/ai' : '/project';
}

/** 项目区（不含 AI 三模块）的统计 */
export function projectOnlyStats() {
  const list = projectOnlyQuestions;
  const done = list.filter((q) => q.status === 'done' || q.status === 'reviewed').length;
  const scored = list.filter((q) => q.review.total > 0);
  const avg = scored.length ? Math.round(scored.reduce((s, q) => s + q.review.total, 0) / scored.length) : 0;
  return { total: list.length, done, avg, scoredCount: scored.length };
}

export function projectStats() {
  const total = allProjectQuestions.length;
  const done = allProjectQuestions.filter((q) => q.status === 'done' || q.status === 'reviewed').length;
  const scored = allProjectQuestions.filter((q) => q.review.total > 0);
  const avg = scored.length ? Math.round(scored.reduce((s, q) => s + q.review.total, 0) / scored.length) : 0;
  return { total, done, avg, scoredCount: scored.length };
}
