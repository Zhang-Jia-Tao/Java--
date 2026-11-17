/**
 * mindmap.ts — 横向镜像思维导图的布局算法（纯函数，无 DOM 依赖）
 *
 * 为什么自己算而不用库：
 *  - 只有「根 → 章节 → 题目」三层，类型固定，算起来就是两列堆叠，没必要拉一个 d3 进来；
 *  - 章节可以折叠，布局要能按当前展开状态重算，纯函数最好测也最好在浏览器里重跑；
 *  - 视觉上要「左一半、右一半」的经典 mindmap 形态，节点数 58 摊在一侧会太长。
 *
 * 坐标系：单位 px，原点在画布左上角；节点 (x, y) 是**中心点**。
 */

export type MMNode = {
  id: string;
  label: string;
  sub?: string;
  /** 题目评分，章节节点没有 */
  score?: number;
  /** 点击跳转（章节 → 章节页，题目 → 题目页） */
  href?: string;
  /** 悬停时在底部提示行显示的一句话 */
  summary?: string;
  /** 叶子右侧的灰色小字（Hot200 的 LC 号、项目题的星数），没有评分时用 */
  meta?: string;
  /** 叶子右上角的小角标（待写 / 未评） */
  badge?: string;
  children?: MMNode[];
};

export type MMPlaced = {
  id: string;
  label: string;
  sub: string;
  score: number | null;
  href: string;
  summary: string;
  kind: 'root' | 'branch' | 'leaf';
  /** 左 -1 / 右 1 / 根 0 */
  side: -1 | 0 | 1;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 父节点 id，根为空串 */
  parent: string;
  /** 折叠时被隐藏的叶子数（只有章节节点有） */
  hidden: number;
  collapsed: boolean;
  meta: string;
  badge: string;
};

export type MMEdge = {
  id: string;
  from: string;
  to: string;
  side: -1 | 0 | 1;
  /** SVG path 的 d */
  d: string;
};

export type MMLayout = {
  width: number;
  height: number;
  nodes: MMPlaced[];
  edges: MMEdge[];
  byId: Record<string, MMPlaced>;
};

export const MM = {
  rootW: 164,
  rootH: 64,
  branchW: 120,
  branchH: 44,
  leafW: 300,
  leafH: 32,
  /** 叶子行高（含间距） */
  slot: 35,
  /** 章节块之间的空隙 */
  branchGap: 16,
  pad: 20,
  gapRoot: 50,
  gapBranch: 32
} as const;

const r2 = (n: number) => Math.round(n * 100) / 100;

/** 三次贝塞尔：父节点外沿 → 子节点内沿，控制点在水平方向各拉 55% */
function edgePath(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  side: -1 | 1
): string {
  const dx = (toX - fromX) * 0.55;
  const c1x = fromX + dx * side;
  const c2x = toX - dx * side;
  return `M ${r2(fromX)} ${r2(fromY)} C ${r2(c1x)} ${r2(fromY)} ${r2(c2x)} ${r2(toY)} ${r2(toX)} ${r2(toY)}`;
}

/**
 * 布局。collapsed 里的章节只画章节节点，不画叶子。
 * 分侧策略：按叶子数从多到少贪心丢给「当前更空」的一侧，避免一边 35 行一边 23 行。
 */
export function layoutMindMap(root: MMNode, collapsed: Iterable<string> = []): MMLayout {
  const off = new Set(collapsed);
  const branches = (root.children ?? []).map((b) => ({
    node: b,
    leaves: off.has(b.id) ? [] : (b.children ?? []),
    total: (b.children ?? []).length
  }));

  const sideOf = new Map<string, -1 | 1>();
  let leftWeight = 0;
  let rightWeight = 0;
  for (const b of [...branches].sort((a, z) => z.leaves.length - a.leaves.length || a.node.id.localeCompare(z.node.id))) {
    const side: -1 | 1 = rightWeight <= leftWeight ? 1 : -1;
    sideOf.set(b.node.id, side);
    const w = b.leaves.length + 0.6;
    if (side === 1) rightWeight += w;
    else leftWeight += w;
  }

  const listOf = (side: -1 | 1) => branches.filter((b) => sideOf.get(b.node.id) === side);
  const leftList = listOf(-1);
  const rightList = listOf(1);

  const sideHeight = (list: typeof branches) =>
    list.reduce((acc, b) => acc + Math.max(1, b.leaves.length) * MM.slot + MM.branchGap, 0) + MM.pad * 2;

  const hLeft = sideHeight(leftList);
  const hRight = sideHeight(rightList);
  const height = Math.max(hLeft, hRight, MM.rootH + MM.pad * 2);

  const branchX = MM.rootW / 2 + MM.gapRoot + MM.branchW / 2;
  const leafX = branchX + MM.branchW / 2 + MM.gapBranch + MM.leafW / 2;
  const width = (leafX + MM.leafW / 2) * 2 + MM.pad * 2;

  const cx = width / 2;
  const cy = height / 2;

  const nodes: MMPlaced[] = [
    {
      id: root.id,
      label: root.label,
      sub: root.sub ?? '',
      score: null,
      href: root.href ?? '',
      summary: root.summary ?? '',
      kind: 'root',
      side: 0,
      x: cx,
      y: cy,
      w: MM.rootW,
      h: MM.rootH,
      parent: '',
      hidden: 0,
      collapsed: false,
      meta: '',
      badge: ''
    }
  ];
  const edges: MMEdge[] = [];

  const pushSide = (list: typeof branches, side: -1 | 1, totalH: number) => {
    let cursor = (height - totalH) / 2 + MM.pad;
    for (const b of list) {
      const n = Math.max(1, b.leaves.length);
      const blockH = n * MM.slot;
      const branchY = cursor + blockH / 2;
      const bx = cx + side * branchX;

      nodes.push({
        id: b.node.id,
        label: b.node.label,
        sub: b.node.sub ?? '',
        score: null,
        href: b.node.href ?? '',
        summary: b.node.summary ?? '',
        kind: 'branch',
        side,
        x: bx,
        y: branchY,
        w: MM.branchW,
        h: MM.branchH,
        parent: root.id,
        hidden: b.total - b.leaves.length,
        collapsed: off.has(b.node.id),
        meta: b.node.meta ?? '',
        badge: b.node.badge ?? ''
      });

      edges.push({
        id: `${root.id}|${b.node.id}`,
        from: root.id,
        to: b.node.id,
        side,
        d: edgePath(cx + side * (MM.rootW / 2), cy, bx - side * (MM.branchW / 2), branchY, side)
      });

      b.leaves.forEach((leaf, i) => {
        const leafY = cursor + i * MM.slot + MM.slot / 2;
        const lx = cx + side * leafX;
        nodes.push({
          id: leaf.id,
          label: leaf.label,
          sub: leaf.sub ?? '',
          score: typeof leaf.score === 'number' ? leaf.score : null,
          href: leaf.href ?? '',
          summary: leaf.summary ?? '',
          kind: 'leaf',
          side,
          x: lx,
          y: leafY,
          w: MM.leafW,
          h: MM.leafH,
          parent: b.node.id,
          hidden: 0,
          collapsed: false,
          meta: leaf.meta ?? '',
          badge: leaf.badge ?? ''
        });
        edges.push({
          id: `${b.node.id}|${leaf.id}`,
          from: b.node.id,
          to: leaf.id,
          side,
          d: edgePath(bx + side * (MM.branchW / 2), branchY, lx - side * (MM.leafW / 2), leafY, side)
        });
      });

      cursor += blockH + MM.branchGap;
    }
  };

  pushSide(leftList, -1, hLeft);
  pushSide(rightList, 1, hRight);

  const byId: Record<string, MMPlaced> = {};
  for (const n of nodes) byId[n.id] = n;

  return { width: Math.round(width), height: Math.round(height), nodes, edges, byId };
}

/** 从节点回溯到根的整条路径（含自己），用于悬停高亮 */
export function pathToRoot(byId: Record<string, MMPlaced>, id: string): string[] {
  const chain: string[] = [];
  let cur: MMPlaced | undefined = byId[id];
  let guard = 0;
  while (cur && guard++ < 12) {
    chain.push(cur.id);
    cur = cur.parent ? byId[cur.parent] : undefined;
  }
  return chain;
}

/** 评分色带：≥85 朱红、75–84 青、<75 灰（只用站点既有 token，不新增色值） */
export function scoreBand(score: number | null): 'zhu' | 'qing' | 'ink' | 'none' {
  if (score === null) return 'none';
  if (score >= 85) return 'zhu';
  if (score >= 75) return 'qing';
  return 'ink';
}
