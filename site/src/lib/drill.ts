/**
 * 默写判定引擎（纯函数，无 DOM 依赖）
 *
 * 判的是"思路是否同一条路"，不是"代码能不能跑"，也不是"字打得一样"。
 *
 * 归一化（消掉所有与思路无关的差异）：
 *   1. 去注释；字符串内容 → "S"，字符 → 'C'（注释和常量文案不影响思路）
 *   2. 数字字面量 → N
 *   3. 标识符按"首次出现顺序"改名 v1,v2…（left/right 与 l/r 等价；但把左右写反了不会被抹平）
 *   4. 按 token 序列比较，因此换行、缩进、一行写几句、`{ }` 是否省略，全都几乎不影响
 *
 * 三项指标：
 *   S1 结构顺序 0.50 —— token 级 LCS / 较长者长度
 *   S2 关键手法 0.35 —— keyTokens 命中率（这题"必须用到的手法"被点名过）
 *   S3 篇幅吻合 0.15 —— token 数量偏离（过度简化/写跑偏会掉）
 *
 * 结果三档：≥85 一致 / 60-84 接近 / <60 可能换了思路。
 * 另加一条硬规则：只要还有关键手法没出现，最高只能判"接近"。
 */

const KEYWORDS = new Set([
  'abstract', 'assert', 'break', 'case', 'catch', 'class', 'continue', 'default', 'do', 'else',
  'enum', 'extends', 'final', 'finally', 'for', 'if', 'implements', 'import', 'instanceof',
  'interface', 'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'switch',
  'synchronized', 'throw', 'throws', 'try', 'while', 'yield', 'var',
  'int', 'long', 'short', 'byte', 'char', 'boolean', 'float', 'double', 'void',
  'true', 'false', 'null', 'this', 'super'
]);

export function stripJava(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '"S"')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "'C'");
}

export interface Token {
  text: string;  // 归一化后的 token
  line: number;  // 原始行号（1-based）
}

export interface Normalized {
  tokens: Token[];
  names: Set<string>;  // 原始标识符集合（用于关键手法命中判定）
  flatText: string;    // 去空白后的代码正文（用于 height.length / left++ 这类组合记号）
  raw: string[];       // 原始代码行
}

const TOKEN_RE = /\b[A-Za-z_$][A-Za-z0-9_$]*\b|\d+(?:\.\d+)?|[^\sA-Za-z0-9_$]+/g;

export function normalize(code: string): Normalized {
  const raw = code.split('\n');
  const cleaned = stripJava(code).split('\n');
  const names = new Set<string>();
  const idMap = new Map<string, string>();
  const tokens: Token[] = [];

  for (let li = 0; li < cleaned.length; li++) {
    const line = cleaned[li];
    if (!line.trim()) continue;
    const matches = line.match(TOKEN_RE) || [];
    for (let k = 0; k < matches.length; k++) {
      const m = matches[k];
      if (/^[A-Za-z_$]/.test(m)) {
        names.add(m);
        // 只归一"变量名"：方法调用（后面紧跟括号）和类名（大写开头）保留原样，
        // 否则 pollFirst 会被改名成 v6，和别人的第 6 个变量撞车
        const isCall = (matches[k + 1] || '').startsWith('(');
        const isType = /^[A-Z]/.test(m);
        let t = m;
        if (!KEYWORDS.has(m) && !isCall && !isType) {
          if (!idMap.has(m)) idMap.set(m, 'v' + (idMap.size + 1));
          t = idMap.get(m)!;
        }
        tokens.push({ text: t, line: li + 1 });
      } else if (/^\d/.test(m)) {
        tokens.push({ text: 'N', line: li + 1 });
      } else {
        // 标点/运算符：逐字符拆开，避免 "(){" 这种组合影响对齐
        for (const ch of m) tokens.push({ text: ch, line: li + 1 });
      }
    }
  }

  return { tokens, names, flatText: cleaned.join('\n').replace(/\s+/g, ''), raw };
}

export interface AlignResult {
  matchedA: boolean[];
  matchedB: boolean[];
  matched: number;
}

/** token 级 LCS + 回溯，得到两边各自的命中标记 */
export function lcsAlign(a: string[], b: string[]): AlignResult {
  const n = a.length;
  const m = b.length;
  const matchedA = new Array<boolean>(n).fill(false);
  const matchedB = new Array<boolean>(m).fill(false);
  if (!n || !m) return { matchedA, matchedB, matched: 0 };

  if (n * m > 400_000) {
    // 超大输入：退化为集合命中，不做回溯
    const setB = new Set(b);
    a.forEach((t, i) => {
      if (setB.has(t)) matchedA[i] = true;
    });
    const setA = new Set(a);
    b.forEach((t, i) => {
      if (setA.has(t)) matchedB[i] = true;
    });
    return { matchedA, matchedB, matched: matchedA.filter(Boolean).length };
  }

  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      dp[i * w + j] = ai === b[j - 1]
        ? dp[(i - 1) * w + (j - 1)] + 1
        : Math.max(dp[(i - 1) * w + j], dp[i * w + (j - 1)]);
    }
  }

  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      matchedA[i - 1] = true;
      matchedB[j - 1] = true;
      i--;
      j--;
    } else if (dp[(i - 1) * w + j] >= dp[i * w + (j - 1)]) {
      i--;
    } else {
      j--;
    }
  }

  return { matchedA, matchedB, matched: dp[n * w + m] };
}

export type DiffState = 'hit' | 'close' | 'miss';

export interface DiffRow {
  state: DiffState;
  line: number;
  text: string;
}

/** 参考代码逐行对照：只看"有意义的 token"（标识符/关键字/数字），标点不算分。
 *  align.matchedB 是参考侧标记（lcsAlign 的第一个参数是用户的、第二个才是参考的） */
export function diffLines(ref: Normalized, align: AlignResult, user?: Normalized): DiffRow[] {
  const significant = (t: string) => /^[A-Za-z_$]/.test(t) || t === 'N';
  const perLine = new Map<number, { total: number; hit: number }>();

  ref.tokens.forEach((t, idx) => {
    if (!significant(t.text)) return;
    const s = perLine.get(t.line) || { total: 0, hit: 0 };
    s.total++;
    if (align.matchedB[idx]) s.hit++;
    perLine.set(t.line, s);
  });

  // 用户代码里"逐行完全相同"的行签名（用于救回被 LCS 对齐漂移误判的行）
  const signatures = new Set<string>();
  if (user) {
    const byLine = new Map<number, string[]>();
    for (const t of user.tokens) {
      if (!significant(t.text)) continue;
      const arr = byLine.get(t.line) || [];
      arr.push(t.text);
      byLine.set(t.line, arr);
    }
    for (const arr of byLine.values()) signatures.add(arr.join(' '));
  }
  const refByLine = new Map<number, string[]>();
  for (const t of ref.tokens) {
    if (!significant(t.text)) continue;
    const arr = refByLine.get(t.line) || [];
    arr.push(t.text);
    refByLine.set(t.line, arr);
  }

  return [...perLine.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([line, s]) => {
      let state: DiffState = s.hit === s.total ? 'hit' : s.hit === 0 ? 'miss' : 'close';
      if (state === 'miss') {
        const sig = (refByLine.get(line) || []).join(' ');
        // 这一行你确实写过，只是被前面缺的那一步挤错了位置
        if (sig && signatures.has(sig)) state = 'close';
      }
      return { line, text: (ref.raw[line - 1] || '').trim(), state };
    });
}

export interface JudgeResult {
  score: number;
  verdict: 'same' | 'close' | 'different';
  s1: number;
  s2: number;
  s3: number;
  hits: string[];
  missing: string[];
  rows: DiffRow[];
  extraCount: number;
}

export function judge(userCode: string, refCode: string, keyTokens: string[]): JudgeResult {
  const u = normalize(userCode);
  const r = normalize(refCode);

  if (!u.tokens.length) {
    return {
      score: 0, verdict: 'different', s1: 0, s2: 0, s3: 0,
      hits: [], missing: [...keyTokens], rows: [], extraCount: 0
    };
  }

  const align = lcsAlign(u.tokens.map((t) => t.text), r.tokens.map((t) => t.text));
  const s1 = align.matched / Math.max(u.tokens.length, r.tokens.length, 1);

  // 单个标识符按名字命中；带运算符/点的组合记号按去空白正文命中
  const hitOne = (t: string) =>
    /^[A-Za-z_$][\w$]*$/.test(t) ? u.names.has(t) : u.flatText.includes(t.replace(/\s+/g, ''));
  const hits = keyTokens.filter(hitOne);
  const missing = keyTokens.filter((t) => !hitOne(t));
  const s2 = keyTokens.length ? hits.length / keyTokens.length : 1;
  const s3 = Math.max(0, 1 - Math.abs(u.tokens.length - r.tokens.length) / Math.max(r.tokens.length, 1));

  const score = Math.round((0.5 * s1 + 0.35 * s2 + 0.15 * s3) * 100);
  let verdict: JudgeResult['verdict'] = score >= 85 ? 'same' : score >= 60 ? 'close' : 'different';
  // 关键手法没凑齐，不给"一致"
  if (verdict === 'same' && missing.length) verdict = 'close';

  const rows = diffLines(r, align, u);
  const extraCount = u.tokens.length - align.matchedA.filter(Boolean).length;

  return { score, verdict, s1, s2, s3, hits, missing, rows, extraCount };
}

/** L2 填空判等：忽略空白、首尾分号、行内注释、大小写 */
export function sameCodeAnswer(input: string, answer: string): boolean {
  const norm = (s: string) =>
    s
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\s+/g, '')
      .replace(/^;+/, '')
      .replace(/;+$/, '')
      .toLowerCase();
  return norm(input) === norm(answer);
}
