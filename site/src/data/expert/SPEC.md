# 资深工程师评审批注规范（expert shards）

每个分片是 JSON 数组，元素结构（键名必须一致）：

```json
{
  "id": "jx-01",
  "role": "java",
  "comments": [
    {
      "scope": "s60",
      "kind": "risk",
      "quote": "原话片段，≤60 字，可空字符串",
      "text": "评审批注正文，80–220 字"
    }
  ]
}
```

## 字段口径

- `role`：`"java"`（Java 资深工程师）或 `"ai"`（AI 资深工程师）。一个分片内统一。
- `scope`（锚到内容的哪一块）：
  - 题库类（project 族）：`oneLine` / `s60` / `s180` / `s600` / `points` / `pitfalls` / `followUps` / `metrics` / `variants` / `whole`
  - Hot200：`statement` / `approach` / `code` / `walkthrough` / `complexity` / `pitfalls` / `whole`
  - Java 基础（notes）：`original` / `summary` / `checklist` / `followUps` / `improved` / `whole`
- `kind`（评论类型，六选一）：`praise` 亮点 / `risk` 风险 / `version` 版本口径 / `depth` 深度补强 / `production` 生产现实 / `provenance` 溯源
- `quote`：从该题**真实内容**里摘的原话片段（≤60 字），让读者一眼对上位置；没有合适片段就给空串。
- `text`：80–220 字。必须具体、可执行：说清「为什么这么判 + 面试现场会怎样 + 怎么讲更好」。禁止空话（如「讲得不错」「可以更深入」）。

## 条数与质量

- 每题 3–5 条；`kind` 至少覆盖 2 种；`praise` 每题最多 1 条。
- **不要重复**该题已有 `review.hardErrors` / `deductions` 的结论——那些是评分口径。资深批注是另一层：资深面试官听完会怎么想、版本是否过时、生产上哪里不成立、数字经不经得起追问。
- 每条 `text` 开头不要写「这条评论」「本题」之类空转词，直接给判断。
- Hot200 的 `scope: "code"` 评论若指向具体行，在 `text` 里写「L7：…」格式的行号（渲染端会做行跳转）。

## 输出纪律

- 字符串内不要裸换行（需要分层用 `\n`）。
- UTF-8 无 BOM；顶层必须是数组；`JSON.parse` 可解析。
- 数组元素个数 = 任务给定的题数，不增不减；`id` 与任务一致。
- 只写任务指定的那一个分片文件；不修改任何题目源文件；不跑构建。
- 若输出文件已存在且元素数等于任务题数，直接回复 done，不要重写。
