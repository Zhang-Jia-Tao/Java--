/** 连问链：题目的「面试官会怎么一层层追下去」数据 */
import indexJson from '../data/chain/index.json';

export interface ChainLayer {
  /** 追问（面试官原话） */
  q: string;
  /** 满分回答（口述 3–5 句，能直接说出来） */
  a: string;
  /** 这一层在考什么 / 答错会怎样 */
  trap?: string;
  /** 答到什么程度算过 */
  pass?: string;
}

export interface Chain {
  /** 题目 id（Java/项目）或 hot200 slug */
  id: string;
  title: string;
  module: string;
  href: string;
  /** 为什么这题值得做连问链 */
  why: string;
  /** 一层一层往下追，5–7 层 */
  layers: ChainLayer[];
  /** 整条链的满分总答（2 分钟版） */
  perfect?: { text: string; note?: string };
}

export interface ChainIndexItem {
  id: string;
  title: string;
  module: string;
  href: string;
  why: string;
  layers: number;
}

export const chainIndex = (indexJson as { items: ChainIndexItem[] }).items;

const chainFiles = import.meta.glob<Chain>('../data/chain/*.json', { eager: true, import: 'default' });

const byId = new Map<string, Chain>();
for (const [path, data] of Object.entries(chainFiles)) {
  if (path.endsWith('/index.json')) continue;
  if (data?.id) byId.set(data.id, data);
}

export const getChain = (id: string) => byId.get(id);
export const hasChain = (id: string) => byId.has(id);
export const allChains = () => [...byId.values()];
