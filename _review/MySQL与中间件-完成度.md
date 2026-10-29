# MySQL / 中间件专区 · 完成度

## 范围

`_review/MySQL_Redis_RocketMQ.md`（154 KB / 2,360 行）→ 73 题，拆成两个专区：

| 专区 | 路由 | 题数 | 内容 |
| --- | --- | --- | --- |
| MySQL | `/mysql` | 46 | 基础篇 15 / 索引篇 9 / 事务篇 7 / 锁 4 / 日志 8 / 性能调优 2 / 其它 1 |
| 中间件 | `/mw` | 27 | Redis 25（数据结构 / 持久化 / 高可用 / 缓存三兄弟 / 集群）、RocketMQ 2 |

## 阅读层级（2026-10-29 调整）

- **移除**「深挖 · 源码级」折叠块与「源码锚点」区块：这 73 题来自 md 原文，没有可核对的源码行号，留着反而像假证据。
- **新增**「可能追问 · 满分回答」：每题 2–3 条面试官视角追问，回答按「结论先行 → 机制/证据 → 边界取舍」组织，约 120–320 字，事实全部对齐原文。
- 保留「3 分钟 · 正式面主答」「要点」「会翻车的地方」「原文层」，够从背诵到深挖一层。

## 做法

与项目区、AI 区同一套：

1. **题库**：`scripts/gen-mw-data.mjs` 按 `### Qx` 切片，抽取一句话 / 60 秒 / 展开 / 要点 / 追问（原文引用块）/ 坑 / 代码片段，写成 `src/data/project/{mysql,redis,mq}-NN.json`。模块登记进 `project-meta.json`：`mysql.area = db`，`redis/rocketmq.area = mw`。
2. **评分**：全部留空（`total: 0`, `verdict: draft`），不编分数；首页均分只统计已评分的 166 题。
3. **原文层**：`scripts/gen-doc-data.mjs` 支持任意 `_review/*.md#Lx-Ly` 来源，73 篇全文按小节折叠。
4. **页面**：
   - MySQL：`/mysql`（按专题分组的 46 题）、`/mysql/{id}`（详情，`QuestionDetail` 的 `flat` 模式）、`/mysql/read` + `/mysql/read/{id}`（46 篇原文）。
   - 中间件：`/mw`（27 题）、`/mw/{redis,rocketmq}`、`/mw/{module}/{id}`、`/mw/read` + `/mw/read/{id}`（27 篇原文）。
5. **导航**：`笔记 → Java基础`、新增 `MySQL`、保留 `中间件`；首页新增 MySQL 入口卡与统计分组。
6. **校验**：`validate-project.mjs` 对 `status in {draft,pending}` 的抽取初稿免掉评分/锚点/默写要求；`validate-doc.mjs` 覆盖 181 篇原文，MySQL 走 `dist/mysql/read`。

## 数字

- 页面：**642 页**（MySQL 94 + 中间件 58，其余为原站点 + Java/Hot200/项目/AI）
- 追问：73 题 / 217 条，平均 3.0 条/题（分布：MySQL 138、Redis 73、RocketMQ 6）
- 原文：181 篇 / 2.1 MB，最低保真度 **97.3%**（mysql-09），最低渲染覆盖 **98.81%**（redis-15）
- 全站题库：**239 题**（Java 58 + 项目 70 + MySQL 46 + 中间件 27 + AI 38），其中 166 题已评分

## 已知缺口

- 两题原文为空（`mysql-11` DELETE/TRUNCATE/DROP、`mysql-23` 布局相关），页面标「待撰写」，补 md 后重跑生成器即可。
- 5 题原文主体是飞书图片（外链失效），一句话用占位说明，正文建议直接看原文层。
- 抽取稿的 `codeAnchors` 仍留在 JSON 里（供以后补真实源码锚点），但页面在这两个专区不渲染。
