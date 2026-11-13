import flowsJson from '../data/project-flows.json';
import { projectModules, getQuestion } from './project';

export type FlowStep = {
  n: number;
  title: string;
  /** 我的补充：这一步在讲什么、为什么这么走 */
  detail: string;
  anchor: string;
  /** 原文逐字摘录（由 scripts/gen-flow-quotes.mjs 按 anchor 抽取），渲染时优先展示 */
  quote?: string;
};

export type ProjectFlow = {
  id: string;
  module: string;
  title: string;
  kind: '架构' | '流程' | '机制' | '排障';
  /** project=券项目代码/流程；generic=《核心技术文档》里的通用机制整理，非本仓库实现 */
  scope: 'project' | 'generic';
  oneLiner: string;
  trigger: string;
  steps: FlowStep[];
  numbers: string[];
  pitfalls: string[];
  cards: string[];
  source: { doc: string; startLine: number; endLine: number };
};

export const projectFlows = flowsJson as ProjectFlow[];

export const flowModuleLabel = (key: string) =>
  projectModules.find((m) => m.key === key)?.name ?? (key === 'platform' ? '平台与全链路' : key);

export const flowModuleEn = (key: string) =>
  projectModules.find((m) => m.key === key)?.en ?? key;

/** 模块内流程：按 platform 打头，其余按 meta 的 order */
export const flowGroups = () => {
  const keys = [...new Set(projectFlows.map((f) => f.module))];
  const order = (k: string) => (k === 'platform' ? -1 : (projectModules.find((m) => m.key === k)?.order ?? 99));
  return keys
    .sort((a, b) => order(a) - order(b))
    .map((key) => ({
      key,
      name: flowModuleLabel(key),
      en: flowModuleEn(key),
      items: projectFlows.filter((f) => f.module === key)
    }));
};

export const flowsOfModule = (key: string) => projectFlows.filter((f) => f.module === key);

export const getFlow = (id: string) => projectFlows.find((f) => f.id === id);

/** 关联题目卡：返回存在的那部分，避免死链 */
export const flowCards = (flow: ProjectFlow) =>
  flow.cards.map((id) => getQuestion(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));

export const flowSourceLabel = (flow: ProjectFlow) => {
  const doc = flow.source.doc.split('/').pop() ?? flow.source.doc;
  return `${doc} L${flow.source.startLine}–L${flow.source.endLine}`;
};

export const genericFlowCount = projectFlows.filter((f) => f.scope === 'generic').length;
