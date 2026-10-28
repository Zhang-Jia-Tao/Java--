/**
 * 默写骨架：把参考代码里"不该让人背"的部分（类声明、方法签名、收尾括号）摘出来，
 * 只留方法体给用户默写。构建期算好，运行时只做字符串拼接。
 */

export interface CodeFrame {
  mode: 'body' | 'whole';
  headLines: string[];   // 已给出的上半部分（含方法签名那行）
  tailLines: string[];   // 已给出的收尾括号
  tailStart: number;     // tail 第一行在原文里的行号（1-based）
  bodyLines: number;     // 需要默写的行数
  sigLine: number;       // 方法签名所在行（1-based），whole 模式为 0
  headText: string;
  tailText: string;
}

const CONTROL = /^\s*(if|for|while|switch|catch|else|do|try|synchronized)\b/;

/** 判断这一行是不是方法/构造器签名（以 ") {" 收尾，且不是控制语句） */
function isSignature(line: string): boolean {
  const t = line.trim();
  if (!t.endsWith('{')) return false;
  if (CONTROL.test(t)) return false;
  if (/\bclass\b|\binterface\b|\benum\b|\brecord\b/.test(t)) return false;
  if (!/\)\s*\{\s*$/.test(t)) return false;
  // 至少要有一对括号
  if (!t.includes('(')) return false;
  return true;
}

/** 把注释与字符串内容抹成空格，避免里面的花括号干扰配对 */
function maskForBraces(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => ' '.repeat(m.length))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => ' '.repeat(m.length));
}

export function buildFrame(code: string): CodeFrame {
  const lines = code.split('\n');
  const masked = maskForBraces(code).split('\n');

  // 每行的净花括号增量
  const delta = masked.map((l) => {
    let d = 0;
    for (const ch of l) {
      if (ch === '{') d++;
      else if (ch === '}') d--;
    }
    return d;
  });

  const candidates: { idx: number; end: number; size: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!isSignature(lines[i])) continue;
    // 从该行开始找配对的右花括号
    let depth = 0;
    let end = -1;
    for (let k = i; k < lines.length; k++) {
      depth += delta[k];
      if (depth <= 0 && k > i) {
        end = k;
        break;
      }
      if (depth <= 0 && k === i) {
        end = k;
        break;
      }
    }
    if (end < 0) continue;
    candidates.push({ idx: i, end, size: end - i });
  }

  if (!candidates.length) {
    return {
      mode: 'whole',
      headLines: [],
      tailLines: [],
      tailStart: lines.length,
      bodyLines: lines.length,
      sigLine: 0,
      headText: '',
      tailText: ''
    };
  }

  // 取方法体最长的那一个（多方法的类，比如 LRU，默写核心最长的那段）
  const best = candidates.reduce((a, b) => (b.size > a.size ? b : a));
  const headLines = lines.slice(0, best.idx + 1);
  const tailLines = lines.slice(best.end);

  // 骨架行两侧的空行不占行号显示，但保留以维持缩进观感
  return {
    mode: 'body',
    headLines,
    tailLines,
    tailStart: best.end + 1,
    bodyLines: Math.max(0, best.end - best.idx - 1),
    sigLine: best.idx + 1,
    headText: headLines.join('\n'),
    tailText: tailLines.join('\n')
  };
}
