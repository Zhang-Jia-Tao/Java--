# Ragent AI 专区 · 实现计划

> 目标：把 `_review/` 下三份 AI 文档（Agent入门 1173 行 / ZRagent 5266 行 / 评测 1827 行）与 `C:\Users\zhangjiatao6\IdeaProjects\Ragent` 仓库代码，做成一块**能背、能查、能讲**的 AI 面试专区，页面语言延续现有「墨 · 朱 · 尺」，但交互与组件要有 AI 特色。

---

## 一、代码盘点（已完成侦察）

| 维度 | 结论 |
| --- | --- |
| 形态 | Java 多模块 Maven 工程 + React 18/Vite 前端，1525 个文件（945 java、116 tsx） |
| 模块 | `framework`（基建：缓存/幂等/MQ/分布式 ID/trace/errorcode）、`infra-ai`（模型接入）、`system`（用户/审计/样本）、`rag`（511 个 java，解析→分块→入库→检索→生成）、`agent`（136 个 java，AgentScope ReAct）、`mcp-server`（73 个，电商工具集）、`bootstrap`（启动） |
| 关键依赖 | AgentScope（`agentscope-core` + openai 扩展）、Milvus SDK、Elasticsearch、Tika、Redisson、RocketMQ、Sa-Token、MyBatis-Plus、Spring Boot 4 |
| 八阶段主链路 | `rag/.../rag/service/pipeline/StreamChatPipeline.java`（215 行）：`execute` L82 → `loadMemory` L104 → `rewriteQuery` L112 → `resolveIntents` L117 → `handleGuidance` L122 → `handleSystemOnly` L136 → `retrieve` L159 → `handleEmptyRetrieval` L163 → `streamRagResponse` L173，与文档「八阶段 + 三个短路点」完全对应 |
| 检索 | `core/retrieval/`（25 个）：`MultiChannelRetrievalEngine`、`RetrievalEngine`、`channel/{Vector,Keyword,Graph}SearchChannel`、`postprocessor/{Deduplication,Rerank}PostProcessor` |
| 意图 | `core/intent/`（8 个）：`IntentNode`、`IntentNodeRegistry`、`DefaultIntentClassifier`、`IntentTreeCacheManager` |
| 改写 | `core/rewrite/`（6 个）：`MultiQuestionRewriteService`、`RewriteResult`、`QueryTermMappingService` |
| 记忆 | `rag/core/memory/`（6 个）+ `agent/memory/AgentMemoryPipeline`：滑动窗口 + 摘要压缩 |
| 模型接入 | `infra-ai/chat/`：`RoutingLLMService`、`LlmFirstPacketProbe`（首包探测）、`ProbeStreamBridge`、6 家 provider（DeepSeek/BaiLian/Ollama/SiliconFlow/AIHubMix/OpenAI 风格） |
| 前端 | 仅作参考（问答页、意图树 G6 图、看板），不纳入本站 |
| 文档覆盖面 | `Agent入门.md`＝AI 底座（Token/Prompt/RAG 全链路/向量库/MCP/SSE）；`ZRagent.md`＝Q1–Q16 项目真题；`评测.md`＝十一篇评测体系 |

---

## 二、内容结构（38 篇 = 14 底座 + 16 项目 + 8 评测）

### A. AI 底座 `ai-01 … ai-14`（module=`ai`，对应 Agent入门.md）

| id | 题 | 文档行 |
| --- | --- | --- |
| ai-01 | Token、上下文窗口、Temperature 到底是什么 | 7–39 |
| ai-02 | 基座模型 vs Chat 模型，以及一次 API 调用的报文 | 41–155 |
| ai-03 | Prompt 五要素：角色/任务/约束/输入/分隔符 | 156–262 |
| ai-04 | 大模型五大局限与 RAG 架构 | 262–400 |
| ai-05 | Tika 解析：MIME、文本、元数据 | 402–484 |
| ai-06 | 分块策略：固定/重叠/递归/语义/混合 | 484–604 |
| ai-07 | 元数据：为什么 chunk 要带标签 | 604–708 |
| ai-08 | Embedding、相似度、阈值与重向量化 | 708–768 |
| ai-09 | 向量库：IVF / HNSW / Milvus 核心概念与选型 | 768–916 |
| ai-10 | 混合检索、BM25、RRF 与 Rerank | 916–1002 |
| ai-11 | RAG Prompt 三段式与幻觉控制 | 1002–1058 |
| ai-12 | Function Call 与 MCP 三层架构 | 1058–1214 |
| ai-13 | SSE 协议：字段格式与流式响应结构 | 1214–1506 |
| ai-14 | SpringBoot-SSE 服务端：中间层为什么必须存在 | 1506–结尾 |

### B. Ragent 项目题 `ra-01 … ra-16`（module=`ragent`，对应 ZRagent.md Q1–Q16）

1. ra-01 一次知识问答在后端经历的八个阶段（含三个短路点、数据总线）— 文档 L35
2. ra-02 大模型没有记忆，多轮对话怎么不失忆（持久化 / 滑动窗口 / 摘要合并）— L219
3. ra-03 聊了 50 轮 Token 爆了：压缩还是丢（水位线 / 攒批 / 分布式锁 / 预算）— L674
4. ra-04 问题改写与子问题拆分（一次 LLM 调用双输出 / 术语归一化 / 三级降级）— L1050
5. ra-05 四分类撑不住 20 个知识库：意图树设计（三级 / IntentNode / 缓存）— L1834
6. ra-06 怎么让大模型同时给 30 个意图节点打分（序列化 / Prompt / 排序 / 日志）— L2160
7. ra-07 三个子问题命中八个意图，保留哪几个（两道筛子 / 总量封顶三段式）— L2543
8. ra-08 歧义引导：用户问退货，3C/家电/服装都举手了（分层判定 / 分组 / 三区间）— L2883
9. ra-09 意图分数出来了，查哪个库、查多少条（SYSTEM/MCP/KB 分发 / 动态 TopK）— L3879
10. ra-10 单次提问同时查三个知识库：多通道并行检索（两阶段 / 两级线程池 / 容错）— L4504
11. ra-11 三十条结果最终只给模型五条（去重 / 精排 / 链式编排）— L5044
12. ra-12 知识库答不了交给 MCP 工具（意图分流 / 工具注册表 / 执行器）— L5836
13. ra-13 用户只说一句话，工具参数从哪来（LLM 抽取 / Schema / 三级降级）— L6459
14. ra-14 检索结果 + 工具数据 + 历史，Prompt 怎么拼（分场景 / KB 放 user / Temperature 分档）— L6911
15. ra-15 答案一个字一个字蹦出来（五层接力 / 首包探测 / 线程模型）— L7391
16. ra-16 用户点「停止生成」，集群里发生了什么（取消句柄 / 跨线程中断 / 收尾）— L7848

### C. 评测体系 `ev-01 … ev-08`（module=`eval`，对应 评测.md）

1. ev-01 评测全景：两套指标（自建 + RAGAS）与四段流程 init→run→score→report
2. ev-02 评估集怎么建（一条样本的字段、150 条 vs 20 条、三个坑）
3. ev-03 评测数据初始化（4 个库 / 115 篇文档 / 意图树 / 断点续传）
4. ev-04 旁路接口 `/rag/eval` 与双接口聚合（chunkId→docId 两跳、TTFT 打点、并发控制）
5. ev-05 指标拆解：意图 Top-1、文档级 Recall@K、must/nice 两档
6. ev-06 性能口径：整流耗时陷阱、TTFT、小样本分位数
7. ev-07 RAGAS 选型与五个指标（faithfulness / answer_relevancy / context_precision / context_recall / answer_correctness）
8. ev-08 RAGAS 五大坑与评测报告（同源偏置 / 方差 / 中文 NaN / 成本 / 误判；report.md / per_sample.csv / slides.html）

---

## 三、数据模型扩展（在现有 schema 上做加法，不破坏 70 篇已测题）

新增可选字段（`site/src/lib/project.ts`）：

```ts
// AI 题专属（其余模块可缺省）
pipeline?: { name: string; steps: { no: number; title: string; input: string; output: string;
            code: string; fail: string; short-circuit?: boolean }[] };
promptBlocks?: { role: string; text: string; tags: ('角色'|'任务'|'约束'|'输入'|'分隔符')[] }[];
fullAnswer?: { text: string; why: string; diff: string };   // 满分回答 / 为什么满分 / 与 60 分版差距
params?: { k: string; v: string; note?: string }[];          // 模型参数速查（temperature/top_p/max_tokens）
```

`module` 新增三个：`ai`（AI 底座）、`ragent`（项目题）、`eval`（评测），写入 `project-meta.json`，`projectModules` 自动多出三组 → 复习队列 / 闪卡 / 默写 / 一页纸 / 搜索 / 数字总表 / 架构图**全部自动收录**，无需改 P4 代码。

`review` 沿用 Rubric v2（A 源码一致 30 / B 概念准确 25 / C 面试完整 20 / D 取舍数字 15 / E 可背 10），AI 题的 A 指「Ragent 代码行 + 文档标注是否属实」，B 指「AI 概念是否讲错」。

---

## 四、页面与组件设计

### 信息架构

```
/ai                          Ragent 专区首页（架构图 + 指标卡 + 三类入口 + 特色工具）
/ai/overview                 项目总览：模块分层图、八阶段流水线全景、技术栈表
/ai/ragent                   项目题列表（16）
/ai/ai                       底座列表（14）
/ai/eval                     评测列表（8）+ 评测看板
/ai/<module>/<id>            题目详情（复用现有 11 个 section 的渲染）
/ai/pipeline                 八阶段交互式 stepper（特色）
/ai/prompt                   Prompt 解剖器（特色）
/ai/toolbox                  检索漏斗 / Token 估算 / 向量相似度 / SSE 模拟器（特色）
/ai/glossary                 术语表（可搜）
```

### 复用

- 抽 `QuestionView.astro`：把 `src/pages/project/[module]/[id].astro` 的内容主体抽成组件，`/project` 与 `/ai` 各自薄壳调用，避免两套维护。
- 顶部导航：`SiteHeader` 增加「AI 专区」入口；`/ai` 内部有自己的二级 chips。

### AI 特色组件（6 个，全部零框架原生 JS）

1. **八阶段 Stepper**（`/ai/pipeline`）：左侧阶段条，右侧展示「输入 → 处理类（真实类名:行号）→ 输出 / 短路条件 / 失败兜底」；可键盘 ←→ 步进；三个短路点用朱色标记。
2. **意图树浏览器**（嵌在 ra-05 页 + `/ai/toolbox`）：三级树折叠展开，叶子点显示「由哪条关键词触发、查哪个库、TopK 多少」，复刻文档 Q5/Q9 的配置。
3. **检索漏斗**（`/ai/toolbox`）：滑块控制「三通道各返回 N 条」，实时显示 合并 → 去重 → Rerank → 截断 每一步剩余条数与丢弃原因（文档 Q11 的数字默认值）。
4. **Prompt 解剖器**（`/ai/prompt`）：左侧真实 Prompt 文本，右侧五要素色块标注；hover 高亮对应段落；可切换「改写 / 意图分类 / 摘要压缩 / RAG 生成」四套模板。
5. **Token & 成本估算器**（`/ai/toolbox`）：输入文本 → 估算 token（中文 1 字≈1.5 token、英文 4 字符≈1 token，口径写明是估算）→ 上下文占比条 → 按每千 token 单价算一次问答成本。
6. **SSE 流式模拟器**（`/ai/toolbox`）：把一段回答切成 chunk 逐帧推送，右上角显示 `data:` 原文帧、累计 token、TTFT；可切「取消生成」演示中断。

### 视觉

- 延续「墨 · 朱 · 尺」变量，AI 区新增一个辅助色 `--qing: #3d6b8c`（已存在于 5 色高亮里的「疑问」蓝），用于：阶段条、流式光标、指标条；朱色仍只用于强调与警告。
- AI 区标题用同一套宋体标题 + 等宽标签；数据卡用细字号 tabular-nums，保持与项目区一致。
- 新增「流程线」样式：竖向 1px 虚线 + 8px 圆点，仅 AI 区使用，作为 AI 板块的视觉签名。

---

## 五、评分机制与「满分回答」

1. 每题保留 `review`（Rubric v2，五维 + total + verdict + hardErrors + deductions + bonus + srcCheck）。
2. 新增 `fullAnswer`：
   - `text`：**满分版口述稿**（3 分钟，可直接背，含取舍、数字、边界）；
   - `why`：为什么这版能满分（对应 Rubric 五维逐条打勾）；
   - `diff`：与「及格版（60 秒稿）」的差距清单（缺了哪几块）。
3. 题目页新增「满分回答」折叠区：默认收起，点击展开后出现「复制全文」按钮与五维评分小卡；与 `speak.s60/s180/s600` 形成 60 秒 / 3 分钟 / 满分三档。
4. `/ai` 首页给出「AI 题评分分布」小图（优秀/良好/待补），与项目区口径一致。

---

## 六、实施批次

| 批次 | 内容 | 产出 | 验收 |
| --- | --- | --- | --- |
| B0 骨架 | 组件抽取 `QuestionView`、`/ai` 路由与导航、`project-meta` 扩三个模块、schema 加可选字段、AI 区样式变量 | 页面能跑空壳 | `astro build` 通过，旧 70 题页面无回归 |
| B1 底座 14 篇 | ai-01…ai-14 JSON（doc 引用 Agent入门 行号 + Ragent 代码锚点） | 14 篇 | validator 0 问题（`--anchors`） |
| B2 项目题 16 篇 | ra-01…ra-16 JSON（ZRagent 行号 + StreamChatPipeline / 检索 / 意图 / 记忆 真实类行） | 16 篇 | 同上 |
| B3 评测 8 篇 | ev-01…ev-08 JSON | 8 篇 | 同上 |
| B4 特色页 | pipeline stepper、prompt 解剖器、toolbox 四件套、意图树、术语表、`/ai/overview` | 6 个页面 | CDP 逐页 smoke |
| B5 收口 | 架构图新增（AI 链路 6–8 张）、搜索/闪卡/一页纸覆盖校验、报告重生成、构建、提交推送 | 全站 | validator 全绿 + 232+ 页构建 |

### 分工（写作用 subagent，互相不重叠）

- subagent A：B1 的 ai-01…ai-07
- subagent B：B1 的 ai-08…ai-14
- subagent C：B2 的 ra-01…ra-08
- subagent D：B2 的 ra-09…ra-16
- subagent E：B3 的 ev-01…ev-08
- 我（Lead）：B0 骨架 + B4 特色页 + B5 校验/图/构建/提交，并逐批 review 数据

### 锚点规则（沿用既有）

- 每篇 ≥2 条真实锚点：`{file, symbol, line, snippet, why}`，snippet 首行必须在该文件逐字命中，行号偏差 ≤8（`validate-project.mjs --anchors` 兜底）。
- 文档引用写真实行号区间；文档没有的实现必须写进 `points.missing` 或 `hardErrors`，不许编。
- 评分诚实：80–88 为主，确有取舍数字与源码细节才上 90。

---

## 七、验收清单

1. `node scripts/validate-project.mjs --anchors` 对 108 篇（70 + 38）零问题。
2. `astro build` 页数 ≥ 240，无 TS 报错。
3. CDP 冒烟：`/ai`、`/ai/ragent/ra-01`、`/ai/pipeline`、`/ai/prompt`、`/ai/toolbox`、`/ai/glossary`、复习队列含 AI 题、闪卡能抽到 AI 题。
4. 新架构图 ≥6 张（AI 总览、八阶段流水线、检索漏斗、意图树、记忆压缩时序、MCP 调用链）。
5. 提交信息按批次拆，`origin master` 推送。

---

## 八、风险与取舍

| 风险 | 处理 |
| --- | --- |
| 三份文档共 8266 行，全量精读成本高 | 每篇只精读对应行区间 + 代码交叉验证；由 subagent 分担，Lead 抽查 |
| 代码 945 个 java，锚点容易指错 | 一律 `validate-project.mjs --anchors` 回归，禁止手写行号不验证 |
| 38 篇一次性上线质量不稳 | 分批（B1/B2/B3）提交，每批独立验收 |
| 与现有项目区风格割裂 | 共用组件与排版，只在流程线/辅助色上做 AI 差异化 |
| 评测篇数字多、易与代码脱节 | eval 篇的指标以 `评测.md` 为准，标注「文档口径」，代码侧只引真实类名（旁路接口、Runner 在另一仓库时明确说明） |


---

## 落地结果（已完成）

- **题目**：38 篇全部 reviewed —— AI 底座 14（ai-01…14）、Ragent 项目 16（ra-01…16）、评测 8（ev-01…08）。均分 85，247 条源码锚点，112 条硬伤（level 1 共 13 条）。
- **schema 扩展**：`pipeline`（2 篇）、`promptBlocks`（4 篇）、`fullAnswer`（38/38 篇）、`params`（若干）。
- **页面**：`/ai` 首页、`/ai/overview`、`/ai/[module]/`、`/ai/[module]/[id]`、`/ai/pipeline`、`/ai/intent`、`/ai/prompt`、`/ai/toolbox`、`/ai/glossary`；`QuestionDetail` 组件抽出，项目区与 AI 区共用，强调色由 `data-tone` 切朱 / 铜青。
- **视觉**：新增铜青 `#2F6F73`（暗色 `#6FB8BC`）与竖向流程线签名（`.ai-flow`/`.ai-dot`/`.ai-tag`）；8 张 AI 架构图（总览 / 八阶段 / 检索漏斗 / 记忆压缩 / 意图树 / MCP / SSE / 评测四段）。
- **记忆系统贯通**：复习队列、闪卡、关键词默写、一页纸、搜索、架构图、源码地图自动纳入 AI 题，链接按模块跳 `/ai/...`。
- **口径纠偏**：文档与代码冲突处一律以代码为准并写成 hardErrors（详见 `_review/Ragent-完成度.md` 第五节 level 1 清单），其中最关键的几条：MCP 已整体迁出 RAG 流水线、混合检索默认只开向量一路、`ragent.eval.enabled` 而非 `app.eval.enabled`、`default-top-k=10` 而非 5。
- **未完成**：评测 harness 独立仓库未提供（评测篇按文档口径，A 分压到 20–24）。
