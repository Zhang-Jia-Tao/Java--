import freqJson from '../data/freq.json';

export type FreqTier = 'S' | 'A' | 'B' | '-';

export interface FreqItem {
  id: string;
  domain: 'java' | 'ai' | 'proj' | 'hot';
  module: string;
  href: string;
  title: string;
  tier: FreqTier;
  why: string;
}

const payload = freqJson as { note: string; generated: string; stats: any; items: FreqItem[] };

export const freqItems: FreqItem[] = payload.items;
export const freqNote: string = payload.note;
export const freqStats = payload.stats;

const map = new Map<string, FreqItem>(freqItems.map((i) => [i.id, i]));

export const freqOf = (id: string): FreqItem | undefined => map.get(id);

export const tierLabel: Record<FreqTier, string> = {
  S: 'S 必背',
  A: 'A 常考',
  B: 'B 会问',
  '-': '不参与考频'
};
