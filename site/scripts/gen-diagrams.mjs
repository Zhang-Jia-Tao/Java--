/**
 * 架构图生成器：把结构化 spec 渲染成统一风格的 SVG。
 *
 * 用途
 *   1) 手绘 spec（arch / layer / flow）→ public/diagrams/<id>.svg
 *   2) 自动：题目 JSON 里已有 flow[] 的，生成竖向链路图
 *
 * 输出
 *   site/public/diagrams/*.svg
 *   并把题目 JSON 的 diagram 字段写成 { src, caption }
 *
 * 用法
 *   node scripts/gen-diagrams.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'diagrams');
const DATA = path.join(ROOT, 'src', 'data');
const SPECS = path.join(DATA, 'diagrams.json');
const QDIR = path.join(DATA, 'project');

const C = {
  paper: '#fbf9f5',
  card: '#ffffff',
  ink: '#2f2a26',
  ink2: '#5b544c',
  ink3: '#8a8177',
  line: '#e2ddd4',
  zhu: '#c2452d',
  jin: '#b8860b',
  qing: '#3d6b8c',
  lv: '#5b7f5a',
  zi: '#7b5ea7',
  faint: '#f2eee7'
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const font = 'font-family="-apple-system,BlinkMacSystemFont,\'Segoe UI\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif"';

function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<rect width="${width}" height="${height}" fill="${C.paper}"/>
${body}
</svg>
`;
}

function text(x, y, s, { size = 13, fill = C.ink, anchor = 'middle', weight = 400, mono = false } = {}) {
  const ff = mono ? 'font-family="ui-monospace,SFMono-Regular,Consolas,monospace"' : font;
  return `<text x="${x}" y="${y}" ${ff} font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
}

/** 自动换行：按字数切，最多 maxLines 行 */
function wrap(s, per, maxLines = 3) {
  const out = [];
  let rest = String(s);
  while (rest.length && out.length < maxLines) {
    out.push(rest.slice(0, per));
    rest = rest.slice(per);
  }
  if (rest && out.length) out[out.length - 1] = out[out.length - 1].slice(0, per - 1) + '…';
  return out;
}

function box(x, y, w, h, { fill = C.card, stroke = C.line, r = 8, dash = false, sw = 1 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
}

function arrowDown(x, y1, y2, color = C.ink3) {
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2 - 6}" stroke="${color}" stroke-width="1.2"/>
<path d="M${x - 4} ${y2 - 7} L${x + 4} ${y2 - 7} L${x} ${y2}" fill="${color}"/>`;
}

function arrowRight(x1, y1, x2, color = C.ink3) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2 - 6}" y2="${y1}" stroke="${color}" stroke-width="1.2"/>
<path d="M${x2 - 7} ${y1 - 4} L${x2 - 7} ${y1 + 4} L${x2} ${y1}" fill="${color}"/>`;
}

/* ---------------- flow：竖向链路（带可选分支注释） ---------------- */
function renderFlow(spec) {
  const steps = spec.steps.map((s) => (typeof s === 'string' ? { t: s } : s));
  const W = spec.width ?? 720;
  const boxW = W - 120;
  const x0 = 60;
  let y = 24;
  const parts = [];
  const title = spec.title;
  if (title) {
    parts.push(text(W / 2, y + 6, title, { size: 14, weight: 600 }));
    y += 28;
  }
  const gap = spec.gap ?? 26;
  steps.forEach((s, i) => {
    const lines = wrap(s.t, 30, 2);
    const noteLines = s.d ? wrap(s.d, 40, 2) : [];
    const h = 34 + (lines.length - 1) * 18 + (noteLines.length ? noteLines.length * 15 + 4 : 0);
    const tone = s.tone === 'zhu' ? C.zhu : s.tone === 'qing' ? C.qing : s.tone === 'lv' ? C.lv : s.tone === 'jin' ? C.jin : C.ink;
    parts.push(box(x0, y, boxW, h, { fill: s.fill ?? C.card, stroke: s.tone ? tone : C.line }));
    parts.push(box(x0, y, 3, h, { fill: tone, stroke: 'none', r: 1.5 }));
    parts.push(text(x0 + 18, y + 22, `${i + 1}. ${lines[0]}`, { size: 12.5, anchor: 'start', weight: 500 }));
    lines.slice(1).forEach((ln, k) => parts.push(text(x0 + 18, y + 40 + k * 18, ln, { size: 12.5, anchor: 'start' })));
    noteLines.forEach((ln, k) =>
      parts.push(text(x0 + 18, y + 22 + lines.length * 18 + k * 15, ln, { size: 11, anchor: 'start', fill: C.ink3 }))
    );
    y += h;
    if (i < steps.length - 1) {
      parts.push(arrowDown(x0 + boxW / 2, y + 2, y + gap - 4));
      y += gap;
    }
  });
  return svg(W, y + 24, parts.join('\n'));
}

/* ---------------- arch：分组网格 ---------------- */
function renderArch(spec) {
  const W = spec.width ?? 840;
  const groups = spec.groups;
  const cols = spec.cols ?? Math.min(groups.length, 3);
  const pad = 18;
  const gw = (W - pad * (cols + 1)) / cols;
  let y = 24;
  const parts = [];
  if (spec.title) {
    parts.push(text(W / 2, y + 6, spec.title, { size: 14, weight: 600 }));
    y += 30;
  }
  let rowY = y;
  let col = 0;
  let rowH = 0;
  groups.forEach((g) => {
    const items = g.items ?? [];
    const itemH = 30;
    const innerH = items.reduce((acc, it) => acc + (it.d ? 42 : itemH) + 6, 0);
    const gh = 34 + innerH + 8;
    const x = pad + col * (gw + pad);
    const tone = g.tone === 'zhu' ? C.zhu : g.tone === 'qing' ? C.qing : g.tone === 'lv' ? C.lv : g.tone === 'jin' ? C.jin : g.tone === 'zi' ? C.zi : C.ink2;
    parts.push(box(x, rowY, gw, gh, { fill: g.fill ?? C.card, stroke: C.line }));
    parts.push(box(x, rowY, gw, 26, { fill: g.fill ?? C.faint, stroke: 'none', r: 8 }));
    parts.push(`<rect x="${x}" y="${rowY + 18}" width="${gw}" height="8" fill="${g.fill ?? C.faint}"/>`);
    parts.push(text(x + 12, rowY + 18, g.label, { size: 12, anchor: 'start', weight: 600, fill: tone }));
    let iy = rowY + 34;
    items.forEach((it) => {
      const h = it.d ? 42 : itemH;
      parts.push(box(x + 10, iy, gw - 20, h, { fill: it.tone === 'zhu' ? '#fdf3f0' : '#faf8f4', stroke: C.line, r: 6 }));
      parts.push(text(x + 20, iy + 19, wrap(it.t, 18, 1)[0], { size: 12, anchor: 'start', weight: it.strong ? 600 : 400 }));
      if (it.d) parts.push(text(x + 20, iy + 35, wrap(it.d, 22, 1)[0], { size: 10.5, anchor: 'start', fill: C.ink3 }));
      iy += h + 6;
    });
    rowH = Math.max(rowH, gh);
    col += 1;
    if (col === cols) {
      col = 0;
      rowY += rowH + pad;
      rowH = 0;
    }
  });
  const totalH = (col === 0 ? rowY : rowY + rowH) + 20;
  if (spec.footnote) {
    return svg(W, totalH + 26, parts.join('\n') + '\n' + text(W / 2, totalH + 12, spec.footnote, { size: 11, fill: C.ink3 }));
  }
  return svg(W, totalH, parts.join('\n'));
}

/* ---------------- layer：分层堆叠 ---------------- */
function renderLayer(spec) {
  const W = spec.width ?? 720;
  let y = 24;
  const parts = [];
  if (spec.title) {
    parts.push(text(W / 2, y + 6, spec.title, { size: 14, weight: 600 }));
    y += 30;
  }
  const rows = spec.layers;
  rows.forEach((l, i) => {
    const h = 46;
    const tone = ['zhu', 'jin', 'qing', 'lv', 'zi'][i % 5];
    const color = C[tone] ?? C.ink2;
    parts.push(box(50, y, W - 100, h, { fill: i % 2 ? '#faf8f4' : C.card, stroke: C.line }));
    parts.push(box(50, y, 3, h, { fill: color, stroke: 'none', r: 1.5 }));
    parts.push(text(66, y + 20, l.label, { size: 12.5, anchor: 'start', weight: 600 }));
    parts.push(text(66, y + 37, (l.items ?? []).join(' · '), { size: 11, anchor: 'start', fill: C.ink3 }));
    y += h + 8;
  });
  return svg(W, y + 14, parts.join('\n'));
}

/* ---------------- 主流程 ---------------- */
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const specs = JSON.parse(fs.readFileSync(SPECS, 'utf8'));
  const written = [];

  for (const spec of specs) {
    let body;
    if (spec.type === 'arch') body = renderArch(spec);
    else if (spec.type === 'layer') body = renderLayer(spec);
    else body = renderFlow(spec);
    fs.writeFileSync(path.join(OUT, `${spec.id}.svg`), body, 'utf8');
    written.push(spec.id);
    for (const qid of spec.attachTo ?? []) attach(qid, `/diagrams/${spec.id}.svg`, spec.caption ?? spec.title ?? '');
  }

  // 自动：用题目自带 flow[] 生成链路图（没有手绘图或手绘未挂的也补上）
  const files = fs.readdirSync(QDIR).filter((f) => f.endsWith('.json'));
  const byId = new Map();
  for (const f of files) {
    const q = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
    byId.set(q.id, { file: f, q });
  }
  const handIds = new Set(specs.flatMap((s) => s.attachTo ?? []));
  let auto = 0;
  for (const [id, { q }] of byId) {
    if (handIds.has(id)) continue;
    const flow = q.flow ?? [];
    if (flow.length < 3) continue;
    const key = `auto-${id}`;
    const body = renderFlow({ title: '', steps: flow.map((t) => ({ t })) });
    fs.writeFileSync(path.join(OUT, `${key}.svg`), body, 'utf8');
    written.push(key);
    attach(id, `/diagrams/${key}.svg`, `${q.title} · 执行链路`);
    auto += 1;
  }

  console.log(`✓ 手绘 ${specs.length} 张，自动链路 ${auto} 张，共 ${written.length} 个 SVG`);
}

function attach(qid, src, caption) {
  const p = path.join(QDIR, `${qid}.json`);
  if (!fs.existsSync(p)) return;
  const q = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (q.diagram && q.diagram.src === src) return;
  q.diagram = { src, caption };
  fs.writeFileSync(p, JSON.stringify(q, null, 2) + '\n', 'utf8');
}

main();
