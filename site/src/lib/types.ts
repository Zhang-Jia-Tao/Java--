export type ChecklistState = 'done' | 'partial' | 'missing';

export interface ChecklistItem {
  point: string;
  state: ChecklistState;
  note?: string;
}

export interface HardError {
  level: 1 | 2 | 3;
  wrong: string;
  right: string;
  note?: string;
}

export interface FollowUp {
  q: string;
  a: string;
}

export interface Question {
  id: string;
  chapter: string;
  chapterName: string;
  chapterSub?: string;
  title: string;
  star: number;
  score: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    total: number;
    verdict: 'fail' | 'pass' | 'good' | 'great' | 'perfect';
  };
  summary: string;
  original: string[];
  projectAnchor?: string[];
  checklist: ChecklistItem[];
  hardErrors: HardError[];
  deductions: string[];
  bonus: string[];
  followUps: FollowUp[];
  improved: string;
  source: { raw: string; review: string };
}
