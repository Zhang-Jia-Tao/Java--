# 算法讲解增强分片规范

每个分片是 JSON 数组，元素结构（键名必须一致）：

```json
{
  "slug": "lc53",
  "analogy": "生活类比，2–4 句，把算法的核心动作映射到熟悉场景（不要复述代码）",
  "walkthrough": [
    { "step": 1, "input": "i=0，读入 -2", "state": "cur=-2，best=-2", "answer": "-2", "note": "从当前元素重新开始" },
    { "step": 2, "input": "i=1，读入 1", "state": "cur=1，best=1", "answer": "1", "note": "前缀和变负就丢掉" }
  ],
  "codeWalkthrough": [
    { "line": 4, "code": "cur = Math.max(nums[i], cur + nums[i]);", "q": "为什么不是 cur + nums[i] 直接更新？", "a": "当前一段变成负贡献时必须从当前元素重新起头，否则会把前面的亏损带进来。" }
  ],
  "pitfalls": ["易错点（完整句）", "边界：全负数、空数组等"],
  "complexity": { "time": "O(n)", "space": "O(1)", "why": "只扫一遍，常数个变量" }
}
```

要求：

1. **先读原题**再写：`site/src/data/hot200/<slug>.json` 里有题干、代码、oneLiner；讲解必须与代码实际做法一致，不能换成另一种解法。
2. `walkthrough` 5–8 步，每步用题目里的真实示例数字，状态要能对上；`answer` 是该步结束后的中间结果或最终答案。
3. `codeWalkthrough` 3–5 条，`line` 用代码里真实行号（从 1 开始），`code` 摘该行关键片段，`q` 是要害追问，`a` 120–220 字。
4. `pitfalls` 1–3 条；`complexity` 必须给 time/space/why。
5. 中文口语化，不要 markdown 标题/代码围栏；数组元素数 = 任务给定 slug 数，不增不减。
6. 只写任务指定的那一个分片文件，不改其它文件，不跑构建。
