/**
 * 主稿（answer）类型定义：五种题型模板
 *
 * 设计原则：
 * 1. 主稿只回答「这题该怎么想」，结构是问题本身的核心逻辑，不是口述顺序
 * 2. 结论（conclusion）一句话≤24 字，必须含数字或机制名，能当众说出来
 * 3. core 是骨架，按题型模板分 3（可 4）个环节，每环节 points 是编了号的论点
 * 4. notes 是注释：挂在某个环节的某条论点下，按 kind 分「参数 / 坑 / 速答 / 追问」
 * 5. 所有内容都要能追溯到原文（provenance），s60/s600 只做参考，不另立事实
 */

/** 五种题型模板，由问题的核心逻辑决定，不由学科决定 */
export type AnswerPattern =
  /** 流程类：按阶段推进，每站讲「谁干的 + 失败会怎样」 */
  | 'flow'
  /** 论证类：先给结论，再用排除法证伪其他方案，最后说代价 */
  | 'compare'
  /** 方法类：按决策顺序展开，每一步给「看什么指标 + 怎么调」 */
  | 'method'
  /** 对照类：按同一组维度逐条对照，维度一致才可对比 */
  | 'contrast'
  /** 机制类：按时序讲两方怎么配合，重点是崩溃点判定 */
  | 'mechanism';

export interface AnswerPoint {
  /** 论点：一句话讲一个机制/判断，不带口述过渡词 */
  text: string;
  /** 该论点下的注释序号（对应 notes 的 [n] 标记，仅用于展示） */
  marks?: number[];
}

export interface AnswerStage {
  /** 环节标题：≤8 字，尽量用原文的小标题词 */
  h: string;
  /** 环节要做到什么（一句），可省 */
  goal?: string;
  points: AnswerPoint[];
}

export type NoteKind = 'param' | 'pitfall' | 'quick' | 'followup';

export interface AnswerNote {
  /** 挂在第几个环节（1 起） */
  atStage: number;
  /** 挂在第几条论点（1 起，0 = 整个环节） */
  atPoint?: number;
  kind: NoteKind;
  /** 注释标题（参数名 / 坑名 / 追问问题） */
  title: string;
  /** 注释正文，一句话到一段，来自 s600 或 followUps */
  text: string;
}

export interface Answer {
  /** 题型模板 */
  pattern: AnswerPattern;
  /** 结论：≤24 字，含数字或机制名 */
  conclusion: string;
  /** 骨架 */
  stages: AnswerStage[];
  /** 注释 */
  notes: AnswerNote[];
  /** 事实出处：原文文件 + 行号 */
  provenance?: string[];
}

/** 五种模板的展示元信息（页面用） */
export const PATTERN_META: Record<AnswerPattern, { label: string; hint: string; order: string[] }> = {
  flow: {
    label: '流程类',
    hint: '按阶段推进：每一站谁干的、失败会怎样',
    order: ['触发', '各站做什么', '失败与兜底']
  },
  compare: {
    label: '论证类',
    hint: '先给结论，再用排除法证伪其他方案，最后说代价',
    order: ['结论先行', '为什么不是别的', '代价']
  },
  method: {
    label: '方法类',
    hint: '按决策顺序展开：每步看什么指标、怎么调',
    order: ['目标', '怎么做', '怎么验证']
  },
  contrast: {
    label: '对照类',
    hint: '按同一组维度逐条对照，维度一致才可比',
    order: ['先定维度', '逐维对照', '怎么选']
  },
  mechanism: {
    label: '机制类',
    hint: '按时序讲两方怎么配合，重点是崩溃点怎么判定',
    order: ['为什么需要', '时序', '崩了怎么办']
  }
};

/** 注释类型的展示元信息 */
export const NOTE_META: Record<NoteKind, { label: string; mark: string }> = {
  param: { label: '参数', mark: '①' },
  pitfall: { label: '坑', mark: '②' },
  quick: { label: '速答', mark: '③' },
  followup: { label: '追问', mark: '④' }
};