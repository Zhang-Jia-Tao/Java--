/**
 * Leitner 五盒记忆调度（浏览器侧，localStorage 持久化）
 *
 * 盒子间隔：1 → 2 → 4 → 7 → 15 天。答错回盒 1（明天再来）。
 * 新题视为第 0 盒，当天到期。
 */

export const BOX_DAYS = [1, 2, 4, 7, 15] as const;
export const STORAGE_KEY = 'dsh:leitner:v1';

export type Card = { box: number; due: string; seen: number; ok: number };
export type State = Record<string, Card>;

export function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function addDays(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  t.setDate(t.getDate() + days);
  const mm = `${t.getMonth() + 1}`.padStart(2, '0');
  const dd = `${t.getDate()}`.padStart(2, '0');
  return `${t.getFullYear()}-${mm}-${dd}`;
}

export function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as State;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function save(state: State): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 隐私模式下静默失败 */
  }
}

/** 取某题状态；没有则视为新题（box 0，今天到期） */
export function cardOf(state: State, id: string): Card {
  return state[id] ?? { box: 0, due: today(), seen: 0, ok: 0 };
}

/** 评分：会 → 进一盒；不会 → 回第 1 盒（明天） */
export function grade(state: State, id: string, remembered: boolean): State {
  const c = cardOf(state, id);
  const box = remembered ? Math.min(c.box + 1, BOX_DAYS.length) : 1;
  const days = BOX_DAYS[Math.min(box, BOX_DAYS.length) - 1];
  const next: State = {
    ...state,
    [id]: {
      box,
      due: addDays(today(), days),
      seen: c.seen + 1,
      ok: c.ok + (remembered ? 1 : 0)
    }
  };
  save(next);
  return next;
}

export function isDue(card: Card, date = today()): boolean {
  return card.due <= date;
}

/** 今日队列：到期优先，其次按盒号升序（越生越靠前） */
export function dueQueue<T extends { id: string }>(items: T[], state: State): T[] {
  const t = today();
  return items
    .map((it) => ({ it, c: cardOf(state, it.id) }))
    .filter((x) => isDue(x.c, t))
    .sort((a, b) => a.c.box - b.c.box || a.c.seen - b.c.seen)
    .map((x) => x.it);
}

export function stats(items: { id: string }[], state: State) {
  const t = today();
  const buckets = BOX_DAYS.map((_, i) => 0);
  let fresh = 0;
  let due = 0;
  let learned = 0;
  for (const it of items) {
    const c = cardOf(state, it.id);
    if (!state[it.id]) fresh += 1;
    else buckets[Math.min(c.box, BOX_DAYS.length) - 1] += 1;
    if (isDue(c, t)) due += 1;
    if (state[it.id]) learned += 1;
  }
  return { fresh, due, learned, buckets, total: items.length };
}

/** 盒子文案 */
export function boxLabel(box: number): string {
  if (box <= 0) return '新题';
  return `第 ${box} 盒 · ${BOX_DAYS[Math.min(box, BOX_DAYS.length) - 1]} 天`;
}
