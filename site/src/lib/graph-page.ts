/**
 * 源码图谱页面的「装配层」：把画布（graph-canvas.ts）、左侧过滤器、右侧详情连起来。
 *
 * 为什么单独一层：层级页（一个服务层）和全图页（文件级聚合）用的是同一套交互，
 * 只有数据源和过滤器不同。页面只提供静态 DOM，这里负责取数、挂画布、绑事件。
 *
 * 数据来源：/data/graph/layer-*.json 或 /data/graph/overview.json
 * 由 scripts/gen-source-graph.mjs 生成。
 */
import { mountGraph } from './graph-canvas';
import type { GData, GEdge, GNode, GraphHandle } from './graph-canvas';

export type Anchor = { q: string; t: string; h: string; sym: string; line: number | null };

export type ShardData = GData & {
  nodes: (GNode & { d?: number; l?: string })[];
  edges: GEdge[];
  anchors?: Record<string, Anchor[]>;
  outX?: [string, string, string, string][];
  inX?: [string, string, string, string][];
  xn?: Record<string, [string, string, string]>;
  id?: string;
  name?: string;
  desc?: string;
};

export type BootOpts = {
  dataUrl: string;
  layerNames: Record<string, string>;
  layerColors: Record<string, string>;
  typeNames: Record<string, string>;
  /** 'layer' 只看单层；'whole' 看文件级全图（多一个层过滤） */
  mode: 'layer' | 'whole';
  initialFocus?: string;
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);
const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function bootGraphPage(opts: BootOpts) {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

  const canvasHost = $('g-canvas');
  const detailEl = $('g-detail');
  const statsEl = $('g-stats');
  const pathBar = $('g-pathbar');
  const pathText = $('g-path-text');
  const clearPathBtn = $('g-path-clear');
  const searchEl = $<HTMLInputElement>('g-search');
  const resetBtn = $('g-reset');
  const zoomIn = $('g-zoom-in');
  const zoomOut = $('g-zoom-out');
  const layoutBtn = $('g-layout');
  const layerBoxes = [...document.querySelectorAll<HTMLInputElement>('[data-filter-layer]')];
  const typeBoxes = [...document.querySelectorAll<HTMLInputElement>('[data-filter-type]')];
  const cmplxBoxes = [...document.querySelectorAll<HTMLInputElement>('[data-filter-cmplx]')];

  if (!canvasHost || !detailEl) return;

  let data: ShardData | null = null;
  let graph: GraphHandle | null = null;
  let selected = '';
  let query = '';
  let pathMode = false;
  let pathStart = '';
  let layout: 'force' | 'lanes' = 'force';

  const byKey = new Map<string, GNode>();
  const kids = new Map<string, GNode[]>();
  const edgeOut = new Map<string, [string, string][]>();
  const edgeIn = new Map<string, [string, string][]>();

  const layerOf = (k: string) => byKey.get(k)?.l || '';
  const layerName = (id: string) => opts.layerNames[id] || id;

  function index(d: ShardData) {
    byKey.clear();
    kids.clear();
    edgeOut.clear();
    edgeIn.clear();
    for (const n of d.nodes) byKey.set(n.k, n);
    for (const n of d.nodes) if (n.p && byKey.has(n.p)) {
      const arr = kids.get(n.p) ?? [];
      arr.push(n);
      kids.set(n.p, arr);
    }
    for (const [a, b, t] of d.edges) {
      if (!byKey.has(a) || !byKey.has(b)) continue;
      const o = edgeOut.get(a) ?? [];
      o.push([b, t]);
      edgeOut.set(a, o);
      const i = edgeIn.get(b) ?? [];
      i.push([a, t]);
      edgeIn.set(b, i);
    }
  }

  /** 过滤器：层 / 类型 / 复杂度 / 搜索词，四个条件同时生效 */
  function visibleFn(n: GNode) {
    if (opts.mode === 'whole' && layerBoxes.length) {
      const on = layerBoxes.filter((b) => b.checked).map((b) => b.dataset.filterLayer);
      if (on.length && !on.includes(n.l || '')) return false;
    }
    if (typeBoxes.length && !typeBoxes.some((b) => b.checked && b.dataset.filterType === n.t)) return false;
    if (cmplxBoxes.length && !cmplxBoxes.some((b) => b.checked && b.dataset.filterCmplx === n.c)) return false;
    if (query) {
      const hay = `${n.n} ${n.f} ${n.s} ${(n.g || []).join(' ')}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  }

  function applyFilters() {
    if (!graph) return;
    graph.setVisible(visibleFn);
    if (data) {
      const shown = data.nodes.filter(visibleFn).length;
      statsEl && (statsEl.textContent = `${shown} / ${data.nodes.length} 个节点`);
    }
  }

  function renderDetail(k: string) {
    if (!data) return;
    const n = byKey.get(k);
    if (!n) return;
    const anchors = data.anchors?.[k] ?? data.anchors?.[n.f] ?? [];
    const seenQ = new Set<string>();
    const uniqueAnchors = anchors.filter((a) => (seenQ.has(a.q) ? false : (seenQ.add(a.q), true)));

    const parent = n.p ? byKey.get(n.p) : null;
    const children = kids.get(k) ?? [];
    const out = (edgeOut.get(k) ?? []).slice(0, 40);
    const incoming = (edgeIn.get(k) ?? []).slice(0, 40);
    const crossOut = (data.outX ?? []).filter(([a]) => a === k);
    const crossIn = (data.inX ?? []).filter(([, , b]) => b === k);
    const xn = data.xn ?? {};

    const chip = (x: GNode | string, t: string, layer?: string) => {
      if (typeof x === 'string') {
        const info = xn[x];
        return `<a href="${esc(opts.mode === 'whole' ? `/project/source?focus=${x}` : `/project/source/${layer}?focus=${x}`)}" class="chip border border-line bg-paper text-ink2 hover:border-zhu/40 hover:text-zhu">${esc(layerName(layer || ''))} / ${esc(short(info ? info[0] : x, 18))} <span class="text-[10px] text-ink3">${esc(t)}</span></a>`;
      }
      return `<button type="button" data-jump="${x.k}" class="chip border border-line bg-paper text-ink2 hover:border-zhu/40 hover:text-zhu">${esc(short(x.n, 18))} <span class="text-[10px] text-ink3">${esc(t)}</span></button>`;
    };

    const relCount = out.length + incoming.length + children.length;
    detailEl.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-zhu">${esc(opts.typeNames[n.t] || n.t)} · ${esc(layerName(n.l || ''))}</p>
          <h2 class="title-cn mt-1 break-words text-[17px]">${esc(n.n)}</h2>
        </div>
        <button type="button" id="g-focus" class="shrink-0 text-[11px] text-zhu hover:underline">居中</button>
      </div>
      <p class="mt-1 break-all font-mono text-[10.5px] leading-relaxed text-ink3">${esc(n.f)}</p>
      <p class="mt-2 text-[12.5px] leading-relaxed text-ink2">${esc(n.s || '（没有摘要）')}</p>
      ${n.g?.length ? `<div class="mt-2 flex flex-wrap gap-1">${n.g.map((g) => `<span class="chip border border-line bg-surface2 text-[10.5px] text-ink3">${esc(g)}</span>`).join('')}</div>` : ''}
      ${n.a ? `<p class="mt-2 rounded-lg bg-paper px-2.5 py-2 text-[11.5px] leading-relaxed text-ink3">${esc(n.a)}</p>` : ''}
      <div class="mt-3 flex items-center gap-2 text-[11px] text-ink3">
        <span class="chip border border-line bg-surface2">复杂度 ${esc(n.c)}</span>
        <span>${relCount} 条关系</span>
      </div>
      ${uniqueAnchors.length ? `<div class="mt-3 border-t border-line pt-2"><p class="text-[10.5px] font-semibold uppercase tracking-wider text-ink3">相关面试题</p><div class="mt-1.5 flex flex-wrap gap-1">${uniqueAnchors.map((a) => `<a href="${esc(a.h)}" class="chip border border-zhu/40 bg-zhusoft/50 text-zhu hover:border-zhu">${esc(a.q)}</a>`).join('')}</div></div>` : ''}
      <div class="mt-3 border-t border-line pt-2">
        <p class="text-[10.5px] font-semibold uppercase tracking-wider text-ink3">依赖（出 ${out.length}）</p>
        <div class="mt-1.5 flex flex-wrap gap-1">${out.map(([b, t]) => chip(byKey.get(b)!, t)).join('') || '<span class="text-[11px] text-ink3">无</span>'}</div>
      </div>
      <div class="mt-2">
        <p class="text-[10.5px] font-semibold uppercase tracking-wider text-ink3">被依赖（入 ${incoming.length}${parent ? ' + 父' : ''}）</p>
        <div class="mt-1.5 flex flex-wrap gap-1">${parent ? chip(parent, 'contains') : ''}${children.map((x) => chip(x, 'contains')).join('')}${incoming.map(([a, t]) => chip(byKey.get(a)!, t)).join('') || ''}${!parent && !children.length && !incoming.length ? '<span class="text-[11px] text-ink3">无</span>' : ''}</div>
      </div>
      ${crossOut.length || crossIn.length ? `<div class="mt-2"><p class="text-[10.5px] font-semibold uppercase tracking-wider text-ink3">跨层</p><div class="mt-1.5 flex flex-wrap gap-1">${crossOut.map(([, b, l, t]) => chip(b, t, l)).join('')}${crossIn.map(([a, l, , t]) => chip(a, t, l)).join('')}</div></div>` : ''}
      ${pathStart && pathStart !== k ? `<button type="button" id="g-end-path" class="mt-3 w-full rounded-lg border border-zhu/40 bg-zhusoft/50 px-2 py-1.5 text-[11.5px] font-semibold text-zhu hover:border-zhu">设为终点：与「${esc(short(byKey.get(pathStart)?.n || '', 14))}」连线</button>` : ''}
      <button type="button" id="g-start-path" class="mt-2 w-full rounded-lg border border-qing/40 bg-qingsoft/50 px-2 py-1.5 text-[11.5px] font-semibold text-qing hover:border-qing">从这里找路径</button>
    `;

    detailEl.querySelectorAll<HTMLElement>('[data-jump]').forEach((el) => {
      el.addEventListener('click', () => graph?.select(el.dataset.jump!));
    });
    detailEl.querySelector('#g-focus')?.addEventListener('click', () => graph?.focusNode(k));
    detailEl.querySelector('#g-start-path')?.addEventListener('click', () => {
      pathStart = k;
      setPathMode(true);
      pathText && (pathText.textContent = `起点：${n.n} —— 画布上点另一个节点，或在本面板点「设为终点」`);
      // 重渲染一次，让「设为终点」按钮出现在这个节点的面板里
      renderDetail(k);
    });
    detailEl.querySelector('#g-end-path')?.addEventListener('click', () => {
      if (!pathStart) return;
      graph?.findPath(pathStart, k);
    });
  }

  function setPathMode(on: boolean) {
    pathMode = on;
    if (!on) pathStart = '';
    pathBar?.classList.toggle('hidden', !on);
    graph?.clearPath();
  }

  function boot(d: ShardData) {
    data = d;
    index(d);
    graph = mountGraph(canvasHost!, { nodes: d.nodes, edges: d.edges }, {
      layerNames: opts.layerNames,
      layerColors: opts.layerColors,
      typeNames: opts.typeNames,
      initialFocus: opts.initialFocus,
      onSelect: (k, node) => {
        selected = k;
        if (!node) {
          detailEl.innerHTML = '<p class="text-[12px] text-ink3">点画布上的节点看详情；滚轮缩放，拖拽平移，Esc 取消。</p>';
          return;
        }
        if (pathMode && pathStart && pathStart !== k) {
          // 在「找路径」模式下点第二个节点 = 选终点；路径结果由 onPath 回调写文案
          graph?.findPath(pathStart, k);
        }
        renderDetail(k);
      },
      onPath: (keys) => {
        if (!keys) return;
        pathText && (pathText.textContent = `路径 ${keys.length} 个节点：${keys.map((k) => short(byKey.get(k)?.n || k, 16)).join(' → ')}`);
      }
    });
    applyFilters();
    // 初始选中：URL 带了 focus 就用它；没带或失效就用「依赖最多」的枢纽节点兜底，
    // 否则右侧永远是空白提示，用户不知道从哪开始。
    const wanted = opts.initialFocus && byKey.has(opts.initialFocus) ? opts.initialFocus : '';
    const fallback = wanted ? '' : [...d.nodes].sort((a, b) => (b.d ?? 0) - (a.d ?? 0))[0]?.k ?? '';
    const first = wanted || fallback;
    if (first) {
      graph.select(first);
      renderDetail(first);
    }
  }

  searchEl?.addEventListener('input', () => {
    query = searchEl.value.trim().toLowerCase();
    applyFilters();
  });
  [...layerBoxes, ...typeBoxes, ...cmplxBoxes].forEach((b) => b.addEventListener('change', applyFilters));
  resetBtn?.addEventListener('click', () => {
    graph?.resetView();
    setPathMode(false);
  });
  zoomIn?.addEventListener('click', () => graph?.zoomBy(1.3));
  zoomOut?.addEventListener('click', () => graph?.zoomBy(1 / 1.3));
  layoutBtn?.addEventListener('click', () => {
    layout = layout === 'force' ? 'lanes' : 'force';
    graph?.setLayout(layout);
    layoutBtn.textContent = layout === 'force' ? '切换：分层泳道' : '切换：力导向';
  });
  clearPathBtn?.addEventListener('click', () => {
    setPathMode(false);
    if (pathText) pathText.textContent = '';
  });

  fetch(opts.dataUrl)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
    .then((d: ShardData) => boot(d))
    .catch((err) => {
      if (statsEl) statsEl.textContent = '数据加载失败';
      canvasHost.innerHTML = `<p class="p-6 text-[12px] text-ink3">图谱数据加载失败：${esc(err.message)}</p>`;
    });
}
