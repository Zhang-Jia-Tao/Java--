/**
 * 追问聚类：把 26 张卡里的 124 条追问按「面试官想考什么」分类。
 * 关键词优先，判不出来的进「其他」——分类只用于练习入口，不改变原文。
 */

export type FollowKind = {
  key: string;
  label: string;
  hint: string;
};

export const FOLLOW_KINDS: FollowKind[] = [
  { key: 'failure', label: '故障与兜底', hint: '出事故怎么办、怎么防、怎么回滚' },
  { key: 'tradeoff', label: '方案取舍', hint: '为什么不用 X、为什么不选另一个方案' },
  { key: 'metric', label: '量化与口径', hint: '提升多少、耗时多久、数怎么来的' },
  { key: 'whatif', label: '假设与扩展', hint: '量级翻十倍、如果换成另一种前提' },
  { key: 'detail', label: '实现细节', hint: '表结构、字段、接口、配置、怎么判断' },
  { key: 'other', label: '其他', hint: '不属于以上五类' }
];

const RULES: { key: string; re: RegExp }[] = [
  { key: 'failure', re: /事故|故障|挂了|失败|回滚|兜底|补救|报警|监控|恢复|死信|重复消费|不一致|丢了|丢失|继续跑/ },
  { key: 'tradeoff', re: /为什么不用|为什么不选|为什么不|为何不|为什么没有|不用\s*[A-Za-z]|对比|替代|换成|为什么选|取舍/ },
  { key: 'metric', re: /多少|多久|几[个张条种]|占比|提升|降低|优化了多少|数据|压测|QPS|耗时|毫秒|效果|体量/ },
  { key: 'whatif', re: /如果|假设|要是|万一|扩容|翻|十倍|成倍|更大|增长/ },
  { key: 'detail', re: /怎么实现|如何实现|代码|表结构|字段|SQL|接口|配置|参数|怎么知道|怎么判断|触发|顺序/ }
];

export function kindOf(question: string): string {
  for (const r of RULES) if (r.re.test(question)) return r.key;
  return 'other';
}
