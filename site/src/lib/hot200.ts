/** Hot200 手撕题数据访问层 */

export interface Fingerprint {
  q: string;
  options: string[];
  answer: number;
  why?: string;
}

export interface Blank {
  line: number;
  prompt: string;
  answer: string;
  why?: string;
}

export interface WalkStep {
  step: number;
  input: string;
  state: string;
  answer: string;
  note?: string;
}

export interface CodeWalk {
  line: number;
  code?: string;
  q: string;
  a: string;
}

export interface ExpertComment {
  scope: string;
  kind: 'praise' | 'risk' | 'version' | 'depth' | 'production' | 'provenance';
  quote?: string;
  text: string;
  line?: number;
}

export interface Hot200Question {
  slug: string;
  lc: number | null;
  title: string;
  approach: string | null;
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
  statement: string[];
  examples: { label: string; in: string; out: string; explain: string[] }[];
  figures?: { src: string; w: number; h: number }[];
  sourceIdea: string | null;
  code: { lang: string; source: string; lines: number };
  explain: {
    oneLiner: string;
    analogy: string;
    walkthrough: WalkStep[];
    codeWalkthrough: CodeWalk[];
    pitfalls: string[];
    complexity: { time: string; space: string; why: string };
    variants: string[];
  };
  drill: {
    fingerprint: Fingerprint[];
    blanks: Blank[];
    keyTokens: string[];
    accepted: string[];
  };
  status: 'skeleton' | 'written' | 'pending-code';
  expert?: { role: 'java' | 'ai'; comments: ExpertComment[] };
}

export interface Hot200IndexItem {
  slug: string;
  lc: number | null;
  title: string;
  category: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard' | null;
  lines: number;
  status: string;
}

const modules = import.meta.glob<{ default: Hot200Question }>('../data/hot200/lc*.json', { eager: true });

export function loadHot200(): Hot200Question[] {
  const list = Object.values(modules).map((m) => (m as any).default ?? (m as any));
  return list.sort((a: Hot200Question, b: Hot200Question) => (a.lc ?? 0) - (b.lc ?? 0));
}

export function loadHot200ByCategory(): { category: string; items: Hot200Question[] }[] {
  const order = ['滑动窗口', '双指针', '链表', '二叉树'];
  const all = loadHot200();
  const map = new Map<string, Hot200Question[]>();
  for (const q of all) {
    if (!map.has(q.category)) map.set(q.category, []);
    map.get(q.category)!.push(q);
  }
  return [...map.entries()]
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([category, items]) => ({
      category,
      items: items.sort((x, y) => (x.lc ?? 0) - (y.lc ?? 0))
    }));
}

export const DIFF_LABEL: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

export const DIFF_COLOR: Record<string, string> = {
  easy: 'var(--c-a)',
  medium: 'var(--c-b)',
  hard: 'var(--c-d)'
};

export function chapterOf(slug: string): string {
  return 'hot200';
}
