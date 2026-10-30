import { highlightJava } from './highlight';

/** 转义 HTML（保留换行由调用方处理） */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 行内标记：`code`、**bold**、*italic*、~~del~~、[text](url)、![alt](src)、反斜杠转义 */
function inline(src: string): string {
  let s = esc(src.replace(/\\([.\-+*_`\[\]()#!~>|&<])/g, '$1'));
  // 1) 行内代码先摘出来，避免内部符号被当标记
  const codes: string[] = [];
  s = s.replace(/`([^`]+)`/g, (_m, c: string) => {
    codes.push(`<code class="md-code">${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  // 2) 图片 / 链接（飞书外链图换成占位，避免加载失败）
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt: string, url: string) =>
    /^https?:\/\//i.test(url)
      ? `<img src="${url}" alt="${alt}" class="md-img" loading="lazy" decoding="async" onerror="this.style.display='none'" />`
      : `<span class="md-img-missing">[图] ${alt || '原文配图'}</span>`
  );
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) =>
    `<a href="${url}" class="md-link" target="_blank" rel="noopener">${text}</a>`
  );
  // 3) 强调：先粗体再斜体（允许嵌套：粗体在斜体内）
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 原文把 ~~ 当成区间连接符（3~~5 天），不按删除线处理
  s = s.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  // 4) 还原行内代码
  s = s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)]);
  return s;
}

type Block =
  | { t: 'p'; html: string }
  | { t: 'h'; level: number; html: string }
  | { t: 'pre'; html: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'table'; rows: string[][] }
  | { t: 'quote'; html: string }
  | { t: 'hr' };

/** 把 markdown 文本切成块级结构 */
function blocks(md: string): Block[] {
  const lines = md.split(/\r?\n/);
  const out: Block[] = [];
  let i = 0;

  const isTableSep = (l: string) => /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(l) && l.includes('-');

  while (i < lines.length) {
    const line = lines[i];

    // 代码围栏
    const fence = line.match(/^\s*```(\w[\w\s+-]*)?\s*$/);
    if (fence) {
      const lang = (fence[1] || '').trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push({ t: 'pre', html: codeBlock(lang, buf.join('\n')) });
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      out.push({ t: 'h', level: h[1].length, html: inline(h[2].trim()) });
      i++;
      continue;
    }

    // 分隔线
    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      out.push({ t: 'hr' });
      i++;
      continue;
    }

    // 表格
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const rows: string[][] = [];
      const split = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      rows.push(split(line));
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(split(lines[i++]));
      out.push({ t: 'table', rows });
      continue;
    }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push({ t: 'quote', html: inline(buf.join(' ')) });
      continue;
    }

    // 列表
    const li = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (li) {
      const ordered = /\d/.test(li[2]);
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m) break;
        // 续行：缩进的普通行并入上一项
        items.push(inline(m[3].trim()));
        i++;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i])) {
          items[items.length - 1] += ' ' + inline(lines[i].trim());
          i++;
        }
      }
      out.push({ t: ordered ? 'ol' : 'ul', items });
      continue;
    }

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 段落（连续非空行合并）
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*```/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i]) && !/^\s*>/.test(lines[i])) {
      buf.push(lines[i++]);
    }
    out.push({ t: 'p', html: inline(buf.join(' ')) });
  }
  return out;
}

const PLAIN_LANGS = new Set(['plain text', 'text', 'plaintext', 'txt', 'log', '']);
const isJava = (l: string) => /^java$/i.test(l);

/**
 * 飞书导出的原文大量把 Mermaid 图表写成 ```Java 围栏（还有被章节切碎的片段），
 * 若按 Java 高亮渲染就是满屏乱码。这里先按内容识别 Mermaid，再决定渲染方式。
 */
const MERMAID_TYPES: [RegExp, string][] = [
  [/^sequenceDiagram\b/, '时序图'],
  [/^(flowchart|graph)\b/, '流程图'],
  [/^classDiagram\b/, '类图'],
  [/^erDiagram\b/, 'ER 图'],
  [/^(stateDiagram|stateDiagram-v2)\b/, '状态图'],
  [/^gantt\b/, '甘特图'],
  [/^pie\b/, '饼图'],
  [/^mindmap\b/, '思维导图'],
  [/^timeline\b/, '时间线'],
  [/^journey\b/, '用户旅程']
];
/** 被章节切碎后首行不是图类型，但仍带 Mermaid 专有语法（命中 ≥2 种才认，避免误伤普通代码块） */
const MERMAID_SIG = /%%\{init|->>|\bparticipant\s|\bautonumber\b|\bsubgraph\s|\blinkStyle\b|\bclassDef\b|\bNote over\b|^\s*rect rgb\(/gm;

function mermaidKind(lang: string, code: string): string | null {
  if (/^mermaid$/i.test(lang)) return '图表';
  const first = (code.split('\n').find((l) => l.trim()) || '').trim();
  for (const [re, name] of MERMAID_TYPES) if (re.test(first)) return name;
  if ((code.match(MERMAID_SIG) || []).length >= 2) {
    // 被章节切碎的片段：按残留语法判断是哪一种图
    if (/->>|\bparticipant\s|\bNote over\b|^\s*rect rgb\(/m.test(code)) return '时序图片段';
    if (/-->|==>|-.->|\bsubgraph\s|\bclassDef\b|\[.*\]/m.test(code)) return '流程图片段';
    return '图表片段';
  }
  return null;
}

/**
 * 同一批原文里还有「用制表符画出来的结构图」被标成 ```Java，
 * 按 Java 高亮同样是满屏乱码。按内容判断：制表符行占比高且几乎没有 Java 关键字。
 */
const BOX_ART = /[│├└─┌┐┘┬┴┼╔╗╚╝║═]/;
const JAVA_KW = /\b(class|public|private|protected|void|return|new\s|import\s|if\s*\(|for\s*\(|while\s*\(|System\.|@Override|throws)\b/;

function asciiArtKind(lang: string, code: string): string | null {
  if (!/^java$/i.test(lang)) return null;
  const lines = code.split('\n').filter((l) => l.trim());
  if (lines.length < 4) return null;
  const art = lines.filter((l) => BOX_ART.test(l)).length;
  const kw = lines.filter((l) => JAVA_KW.test(l)).length;
  if (art / lines.length >= 0.3 && kw / lines.length <= 0.1) return '结构图';
  return null;
}

/** 展示 Mermaid 源码时去掉纯样式噪声（init 配置块、linkStyle），保结构与文字 */
function tidyMermaid(code: string): string {
  let out = code;
  // %%{init: { ... }}%% 多行配置
  out = out.replace(/%%\{[\s\S]*?\}%%\s*/g, '');
  out = out
    .split('\n')
    .filter((l) => !/^\s*linkStyle\b/.test(l))
    .join('\n');
  // 收掉连续空行
  out = out.replace(/\n{3,}/g, '\n\n').replace(/^\s*\n/, '');
  // 标签内的 <b>/<i> 只是加粗标记，源码视图里当噪声去掉；rect 去配色
  out = out.replace(/<\/?(b|i|strong|em|br\s*\/?)>/gi, '').replace(/\brect\s+rgb\([^)]*\)/g, 'rect');
  return out.trimEnd();
}

function codeBlock(lang: string, code: string): string {
  const label = lang || 'text';
  const kind = mermaidKind(lang, code);
  if (kind) {
    const tidy = tidyMermaid(code);
    // 原文（含配色配置）仍然完整留在页面上，只是收进折叠区，保证「原文层」逐字可查
    const rawPart =
      tidy !== code
        ? `<details class="md-mermaid-raw"><summary>原始代码块（含配色配置）</summary><pre class="md-pre md-pre-plain md-pre-mermaid"><code>${esc(code)}</code></pre></details>`
        : '';
    if (kind.endsWith('片段')) {
      // 没有前一段可拼（找不到图头）：只能按源码展示
      return (
        `<div class="md-pre-wrap md-mermaid"><div class="md-pre-head"><span>Mermaid · ${esc(kind)}</span>` +
        `<span class="md-mermaid-hint" title="原文被章节切开的图表残段">图表残段</span></div>` +
        `<pre class="md-pre md-pre-plain md-pre-mermaid"><code>${esc(tidy)}</code></pre>${rawPart}</div>`
      );
    }
    // 有完整图头：交给浏览器用 mermaid 渲染；渲染不出来时退回源码
    return (
      `<div class="md-pre-wrap md-mermaid md-mermaid-dia" data-kind="${esc(kind)}" data-state="pending">` +
      `<div class="md-pre-head"><span>Mermaid · ${esc(kind)}</span>` +
      `<span class="md-mermaid-hint mm-status">渲染中…</span></div>` +
      `<div class="mm-dia"><pre class="md-pre md-pre-plain md-pre-mermaid mm-fallback"><code>${esc(tidy)}</code></pre></div>` +
      `${rawPart}</div>`
    );
  }
  if (isJava(lang)) {
    const art = asciiArtKind(lang, code);
    if (art) {
      return (
        `<div class="md-pre-wrap"><div class="md-pre-head"><span>${esc(art)}</span>` +
        `<span class="md-mermaid-hint">原文用制表符绘制</span></div>` +
        `<pre class="md-pre md-pre-plain"><code>${esc(code)}</code></pre></div>`
      );
    }
    const html = highlightJava(code).map((l) => l.html).join('\n');
    return `<div class="md-pre-wrap"><div class="md-pre-head"><span>${esc(label)}</span></div><pre class="md-pre md-pre-code"><code>${html}</code></pre></div>`;
  }
  const plain = PLAIN_LANGS.has(lang.toLowerCase()) || !lang;
  return `<div class="md-pre-wrap"><div class="md-pre-head"><span>${esc(label)}</span></div><pre class="md-pre${plain ? ' md-pre-plain' : ''}"><code>${esc(code)}</code></pre></div>`;
}

/** markdown → HTML（支持标题/段落/列表/代码块/表格/引用/分割线/图片/行内标记） */
export function renderMarkdown(md: string): string {
  return blocks(md)
    .map((b) => {
      switch (b.t) {
        case 'h':
          return `<h${Math.min(b.level + 2, 6)} class="md-h md-h${b.level}">${b.html}</h${Math.min(b.level + 2, 6)}>`;
        case 'p':
          return `<p class="md-p">${b.html}</p>`;
        case 'pre':
          return b.html;
        case 'ul':
          return `<ul class="md-ul">${b.items.map((x) => `<li>${x}</li>`).join('')}</ul>`;
        case 'ol':
          return `<ol class="md-ol">${b.items.map((x) => `<li>${x}</li>`).join('')}</ol>`;
        case 'table':
          return `<div class="md-table-wrap"><table class="md-table"><thead><tr>${b.rows[0]
            .map((c) => `<th>${c}</th>`)
            .join('')}</tr></thead><tbody>${b.rows
            .slice(1)
            .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`;
        case 'quote':
          return `<blockquote class="md-quote">${b.html}</blockquote>`;
        case 'hr':
          return '<hr class="md-hr" />';
        default:
          return '';
      }
    })
    .join('\n');
}

/**
 * 飞书把一张图切成了多个围栏（后几段只有图体、没有图头），
 * 渲染前按出现顺序把残段拼回上一张图，残段位置换成一句说明。
 */
export function mergeMermaidFragments<T extends { md: string }>(sections: T[]): void {
  type Fence = { si: number; start: number; end: number; code: string; kind: string };
  const fences: Fence[] = [];
  sections.forEach((s, si) => {
    const md = s.md || '';
    const re = /[ \t]*```([^\n`]*)\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(md))) {
      const code = m[2] ?? '';
      const kind = mermaidKind((m[1] || '').trim(), code);
      if (!kind) continue;
      fences.push({ si, start: m.index, end: m.index + m[0].length, code, kind });
    }
  });
  if (!fences.length) return;

  const appends = new Map<Fence, string[]>();
  const removals: { si: number; start: number; end: number }[] = [];
  let target: Fence | null = null;
  for (const f of fences) {
    if (!f.kind.endsWith('片段')) {
      target = f;
      continue;
    }
    if (!target) continue;
    const list = appends.get(target) ?? [];
    list.push(f.code.replace(/\s+$/, ''));
    appends.set(target, list);
    removals.push({ si: f.si, start: f.start, end: f.end });
  }
  if (!appends.size) return;

  const edits = new Map<number, { pos: number; len: number; text: string }[]>();
  const push = (si: number, e: { pos: number; len: number; text: string }) => {
    const arr = edits.get(si) ?? [];
    arr.push(e);
    edits.set(si, arr);
  };
  for (const [f, parts] of appends) {
    // 插到闭合围栏之前（end - 3 就是 ``` 的起点）
    push(f.si, { pos: f.end - 3, len: 0, text: parts.join('\n') + '\n' });
  }
  for (const r of removals) {
    push(r.si, { pos: r.start, len: r.end - r.start, text: '> 这段图表在原文里被章节切开了，已拼回上一节那张图里渲染。\n' });
  }
  for (const [si, arr] of edits) {
    let md = sections[si].md;
    arr.sort((a, b) => b.pos - a.pos);
    for (const e of arr) md = md.slice(0, e.pos) + e.text + md.slice(e.pos + e.len);
    sections[si].md = md;
  }
}

/** 纯文本摘要，用于列表页 */
export function mdText(md: string, max = 120): string {  const t = md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`~|]/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}
