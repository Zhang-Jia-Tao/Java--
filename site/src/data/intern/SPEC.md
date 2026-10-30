# 实习经历任务卡 · 写作规范

一个任务块 = 一个 JSON 文件，放在 `src/data/intern/tasks/<id>.json`。这是页面上的一张卡片，也是面试时的提词卡。

## 脱敏红线（硬性）

公司名、内部代号一律用别名，代码细节**必须保留原样**：

- 禁止出现：真实雇主名、`com.hikvision` 包路径、内部仓库代号（`salzburg` / `ids-*`）、个人账号名。完整黑名单不进版本库，放在被 gitignore 的 `site/.private-wordlist.json`，由 `scripts/intern-lint.mjs` 扫描
- 必须保留：类名（`ComponentMenuServiceImpl`）、方法名（`batchUpdateComponentMenu`）、表名（`artifact_product_menu`）、字段名（`c_menu_group`）、配置项（`menu.H5List`）、分支名、提交 hash 前 7 位
- 业务系统缩写（SPS / PVIA / hidoapi / SPRDC 等）可以留在**类名、分支名**里（如 `SpsRestClient`、`feature/pvia-242`），但**叙述正文**统一写成「上游配单系统」「版本适配系统」「外部授权平台」「配单平台」「权威数据源」
- 公司写 `A 厂` / `B 行`；仓库写别名（产品中心服务 / 封装服务 / 组件模型服务 / 组件包服务 / 产品模型服务）

## 字段

```json
{
  "id": "hv-pkg-shell",              // 与文件名一致
  "seq": 15,                          // 总览排序用
  "company": "A",                     // A | B
  "project": "menu",                  // spr | menu | export | mail
  "title": "组件包导出导入：菜单分组壳与格式返工",
  "branch": "feat/20260918_配置菜单下载项",
  "dateRange": ["2026-09-20", "2026-10-29"],
  "nature": "新功能 + 返工",           // 新功能 / 缺陷修复 / 线上排查 / 功能优化 / 版本适配
  "difficulty": 4,                    // 1-5，按面试被追问的烈度
  "oneLiner": "一句话价值，能单独当面试开场白",
  "requirement": {
    "raw": "原始需求，两句以内，说清做什么",
    "why": "为什么现在做——业务驱动或线上问题",
    "acceptance": ["验收标准，2-3 条，可判定"]
  },
  "implementation": {
    "services": [{ "alias": "组件包服务", "repo": "component-package-manager", "role": "在链路里干什么" }],
    "keyClasses": ["ExportServiceImpl", "ImportServiceImpl"],
    "flow": ["① 导出：…", "② 导入：…"],        // 3-6 步，能照着讲
    "decisions": [
      { "chose": "选了什么", "whyNot": "为什么不是另一条路", "cost": "代价是什么" }
    ]
  },
  "defects": [
    {
      "title": "壳方案破坏格式契约",
      "symptom": "现象：谁发现了什么",
      "trace": "定位路径：从哪个日志/测试/对比发现",
      "rootCause": "根因，一层机制",
      "fix": "修法",
      "prevent": "怎么防：加了什么测试或校验",
      "commits": ["6e25bdb"]
    }
  ],
  "metrics": [{ "label": "净变更", "value": "+312 / −226 行" }],
  "commits": [{ "repo": "component-package-manager", "hash": "5fb30f9", "date": "2026-09-20", "subject": "…", "add": 994, "del": 8 }],
  "speak": { "s60": "…", "s180": "…", "s600": "…" },
  "followUps": [{ "q": "最可能被追问的问题", "a": "一句话答案骨架，40 字以内" }],
  "evidence": ["脱敏后仍可验证的事实，如「导出后 menus.xml 恒平铺」"]
}
```

## 口述稿三层（speak）

沿用全站口径：汉字 4.3 字/秒，含段落停顿约 250 字/分钟。

| 层 | 汉字数 | 段落 | 要求 |
|---|---|---|---|
| `s60` | 200–260 | 3–5 | 结论先行，第一句能单独当答案；不复述需求 |
| `s180` | 580–720 | 6–8 | 每段首句结论句；含机制、具体字段/接口名、一处「什么时候不这么用」 |
| `s600` | 720–920 | 5–8 | 深挖：机制细节、边界、故障归因、如果重做会怎么改 |

口吻：研三应届生第一人称，短句，允许「我这边」「说白了」。禁内心独白（加分点 / 拉开差距 / 最容易丢分 / 但注意 / 整个推翻）。不编造项目事实——只写提交和文档里有的。

## 内容要求

- `requirement` 写"业务为什么提"，不是"我做了什么"
- `implementation.decisions` 至少 2 条，必须是真决策（有替代方案、有代价），不是功能罗列
- `defects` 有几条写几条，没有就空数组；每条必须能回答"你怎么发现的"
- `followUps` 3–5 条，挑最可能被追问的
- 数字只写确定的（提交行数、接口数、字段数、白名单代数），不编百分比

## 输出纪律

UTF-8 无 BOM，单文件单个对象，`JSON.parse` 自验通过。只写自己负责的文件。
