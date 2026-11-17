/**
 * mindmap-edges.ts — 组间连接表
 *
 * 数据在 src/data/mindmap-edges.json，形如 { from, to, label, why, kind }。
 * from / to 引用「模块/组」，与各导图上层节点的 ref 一一对应（groupIndex() 提供解析）。
 * 这张表是人工维护的：错一个 ref，构建直接报错，不会静默少画一条线。
 */
import edgesJson from '../data/mindmap-edges.json';
import { groupIndex, type GroupRef } from './mindmap-data';

export type EdgeKind = 'inner' | 'cross';

export interface MindEdge {
  from: string;
  to: string;
  label: string;
  why: string;
  kind: EdgeKind;
}

export interface ResolvedEdge {
  id: string;
  kind: EdgeKind;
  label: string;
  why: string;
  a: GroupRef;
  b: GroupRef;
}

const RAW: MindEdge[] = (edgesJson as { edges: MindEdge[] }).edges;

let cache: ResolvedEdge[] | null = null;

/** 解析全部边；发现不存在的 ref 或自环就抛错（构建期暴露，而不是页面上悄悄少一条） */
export function resolvedEdges(): ResolvedEdge[] {
  if (cache) return cache;
  const index = groupIndex();
  const problems: string[] = [];
  const seen = new Set<string>();
  const out: ResolvedEdge[] = [];

  for (const e of RAW) {
    if (e.from === e.to) problems.push(`自环：${e.from}`);
    const a = index.get(e.from);
    const b = index.get(e.to);
    if (!a) problems.push(`未知起点：${e.from}`);
    if (!b) problems.push(`未知终点：${e.to}`);
    if (!a || !b) continue;
    const key = [e.from, e.to].sort().join('~');
    if (seen.has(key)) {
      problems.push(`重复连接：${e.from} ↔ ${e.to}`);
      continue;
    }
    seen.add(key);
    out.push({ id: `e${out.length}`, kind: e.kind === 'cross' ? 'cross' : 'inner', label: e.label, why: e.why, a, b });
  }

  if (problems.length) {
    throw new Error(`组间边表有问题（${problems.length} 处）：\n- ${problems.join('\n- ')}`);
  }
  cache = out;
  return out;
}

export const edgeStats = () => {
  const all = resolvedEdges();
  return {
    total: all.length,
    inner: all.filter((e) => e.kind === 'inner').length,
    cross: all.filter((e) => e.kind === 'cross').length,
    /** 被连接到的组数（去重） */
    touched: new Set(all.flatMap((e) => [e.a.ref, e.b.ref])).size
  };
};

/** 与某个模块相关的跨模块连接（用于 /mindmap/<topic> 页脚） */
export function crossEdgesOf(mapKey: string): ResolvedEdge[] {
  return resolvedEdges().filter(
    (e) => e.kind === 'cross' && (e.a.mapKey === mapKey || e.b.mapKey === mapKey)
  );
}

/** 与某个模块相关的全部连接（含模块内），按跨模块优先排序 */
export function edgesOf(mapKey: string): ResolvedEdge[] {
  return resolvedEdges()
    .filter((e) => e.a.mapKey === mapKey || e.b.mapKey === mapKey)
    .sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'cross' ? -1 : 1));
}

/** 某个组的所有连接 */
export function edgesOfGroup(ref: string): ResolvedEdge[] {
  return resolvedEdges().filter((e) => e.a.ref === ref || e.b.ref === ref);
}
