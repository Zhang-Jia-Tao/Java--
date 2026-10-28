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
}

export interface ProjectModule {
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

export function projectStats() {
  const total = allProjectQuestions.length;
  const done = allProjectQuestions.filter((q) => q.status === 'done' || q.status === 'reviewed').length;
  const scored = allProjectQuestions.filter((q) => q.review.total > 0);
  const avg = scored.length ? Math.round(scored.reduce((s, q) => s + q.review.total, 0) / scored.length) : 0;
  return { total, done, avg, scoredCount: scored.length };
}
