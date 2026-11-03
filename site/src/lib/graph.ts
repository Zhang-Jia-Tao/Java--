import metaJson from '../data/graph/meta.json';
import anchorMapJson from '../data/graph/anchor-map.json';

export interface GraphLayerStat {
  id: string;
  name: string;
  desc: string;
  nodes: number;
  files: number;
  classes: number;
  functions: number;
  edges: number;
  out: [string, number][];
  in: [string, number][];
  anchors: number;
}

export interface GraphTourStep {
  o: number;
  t: string;
  d: string;
  steps: { k: string; n: string; t: string; l: string }[];
}

export interface GraphMeta {
  empty?: boolean;
  generatedAt: string;
  sourcePath: string | null;
  sourceMtime: string | null;
  collection?: string;
  project?: { name: string; frameworks: string[] };
  counts: {
    nodes?: number;
    edges?: number;
    rawEdges?: number;
    files?: number;
    classes?: number;
    functions?: number;
    tables?: number;
    complex?: number;
  };
  layers: GraphLayerStat[];
  tour: GraphTourStep[];
  coverage: {
    questions?: number;
    questionsWithAnchors?: number;
    anchorsTotal?: number;
    anchorsMatched?: number;
    questionsMatched?: number;
    filesMatched?: number;
  };
}

export const graphMeta = metaJson as unknown as GraphMeta;
export const hasGraph = !graphMeta.empty && graphMeta.layers.length > 0;

/** 题目页的锚点 → 图谱节点（构建期查表，不额外发请求） */
export const anchorIndex = anchorMapJson as Record<string, { l: string; k: string; n: string }>;

export function anchorNode(file: string) {
  return anchorIndex[String(file).replace(/\\/g, '/').replace(/^\.\//, '')] ?? null;
}

export const layerHref = (layerId: string, nodeKey?: string) =>
  `/project/source/${layerId}${nodeKey ? `?focus=${nodeKey}` : ''}`;

export const layerName = (layerId: string) => graphMeta.layers.find((l) => l.id === layerId)?.name ?? layerId;

export const layerStat = (layerId: string) => graphMeta.layers.find((l) => l.id === layerId);

/** 生成日期（页面脚注用） */
export const graphDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).replace(/-/g, '.') : '—';
