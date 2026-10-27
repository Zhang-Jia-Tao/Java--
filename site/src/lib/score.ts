export function bandOf(total: number): 'perfect' | 'great' | 'good' | 'pass' | 'fail' {
  if (total >= 96) return 'perfect';
  if (total >= 90) return 'great';
  if (total >= 80) return 'good';
  if (total >= 70) return 'pass';
  return 'fail';
}

export const BAND_LABEL: Record<string, string> = {
  perfect: '满分',
  great: '优秀',
  good: '良好',
  pass: '及格',
  fail: '不合格'
};

export const BAND_COLOR: Record<string, string> = {
  perfect: 'var(--c-a)',
  great: 'var(--c-a)',
  good: 'var(--c-b)',
  pass: 'var(--c-c)',
  fail: 'var(--c-d)'
};

export function dimRate(q: { score: Record<string, number> }) {
  return {
    A: Math.round((q.score.A / 40) * 100),
    B: Math.round((q.score.B / 25) * 100),
    C: Math.round((q.score.C / 20) * 100),
    D: Math.round((q.score.D / 10) * 100),
    E: Math.round((q.score.E / 5) * 100)
  };
}
