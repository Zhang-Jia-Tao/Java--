/**
 * 生成「考频」数据：src/data/freq.json
 *
 * 为什么要有这个：516 道题里没有「面试考不考」这个维度，现有 A–E 分是「稿子写得好不好」，
 * 不等于「面试会不会问」。全背不可能，所以先分档，再只给 S 级（必背）写连问链。
 *
 * 分档依据（可解释，不是黑箱）：
 *  1. S 级 = 我按 Java 后端校招真题分布手排的必背清单（每题给一句理由）；
 *  2. A 级 = 标题命中高频考点词表（索引/事务/锁/MVCC/持久化/缓存/幂等/GC/JMM/线程池/HTTP…）；
 *  3. B 级 = 八股池里其余题（会问，但频次中等）；
 *  4. 「—」= 个人项目题（是否被问取决于简历）、Hot200（手撕另算）；
 *  5. AI 模块单独一个域：按 AI 应用岗的高频点（RAG / 幻觉 / 评测 / Agent / 提示词）分档。
 *
 * 用法：node scripts/gen-freq.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'src/data');

const AI_KEYS = ['foundation', 'ragent', 'eval', 'llm', 'aiproj'];
const MW_KEYS = ['redis', 'rocketmq', 'es', 'kafka'];
const PROJ_KEYS = [
  'merchant-admin',
  'engine',
  'distribution',
  'settlement',
  'framework',
  'defense',
  'search'
];

/** S 级：Java 后端校招必背（理由是我自己对真题分布的判断，不是抽样统计） */
const S_JAVA = {
  '1-1': '集合开场题：HashMap 与 CHM 的区别几乎每场必问，能顺着聊到扩容、段锁、CAS',
  '1-4': 'HashMap 原理是「集合三连」的第一跳，后面必接扩容与并发',
  '2-5': '锁的对比题：synchronized 与 ReentrantLock，必追问锁升级与 AQS',
  '2-6': 'ThreadLocal 三连：原理 → 内存泄漏 → 怎么解决，考「敢不敢追问」',
  '2-7': 'volatile 是并发题的入门闸门：可见性、重排序、不保证原子性',
  '2-9': '线程池是「有工程经验」的判定题，必问参数、拒绝策略、饱和排查',
  '3-0': 'JMM 与运行时内存结构分不清是应届生高频失分点',
  '3-3': '双亲委派：必追问「怎么打破」「为什么要打破」',
  '3-7': 'GC 机制 + 回收器选型，JVM 方向的必答题',
  '4-4': '循环依赖是 Spring 面试的「深水区」入口，必追三级缓存',
  '4-8': 'Bean 生命周期是 Spring 基础题的标尺，能背出顺序就算及格',
  '4-9': '事务传播行为：项目里踩过坑才答得动，高频区分题',
  '4-10': 'Spring Boot 自动配置：注解 → 条件装配 → starter 三连',
  '5-1': 'String 三兄弟属于「送分题」，答不利索直接扣印象分',
  '6a-1': 'TCP 三次握手：计网必考第一题，必追「为什么不是两次」',
  '6a-6': 'HTTP 版本演进，配合 TLS、队头阻塞一起问',
  '6a-8': 'HTTPS 握手过程，校招计网的高频深水题'
};

const S_PROJ = {
  'mysql-17': '索引优化是 MySQL 方向的第一高频，必追最左前缀与索引失效',
  'mysql-19': '为什么用 B+ 树：数据结构 + 磁盘 IO 的结合题',
  'mysql-28': 'MVCC 是事务部分的深水题，必追快照读、undo、Read View',
  'mysql-30': '隔离级别四档，必追「RR 怎么解决幻读」',
  'redis-15': 'Redis 持久化（RDB/AOF/混合）是缓存方向必答题',
  'redis-11': 'Redis 为什么快：单线程 + IO 多路复用 + 数据结构，必追 6.0 多线程',
  'mq-09': '消息不重复消费：幂等方案是项目深挖的必经环节',
  'mq-05': '消息顺序：顺序写 + 队列选择 + 消费端串行，三连',
  'ds-04': '分布式锁选型：Redis 与 ZK，看门狗与锁续期',
  'ds-05': '接口幂等：五种方案怎么选，几乎每场项目面都问',
  'ds-11': '缓存与数据库一致性：先删缓存还是先更库，必追延迟双删',
  'sc-01': '线上 RT 变慢的定位：看监控 → 看链路 → 看单机，场景题模板',
  'sc-05': 'Full GC 频繁：JVM 与线上排查的结合题，区分「背过」和「干过」',
  'jx-18': 'Spring 三级缓存解决循环依赖：能讲清「为什么是三级不是两级」的很少',
  'sc-06': '缓存穿透/击穿/雪崩三兄弟必被一起问，场景题的标准模板',
  'jx-16': '@Transactional 失效场景：排查经验题，必追自调用与代理'
};

/** A 级：标题命中这些词就进「常考」 */
const A_RULES = [
  { re: /索引|B\+|B-?树|执行计划|explain|慢查询|SQL 优化/i, why: '数据库高频：索引与优化' },
  { re: /事务|隔离|MVCC|快照|锁|死锁|幻读|超卖|库存/i, why: '数据库/并发高频：事务与锁' },
  { re: /JVM|GC|垃圾|堆|栈|内存|OOM|类加载|双亲|字节码|JMM/i, why: 'JVM 高频' },
  { re: /线程|并发|锁|volatile|CAS|AQS|ThreadLocal|JUC|原子|死锁/i, why: '并发高频' },
  { re: /Spring|Bean|IOC|AOP|事务传播|自动配置|MyBatis|MVC/i, why: '框架高频' },
  { re: /Redis|缓存|持久化|淘汰|过期|集群|主从|哨兵/i, why: '缓存高频' },
  { re: /RocketMQ|Kafka|消息|MQ|死信|堆积|顺序消费|事务消息/i, why: '消息队列高频' },
  { re: /分布式|一致性|CAP|BASE|幂等|限流|熔断|降级|分库|分表|ID/i, why: '分布式高频' },
  { re: /TCP|UDP|HTTP|HTTPS|TLS|DNS|网络|握手|挥手|拥塞|粘包|epoll|IO 模型|NIO|BIO/i, why: '网络/IO 高频' },
  { re: /进程|线程|协程|调度|内存管理|缺页|虚拟内存|锁|死锁/i, why: '操作系统高频' },
  { re: /集合|HashMap|ArrayList|LinkedList|Concurrent|String/i, why: 'Java 基础高频' },
  { re: /设计模式|单例|代理|策略|责任链|模板/i, why: '设计模式高频' },
  { re: /线上|排查|定位|调优|压测|容量|监控|发布|回滚/i, why: '线上排查场景高频' }
];

/** AI 域（AI 应用岗视角） */
const S_AI = {
  'ai-01': '大模型基础概念（Token/上下文/温度），AI 面开场题',
  'ai-11': 'RAG Prompt 三段式与幻觉控制：RAG 岗必问',
  'ap-09': 'RAG 评测闭环：怎么用分数驱动优化，区分「调过」和「想过」',
  'ev-07': 'RAGAS 五个指标为什么是这五个：评测岗深水题'
};
const A_AI = [
  { re: /RAG|检索|召回|切分|Chunk|rerank|向量|Embedding/i, why: 'AI 高频：RAG 链路' },
  { re: /幻觉|Prompt|提示词|上下文|Token|温度/i, why: 'AI 高频：Prompt 与幻觉' },
  { re: /评测|指标|RAGAS|Hit|MRR|基准/i, why: 'AI 高频：评测' },
  { re: /Agent|工具调用|意图|路由|Memory/i, why: 'AI 高频：Agent' },
  { re: /微调|LoRA|蒸馏|对齐|RLHF/i, why: 'AI 高频：训练侧' }
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

const items = [];

// Java 基础 58
for (const f of fs.readdirSync(path.join(DATA, 'questions'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const j = readJson(path.join(DATA, 'questions', f));
  const tier = S_JAVA[j.id] ? 'S' : A_RULES.some((r) => r.re.test(j.title)) ? 'A' : 'B';
  const rule = A_RULES.find((r) => r.re.test(j.title));
  items.push({
    id: j.id,
    domain: 'java',
    module: 'Java 基础',
    href: `/notes/${j.chapter}/${j.id}`,
    title: j.title,
    tier,
    why: S_JAVA[j.id] ?? (tier === 'A' ? rule?.why ?? '校招常考' : '八股池，会问但频次中等')
  });
}

// 项目区 355（拆成 java 八股线 / AI 线 / 个人项目线）
for (const f of fs.readdirSync(path.join(DATA, 'project'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const j = readJson(path.join(DATA, 'project', f));
  const isAi = AI_KEYS.includes(j.module);
  const isProj = PROJ_KEYS.includes(j.module);
  if (isProj) {
    items.push({
      id: j.id,
      domain: 'proj',
      module: j.module,
      href: `/project/${j.module}/${j.id}`,
      title: j.title,
      tier: '-',
      why: '个人项目题：面试问不问取决于简历，不进考频'
    });
    continue;
  }
  const sMap = isAi ? S_AI : S_PROJ;
  const rules = isAi ? A_AI : A_RULES;
  const tier = sMap[j.id] ? 'S' : rules.some((r) => r.re.test(j.title)) ? 'A' : 'B';
  const rule = rules.find((r) => r.re.test(j.title));
  items.push({
    id: j.id,
    domain: isAi ? 'ai' : 'java',
    module: j.module,
    href: isAi ? `/ai/${j.module}/${j.id}` : `/project/${j.module}/${j.id}`,
    title: j.title,
    tier,
    why: sMap[j.id] ?? (tier === 'A' ? rule?.why ?? '校招常考' : '八股池，会问但频次中等')
  });
}

// Hot200：手撕另算
for (const f of fs.readdirSync(path.join(DATA, 'hot200'))) {
  if (!f.endsWith('.json') || f === 'index.json') continue;
  const j = readJson(path.join(DATA, 'hot200', f));
  items.push({
    id: j.slug,
    domain: 'hot',
    module: 'Hot200',
    href: `/hot200/${j.slug}`,
    title: j.title,
    tier: '-',
    why: '手撕题：按 Hot200 精刷，不参与八股考频'
  });
}

items.sort((a, b) => {
  const order = { S: 0, A: 1, B: 2, '-': 3 };
  return order[a.tier] - order[b.tier] || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id, 'en', { numeric: true });
});

const count = (t, d) => items.filter((i) => i.tier === t && (!d || i.domain === d)).length;
const payload = {
  note: '考频是编辑判断，不是抽样统计：S 级为手排的必背清单，A 级为标题命中高频考点词，B 级为其余八股，个人项目与手撕不参与。',
  generated: new Date().toISOString().slice(0, 10),
  stats: {
    total: items.length,
    java: { S: count('S', 'java'), A: count('A', 'java'), B: count('B', 'java') },
    ai: { S: count('S', 'ai'), A: count('A', 'ai'), B: count('B', 'ai') },
    proj: count('-', 'proj'),
    hot: count('-', 'hot')
  },
  items
};

if (process.argv.includes('--check')) {
  const p = path.join(DATA, 'freq.json');
  const old = fs.existsSync(p) ? readJson(p) : null;
  const same = old && JSON.stringify(old.items) === JSON.stringify(items);
  console.log(same ? '✓ 与 freq.json 一致' : '✗ freq.json 过期，请重新生成');
  process.exit(same ? 0 : 1);
}

fs.writeFileSync(path.join(DATA, 'freq.json'), JSON.stringify(payload, null, 1) + '\n', 'utf8');
const s = payload.stats;
console.log(`✓ src/data/freq.json · 共 ${s.total} 题`);
console.log(`  Java 后端线：S ${s.java.S} / A ${s.java.A} / B ${s.java.B}`);
console.log(`  AI 线：      S ${s.ai.S} / A ${s.ai.A} / B ${s.ai.B}`);
console.log(`  个人项目 ${s.proj} 题、手撕 ${s.hot} 题不参与考频`);
