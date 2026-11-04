/**
 * 源码图谱画布：零依赖的 SVG 节点-连线图（平移 / 缩放 / 选中高亮 / 过滤 / 找路径 / 悬浮提示）。
 *
 * 被谁用：src/lib/graph-page.ts（层级页 /project/source/[layer] 与全图页 /project/source/graph）。
 * 数据从哪来：site/public/data/graph/{layer-*.json, overview.json}，由 scripts/gen-source-graph.mjs 生成。
 *
 * 为什么自己写而不引第三方：站里已有的图组件（ModuleGraph/TopicGraph）都是静态 SVG，
 * 引 @xyflow 或 d3 会给一个纯静态站加 100KB+ 依赖；这里只需要「分层聚类 + 受力 +
 * 平移缩放 + 高亮」，300 个节点用朴素 O(n²) 力导向就够（实测 320 次迭代 ~100ms）。
 *
 * 视觉层次（从上到下）：
 *   点阵底纹 → 泳道分隔线 → 边（曲线 + 箭头，按类型用虚实区分）→ 节点（大命中圆 + 圆点 + 文字光晕）
 * 边的类型差异只靠线型（实线/虚线/点线）而不是颜色，避免 292 条边变成调色盘。
 */

export type GNode = {
  k: string;
  t: string;
  n: string;
  f: string;
  s: string;
  g: string[];
  c: string;
  a: string;
  p: string;
  l: string;
  d?: number;
};

export type GEdge = [string, string, string, number];

export type GData = { nodes: GNode[]; edges: GEdge[] };

export type MountOpts = {
  layerNames: Record<string, string>;
  layerColors: Record<string, string>;
  typeNames: Record<string, string>;
  /** 单层页按「节点类型」上色更有信息量（6 种），全图页按「服务层」上色（9 种） */
  colorMode?: 'layer' | 'type';
  typeColors?: Record<string, string>;
  initialFocus?: string;
  onSelect?: (k: string, node: GNode | null) => void;
  onPath?: (keys: string[] | null) => void;
};

export type GraphHandle = {
  select(k: string): void;
  focusNode(k: string): void;
  setVisible(fn: (n: GNode) => boolean): void;
  setLayout(mode: 'force' | 'lanes'): void;
  findPath(fromK: string, toK: string): boolean;
  clearPath(): void;
  getSelected(): string | null;
  zoomBy(factor: number): void;
  resetView(): void;
  destroy(): void;
};

type Pos = { x: number; y: number };

const WORLD_W = 1600;
const WORLD_H = 1100;
const MAX_ITER = 320;

/** 边类型 → 线型：结构关系点线、契约关系虚线、代码依赖实线 */
const DASH: Record<string, string> = {
  contains: '1 4',
  depends_on: '2 4',
  related: '2 4',
  configures: '2 4',
  inherits: '6 4',
  implements: '6 4'
};

export function mountGraph(host: HTMLElement, data: GData, opts: MountOpts): GraphHandle {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // 数据体检：悬空边、重复 key 在脏数据里很常见，直接过滤掉，否则后面画到 NaN
  const nodes = (data?.nodes ?? []).filter((n) => n && n.k);
  const seen = new Set<string>();
  const nodeList: GNode[] = [];
  for (const n of nodes) {
    if (seen.has(n.k)) continue;
    seen.add(n.k);
    nodeList.push(n);
  }
  const byKey = new Map(nodeList.map((n) => [n.k, n]));

  const edges = (data?.edges ?? []).filter((e) => e && byKey.has(e[0]) && byKey.has(e[1]) && e[0] !== e[1]);

  const deg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    deg.set(a, (deg.get(a) ?? 0) + 1);
    deg.set(b, (deg.get(b) ?? 0) + 1);
    const la = adj.get(a) ?? [];
    la.push(b);
    adj.set(a, la);
    const lb = adj.get(b) ?? [];
    lb.push(a);
    adj.set(b, lb);
  }

  const radius = (k: string) => Math.min(11, 5 + Math.log2(1 + (deg.get(k) ?? 0)));
  /** 节点颜色：单层页按类型，全图页按服务层 */
  const nodeColor = (n: GNode) =>
    (opts.colorMode === 'type' ? opts.typeColors?.[n.t] : opts.layerColors[n.l]) || opts.layerColors[n.l] || 'var(--c-ink-3)';

  // ---- SVG 骨架 ----
  host.innerHTML = '';
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';
  svg.style.touchAction = 'none';
  svg.style.cursor = 'grab';
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '源码依赖图：可缩放、可点选');

  // 点阵底纹 + 三种箭头标记（默认 / 选中 / 路径）。markerUnits=userSpaceOnUse 避免线一粗箭头就变大
  const defs = document.createElementNS(SVG_NS, 'defs');
  defs.innerHTML = `
    <pattern id="g-dots" width="46" height="46" patternUnits="userSpaceOnUse">
      <circle cx="1.6" cy="1.6" r="1.6" fill="var(--c-line)" opacity="0.75"></circle>
    </pattern>
    <marker id="g-ar" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6" markerHeight="6" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--c-ink-3)" opacity="0.45"></path>
    </marker>
    <marker id="g-ar-hot" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--c-zhu)"></path>
    </marker>
    <marker id="g-ar-path" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--c-qing)"></path>
    </marker>`;
  svg.appendChild(defs);

  const viewport = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(viewport);
  host.appendChild(svg);

  const bgRect = document.createElementNS(SVG_NS, 'rect');
  bgRect.setAttribute('x', String(-WORLD_W));
  bgRect.setAttribute('y', String(-WORLD_H));
  bgRect.setAttribute('width', String(WORLD_W * 3));
  bgRect.setAttribute('height', String(WORLD_H * 3));
  bgRect.setAttribute('fill', 'url(#g-dots)');
  // 底纹只负责好看，绝不吃事件（否则点空白处命中 rect，判断「点没点到节点」会失真）
  bgRect.style.pointerEvents = 'none';
  viewport.appendChild(bgRect);

  const gLanes = document.createElementNS(SVG_NS, 'g');
  const gEdges = document.createElementNS(SVG_NS, 'g');
  const gNodes = document.createElementNS(SVG_NS, 'g');
  viewport.appendChild(gLanes);
  viewport.appendChild(gEdges);
  viewport.appendChild(gNodes);

  const pos = new Map<string, Pos>();
  const circleEl = new Map<string, SVGCircleElement>();
  const textEl = new Map<string, SVGTextElement>();
  const hitEl = new Map<string, SVGCircleElement>();

  // 选中光环：只做一个元素，选中谁就挪到谁身上（比给每个节点加一圈描边省 DOM）
  const halo = document.createElementNS(SVG_NS, 'circle');
  halo.setAttribute('fill', 'none');
  halo.setAttribute('stroke', 'var(--c-zhu)');
  halo.setAttribute('stroke-width', '1.6');
  halo.setAttribute('stroke-dasharray', '3 3');
  halo.style.display = 'none';
  halo.style.pointerEvents = 'none';
  gNodes.appendChild(halo);

  // ---- 边 ----
  const edgeEls: { a: string; b: string; el: SVGPathElement; type: string; i: number }[] = [];
  for (let i = 0; i < edges.length; i++) {
    const [a, b, type] = edges[i];
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'var(--c-line)');
    p.setAttribute('stroke-width', '1');
    p.setAttribute('stroke-linecap', 'round');
    if (DASH[type]) p.setAttribute('stroke-dasharray', DASH[type]);
    // contains 是「文件包含类」的从属关系，画箭头只会更乱
    if (type !== 'contains') p.setAttribute('marker-end', 'url(#g-ar)');
    gEdges.appendChild(p);
    edgeEls.push({ a, b, el: p, type, i });
  }

  // ---- 节点 ----
  for (const n of nodeList) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.dataset.k = n.k;
    g.style.cursor = 'pointer';

    const hit = document.createElementNS(SVG_NS, 'circle');
    hit.setAttribute('r', String(radius(n.k) + 8));
    hit.setAttribute('fill', 'transparent');
    hit.setAttribute('stroke', 'none');
    g.appendChild(hit);
    hitEl.set(n.k, hit);

    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('r', String(radius(n.k)));
    c.setAttribute('fill', nodeColor(n));
    c.setAttribute('stroke', 'var(--c-bg)');
    c.setAttribute('stroke-width', '1.2');
    g.appendChild(c);
    circleEl.set(n.k, c);

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('font-size', '11');
    t.setAttribute('fill', 'var(--c-ink-3)');
    t.setAttribute('text-anchor', 'middle');
    // 文字光晕：压在边/点上也能读清
    t.style.stroke = 'var(--c-bg)';
    t.style.strokeWidth = '3px';
    t.style.paintOrder = 'stroke';
    t.style.strokeLinejoin = 'round';
    t.textContent = n.n.length > 14 ? n.n.slice(0, 13) + '…' : n.n;
    t.style.pointerEvents = 'none';
    g.appendChild(t);
    textEl.set(n.k, t);

    gNodes.appendChild(g);
  }

  // 悬浮提示：跟着鼠标走，不拦截事件
  const tip = document.createElement('div');
  tip.style.cssText =
    'position:absolute;pointer-events:none;z-index:20;max-width:240px;padding:5px 8px;border-radius:8px;' +
    'border:1px solid var(--c-line);background:var(--c-surface);color:var(--c-ink);font-size:11.5px;line-height:1.5;' +
    'box-shadow:0 4px 14px rgb(0 0 0 / 0.08);opacity:0;transition:opacity .12s';
  host.appendChild(tip);

  // ---- 布局 ----
  let layoutMode: 'force' | 'lanes' = 'force';
  let simHandle = 0;

  function layerIds(): string[] {
    const ids: string[] = [];
    for (const n of nodeList) if (n.l && !ids.includes(n.l)) ids.push(n.l);
    return ids.sort((a, b) => a.localeCompare(b));
  }

  function clusterCenters(): Map<string, Pos> {
    const ids = layerIds();
    const map = new Map<string, Pos>();
    const R = Math.min(WORLD_W, WORLD_H) * 0.33;
    ids.forEach((id, i) => {
      const ang = (Math.PI * 2 * i) / Math.max(ids.length, 1) - Math.PI / 2;
      map.set(id, { x: WORLD_W / 2 + Math.cos(ang) * R, y: WORLD_H / 2 + Math.sin(ang) * R });
    });
    return map;
  }

  function layoutForce() {
    const centers = clusterCenters();
    pos.clear();
    let seed = 1;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (const n of nodeList) {
      const c0 = centers.get(n.l) ?? { x: WORLD_W / 2, y: WORLD_H / 2 };
      pos.set(n.k, { x: c0.x + (rnd() - 0.5) * 150, y: c0.y + (rnd() - 0.5) * 150 });
    }

    const idx = nodeList.map((n) => n.k);
    const kRep = 9000;
    const kSpring = 0.018;
    const kCenter = 0.012;
    const damp = 0.86;
    const vel = new Map<string, Pos>(idx.map((k) => [k, { x: 0, y: 0 }]));

    const step = () => {
      for (let i = 0; i < idx.length; i++) {
        const a = idx[i];
        const pa = pos.get(a)!;
        for (let j = i + 1; j < idx.length; j++) {
          const b = idx[j];
          const pb = pos.get(b)!;
          let dx = pa.x - pb.x;
          let dy = pa.y - pb.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = (i % 2 === 0 ? 1 : -1) * 0.6;
            dy = 0.6;
            d2 = 1;
          }
          const f = kRep / d2;
          const d = Math.sqrt(d2);
          const va = vel.get(a)!;
          const vb = vel.get(b)!;
          va.x += (dx / d) * f;
          va.y += (dy / d) * f;
          vb.x -= (dx / d) * f;
          vb.y -= (dy / d) * f;
        }
      }
      for (const [a, b, , w] of edges) {
        const pa = pos.get(a)!;
        const pb = pos.get(b)!;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const f = kSpring * (0.5 + w);
        const va = vel.get(a)!;
        const vb = vel.get(b)!;
        va.x += dx * f;
        va.y += dy * f;
        vb.x -= dx * f;
        vb.y -= dy * f;
      }
      for (const n of nodeList) {
        const c0 = centers.get(n.l);
        if (!c0) continue;
        const p = pos.get(n.k)!;
        const v = vel.get(n.k)!;
        v.x += (c0.x - p.x) * kCenter;
        v.y += (c0.y - p.y) * kCenter;
      }
      for (const k of idx) {
        const p = pos.get(k)!;
        const v = vel.get(k)!;
        v.x *= damp;
        v.y *= damp;
        p.x = Math.max(20, Math.min(WORLD_W - 20, p.x + v.x));
        p.y = Math.max(20, Math.min(WORLD_H - 20, p.y + v.y));
      }
    };

    // 布局期间节点还在飞，外部（自动化测试、首屏骨架）需要知道「什么时候可以点」
    delete host.dataset.ready;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) {
      for (let i = 0; i < 150; i++) step();
      syncPositions();
      fitView();
      host.dataset.ready = '1';
      return;
    }
    let iter = 0;
    const tick = () => {
      step();
      iter++;
      syncPositions();
      if (iter < MAX_ITER) simHandle = requestAnimationFrame(tick);
      else {
        syncPositions();
        fitView();
        host.dataset.ready = '1';
      }
    };
    simHandle = requestAnimationFrame(tick);
  }

  /** 泳道分行：多层（全图）按层；单层（层级页）按节点类型，否则整页只有一行 */
  function laneGroups(): { label: string; nodes: GNode[] }[] {
    const layers = layerIds();
    if (layers.length > 1) {
      return layers.map((id) => ({ label: opts.layerNames[id] || id, nodes: nodeList.filter((n) => n.l === id) }));
    }
    const types: string[] = [];
    for (const n of nodeList) if (!types.includes(n.t)) types.push(n.t);
    return types.map((t) => ({ label: opts.typeNames[t] || t, nodes: nodeList.filter((n) => n.t === t) }));
  }

  function layoutLanes() {
    const groups = laneGroups();
    pos.clear();
    gLanes.innerHTML = '';
    const rowH = WORLD_H / Math.max(groups.length, 1);
    groups.forEach((group, row) => {
      const mine = group.nodes.slice().sort((a, b) => (deg.get(b.k) ?? 0) - (deg.get(a.k) ?? 0));
      const pad = 170;
      const usable = WORLD_W - pad * 2;
      mine.forEach((n, i) => {
        const x = pad + (usable * (i + 0.5)) / Math.max(mine.length, 1);
        const y = rowH * row + rowH / 2;
        pos.set(n.k, { x, y });
      });

      const label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('x', '120');
      label.setAttribute('y', String(rowH * row + rowH / 2 - 8));
      label.setAttribute('font-size', '13');
      label.setAttribute('font-weight', '600');
      label.setAttribute('fill', 'var(--c-ink-3)');
      label.setAttribute('text-anchor', 'end');
      label.style.stroke = 'var(--c-bg)';
      label.style.strokeWidth = '3px';
      label.style.paintOrder = 'stroke';
      label.textContent = group.label;
      gLanes.appendChild(label);

      if (row > 0) {
        const sep = document.createElementNS(SVG_NS, 'line');
        sep.setAttribute('x1', '40');
        sep.setAttribute('x2', String(WORLD_W - 40));
        sep.setAttribute('y1', String(rowH * row));
        sep.setAttribute('y2', String(rowH * row));
        sep.setAttribute('stroke', 'var(--c-line)');
        sep.setAttribute('stroke-dasharray', '4 6');
        sep.setAttribute('opacity', '0.9');
        gLanes.appendChild(sep);
      }
    });
    syncPositions();
    fitView();
    host.dataset.ready = '1';
  }

  /** 边的终点要缩到目标圆的边缘：否则箭头被圆盖住，看起来像没有箭头 */
  function syncPositions() {
    for (const [k, p] of pos) {
      const c = circleEl.get(k);
      if (c) {
        c.setAttribute('cx', String(p.x));
        c.setAttribute('cy', String(p.y));
      }
      const hit = hitEl.get(k);
      if (hit) {
        hit.setAttribute('cx', String(p.x));
        hit.setAttribute('cy', String(p.y));
      }
      const t = textEl.get(k);
      if (t) {
        t.setAttribute('x', String(p.x));
        t.setAttribute('y', String(p.y + radius(k) + 12));
      }
    }
    for (const e of edgeEls) {
      const pa = pos.get(e.a);
      const pb = pos.get(e.b);
      if (!pa || !pb) continue;
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const len = Math.hypot(dx, dy) || 1;
      // 轻微弧线：成对的 A→B / B→A 不会完全重叠
      const curve = Math.min(30, len * 0.06) * (e.i % 2 === 0 ? 1 : -1);
      const mx = (pa.x + pb.x) / 2 - (dy / len) * curve;
      const my = (pa.y + pb.y) / 2 + (dx / len) * curve;
      const shrink = radius(e.b) + 3;
      const ex = pb.x - (dx / len) * shrink;
      const ey = pb.y - (dy / len) * shrink;
      e.el.setAttribute('d', `M${pa.x.toFixed(1)},${pa.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`);
    }
    refreshLabels();
  }

  // ---- 视图变换 ----
  let tx = 0;
  let ty = 0;
  let scale = 1;
  const applyView = () => {
    viewport.setAttribute('transform', `translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${scale.toFixed(4)})`);
    // 底纹跟着缩放会变得稀/密：缩太小时降一点浓度，避免满屏麻点
    bgRect.setAttribute('opacity', scale < 0.5 ? '0.55' : '1');
    refreshLabels();
  };

  function size() {
    const r = host.getBoundingClientRect();
    return { w: Math.max(200, r.width), h: Math.max(200, r.height) };
  }

  function fitView() {
    const { w, h } = size();
    if (!pos.size) {
      tx = 0;
      ty = 0;
      scale = 1;
      applyView();
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pos.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    scale = Math.min(w / (bw + 64), h / (bh + 64), 2);
    tx = w / 2 - ((minX + maxX) / 2) * scale;
    ty = h / 2 - ((minY + maxY) / 2) * scale;
    applyView();
  }

  // ---- 选中 / 悬浮 / 路径 ----
  let selected: string | null = null;
  let hovered: string | null = null;
  let pathKeys: string[] | null = null;

  function refreshLabels() {
    const showAll = scale > 0.9;
    const hot = new Set<string>();
    if (selected) {
      hot.add(selected);
      for (const nb of adj.get(selected) ?? []) hot.add(nb);
    }
    if (hovered) hot.add(hovered);
    if (pathKeys) for (const k of pathKeys) hot.add(k);
    for (const [k, t] of textEl) {
      // 度 ≥12 的枢纽一直显示名字，否则首屏缩到 0.4 时一个字都看不到
      const visible = showAll || hot.has(k) || (deg.get(k) ?? 0) >= 12;
      t.style.display = visible ? '' : 'none';
      t.setAttribute('font-size', k === selected || k === hovered ? '12' : '11');
      t.setAttribute('fill', k === selected ? 'var(--c-ink)' : 'var(--c-ink-3)');
    }
  }

  function paintSelection() {
    const hot = new Set<string>();
    if (selected) {
      hot.add(selected);
      for (const nb of adj.get(selected) ?? []) hot.add(nb);
    }
    for (const [k, c] of circleEl) {
      const dim = selected ? !hot.has(k) : false;
      c.style.opacity = dim ? '0.22' : '';
      const big = k === selected || k === hovered;
      c.setAttribute('r', String(radius(k) + (big ? 1.6 : 0)));
      c.setAttribute('stroke-width', k === selected ? '2' : '1.2');
      c.setAttribute('stroke', k === selected ? 'var(--c-ink)' : 'var(--c-bg)');
    }
    // 选中光环
    if (selected && pos.get(selected)) {
      const p = pos.get(selected)!;
      halo.setAttribute('cx', String(p.x));
      halo.setAttribute('cy', String(p.y));
      halo.setAttribute('r', String(radius(selected) + 6));
      halo.style.display = '';
    } else halo.style.display = 'none';

    for (const e of edgeEls) {
      const on = selected ? e.a === selected || e.b === selected : false;
      e.el.setAttribute('stroke', on ? 'var(--c-zhu)' : 'var(--c-line)');
      e.el.setAttribute('stroke-width', on ? '1.8' : '1');
      e.el.style.opacity = selected && !on ? '0.18' : '';
      if (e.type !== 'contains') e.el.setAttribute('marker-end', on ? 'url(#g-ar-hot)' : 'url(#g-ar)');
    }

    if (pathKeys) {
      for (let i = 0; i < pathKeys.length - 1; i++) {
        const a = pathKeys[i];
        const b = pathKeys[i + 1];
        for (const e of edgeEls) {
          if ((e.a === a && e.b === b) || (e.a === b && e.b === a)) {
            e.el.setAttribute('stroke', 'var(--c-qing)');
            e.el.setAttribute('stroke-width', '2.4');
            e.el.setAttribute('stroke-dasharray', 'none');
            e.el.style.opacity = '';
            if (e.type !== 'contains') e.el.setAttribute('marker-end', 'url(#g-ar-path)');
          }
        }
      }
      for (const k of pathKeys) {
        const c = circleEl.get(k);
        if (c) {
          c.setAttribute('stroke', 'var(--c-qing)');
          c.setAttribute('stroke-width', '2.2');
          c.style.opacity = '';
        }
      }
    }
    refreshLabels();
  }

  /**
   * 选中（幂等）：传 '' 表示清空。
   * 「再点一次取消选中」的逻辑放在 pointerup 里判断——否则页面初始化时
   * mountGraph 先选中 initialFocus、装配层再 select 一次，就会把自己取消掉。
   */
  function select(k: string) {
    const next = k || null;
    selected = next;
    if (!next) pathKeys = null;
    paintSelection();
    opts.onSelect?.(next ?? '', next ? byKey.get(next) ?? null : null);
  }

  function focusNode(k: string) {
    const p = pos.get(k);
    if (!p) return;
    const { w, h } = size();
    scale = 1.8;
    tx = w / 2 - p.x * scale;
    ty = h / 2 - p.y * scale;
    applyView();
  }

  // ---- 过滤 ----
  function setVisible(fn: (n: GNode) => boolean) {
    const ok = new Set<string>();
    for (const n of nodeList) if (fn(n)) ok.add(n.k);
    for (const [k, c] of circleEl) {
      const vis = ok.has(k);
      c.style.opacity = vis ? '' : '0.08';
      c.style.pointerEvents = vis ? '' : 'none';
      const hit = hitEl.get(k);
      if (hit) hit.style.pointerEvents = vis ? '' : 'none';
      const t = textEl.get(k);
      if (t) t.style.opacity = vis ? '' : '0.05';
    }
    for (const e of edgeEls) {
      const vis = ok.has(e.a) && ok.has(e.b);
      e.el.style.display = vis ? '' : 'none';
    }
    if (selected && !ok.has(selected)) {
      selected = null;
      paintSelection();
      opts.onSelect?.('', null);
    }
    if (hovered && !ok.has(hovered)) {
      hovered = null;
      hideTip();
    }
    refreshLabels();
  }

  // ---- 路径（BFS，忽略方向：依赖链在反问时两个方向都有意义）----
  function findPath(fromK: string, toK: string): boolean {
    pathKeys = null;
    if (!byKey.has(fromK) || !byKey.has(toK)) {
      opts.onPath?.(null);
      return false;
    }
    if (fromK === toK) {
      pathKeys = [fromK];
      paintSelection();
      opts.onPath?.([fromK]);
      return true;
    }
    const prev = new Map<string, string | null>([[fromK, null]]);
    const queue: string[] = [fromK];
    while (queue.length) {
      const cur = queue.shift()!;
      for (const nb of adj.get(cur) ?? []) {
        if (prev.has(nb)) continue;
        prev.set(nb, cur);
        if (nb === toK) {
          const keys: string[] = [toK];
          let p: string | null = cur;
          while (p) {
            keys.unshift(p);
            p = prev.get(p) ?? null;
          }
          pathKeys = keys;
          paintSelection();
          opts.onPath?.(keys);
          return true;
        }
        queue.push(nb);
      }
    }
    paintSelection();
    opts.onPath?.(null);
    return false;
  }

  function clearPath() {
    pathKeys = null;
    paintSelection();
  }

  // ---- 悬浮提示 ----
  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);

  function showTip(k: string, cx: number, cy: number) {
    const n = byKey.get(k);
    if (!n) return;
    const rect = host.getBoundingClientRect();
    tip.innerHTML =
      '<b style="font-weight:600">' +
      escapeHtml(n.n) +
      '</b><br><span style="color:var(--c-ink-3)">' +
      escapeHtml(opts.typeNames[n.t] || n.t) +
      ' · ' +
      (deg.get(k) ?? 0) +
      ' 条关系</span>';
    tip.style.opacity = '1';
    const x = Math.max(8, Math.min(rect.width - 250, cx - rect.left + 14));
    const y = Math.max(8, Math.min(rect.height - 60, cy - rect.top + 14));
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() {
    tip.style.opacity = '0';
  }

  // ---- 事件 ----
  let dragging = false;
  let dragNode: string | null = null;
  let lastX = 0;
  let lastY = 0;
  let moved = 0;
  // 关键：按下时就要记住点到了哪个节点。
  // 因为 setPointerCapture 之后，pointerup 的 target 会被重定向到 <svg>，
  // 靠 pointerup 的 target 判断「点了谁」永远拿不到 circle。
  let downKey: string | null = null;

  /** 现算指针下的节点：ev.target 会被 pointer capture / 合成事件重定向到 <svg> */
  const hitKey = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y) as Element | null;
    const hitEl2 = el?.closest?.('[data-k]') as SVGElement | null;
    const k = hitEl2?.dataset?.k ?? null;
    return k && byKey.has(k) ? k : null;
  };

  const onWheel = (ev: WheelEvent) => {
    ev.preventDefault();
    const rect = host.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const factor = Math.exp(-ev.deltaY * 0.0015);
    const next = Math.max(0.25, Math.min(3, scale * factor));
    tx = px - ((px - tx) * next) / scale;
    ty = py - ((py - ty) * next) / scale;
    scale = next;
    applyView();
  };

  const onPointerDown = (ev: PointerEvent) => {
    const target = ev.target as Element;
    const fromTarget = target instanceof SVGElement ? (target as SVGElement).dataset?.k : undefined;
    const k = fromTarget ?? hitKey(ev.clientX, ev.clientY) ?? undefined;
    dragging = true;
    moved = 0;
    lastX = ev.clientX;
    lastY = ev.clientY;
    downKey = k ?? null;
    if (k && nodeList.length <= 60) dragNode = k;
    try {
      svg.setPointerCapture(ev.pointerId);
    } catch {
      // 合成事件（测试/程序触发）的 pointerId 不是活动指针，捕获会抛 InvalidPointerId
    }
    svg.style.cursor = 'grabbing';
    hideTip();
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!dragging) {
      const k = hitKey(ev.clientX, ev.clientY);
      if (k !== hovered) {
        hovered = k;
        paintSelection();
      }
      if (k) showTip(k, ev.clientX, ev.clientY);
      else hideTip();
      return;
    }
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (dragNode) {
      const p = pos.get(dragNode);
      if (p) {
        p.x += dx / scale;
        p.y += dy / scale;
        syncPositions();
        paintSelection();
      }
      return;
    }
    tx += dx;
    ty += dy;
    applyView();
  };

  const onPointerUp = (ev: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    dragNode = null;
    svg.style.cursor = 'grab';
    try {
      svg.releasePointerCapture(ev.pointerId);
    } catch {}
    if (moved < 4) {
      const k = downKey ?? hitKey(ev.clientX, ev.clientY);
      downKey = null;
      // 点同一个节点 = 取消选中（只有真实点击才切换，程序调用 select 不会）
      if (k) select(selected === k ? '' : k);
      else {
        selected = null;
        pathKeys = null;
        paintSelection();
        opts.onSelect?.('', null);
      }
    } else downKey = null;
  };

  const onDblClick = (ev: MouseEvent) => {
    const el = ev.target as SVGElement;
    const k = el?.dataset?.k;
    if (k) focusNode(k);
    else resetView();
  };

  const onLeave = () => {
    hovered = null;
    hideTip();
    paintSelection();
  };

  function resetView() {
    selected = null;
    pathKeys = null;
    paintSelection();
    opts.onSelect?.('', null);
    fitView();
  }

  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      selected = null;
      pathKeys = null;
      paintSelection();
      opts.onSelect?.('', null);
    }
  };

  svg.addEventListener('wheel', onWheel, { passive: false });
  svg.addEventListener('pointerdown', onPointerDown);
  svg.addEventListener('pointermove', onPointerMove);
  svg.addEventListener('pointerup', onPointerUp);
  svg.addEventListener('pointercancel', onPointerUp);
  svg.addEventListener('pointerleave', onLeave);
  svg.addEventListener('dblclick', onDblClick);
  window.addEventListener('keydown', onKey);

  const ro = new ResizeObserver(() => {
    if (pos.size) fitView();
  });
  ro.observe(host);

  function zoomBy(factor: number) {
    const { w, h } = size();
    const next = Math.max(0.25, Math.min(3, scale * factor));
    tx = w / 2 - ((w / 2 - tx) * next) / scale;
    ty = h / 2 - ((h / 2 - ty) * next) / scale;
    scale = next;
    applyView();
  }

  // ---- 启动 ----
  layoutForce();
  if (opts.initialFocus && byKey.has(opts.initialFocus)) {
    select(opts.initialFocus);
    focusNode(opts.initialFocus);
  }

  return {
    select,
    focusNode,
    setVisible,
    setLayout(mode) {
      if (mode === layoutMode) return;
      layoutMode = mode;
      delete host.dataset.ready;
      if (simHandle) cancelAnimationFrame(simHandle);
      if (mode === 'force') layoutForce();
      else layoutLanes();
      paintSelection();
    },
    findPath,
    clearPath,
    getSelected: () => selected,
    zoomBy,
    resetView,
    destroy() {
      if (simHandle) cancelAnimationFrame(simHandle);
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
      svg.removeEventListener('wheel', onWheel);
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerUp);
      svg.removeEventListener('pointercancel', onPointerUp);
      svg.removeEventListener('pointerleave', onLeave);
      svg.removeEventListener('dblclick', onDblClick);
      host.innerHTML = '';
    }
  };
}
