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
  "code": [
    {
      "title": "这段代码解决什么，一句话",
      "ref": "ExportServiceImpl#exportMenuXml",   // 出处，写成 类名#方法 或仓库相对路径
      "lang": "java",                              // java | sql | js
      "code": "…核心代码原文，保留缩进，逐行\n换行…",
      "notes": [
        { "at": "代码里的一段原文", "text": "为什么这么写、为什么不选另一种写法、代价是什么" }
      ],
      "quiz": [{ "q": "这段最容易被追问的点", "a": "答在代码旁边，一句话" }]
    }
  ],
  "followUps": [{ "q": "最可能被追问的问题", "a": "一句话答案骨架，40 字以内" }],
  "evidence": ["脱敏后仍可验证的事实，如「导出后 menus.xml 恒平铺」"]
}
```

## 核心代码（code）

原来的「三层口述稿」已整体下线，换成核心代码讲解。理由：面试官看的不是你会不会背，是你写的这段代码能不能解释清楚。

| 字段 | 要求 |
|---|---|
| `title` | 一句话说清这段代码解决什么问题，不超过 30 字 |
| `ref` | 出处，`类名#方法` 或仓库相对路径，面试被问「在哪段」能直接答 |
| `code` | **必须是可以逐行追下去的真实代码**，8–120 行；超长的先裁到核心分支，头尾用 `// …` 省略 |
| `notes` | **≥2 条**，每条 `at` 必须是 `code` 里真实出现的一段原文（lint 会比对），`text` ≥15 个汉字 |
| `quiz` | **≥1 问**，问最可能被追问的那一句，答案 40 字以内 |

### 注释写什么、不写什么

- **写**：为什么不是另一种写法、这个写法的代价、边界条件、性能取舍、当时为什么这么定
- **不写**：「这里判断了 x 是否为空」这类把代码翻译成人话的内容——面试官自己会读代码
- 反面例子：`at: "if (entity == null) return;"` + `text: "判空，防止 NPE。"` ← 零信息
- 正面例子：`at: "if (!AUDIT_STATE_PASS.equals(entity.getAuditState()))"` + `text: "外部开放最初要求审核通过才可下载，后来产品侧改成外部即表示已过合规，这一层判断降级为留痕，不再是门控。"`

### 一张卡配几段

2–3 段。挑**决策点**的那段代码，不挑工具方法。一段讲数据结构或落库方式，一段讲状态流转或并发，一段讲边界与容错，覆盖面试官三个最常问的方向。

### 代码怎么写进 JSON

`code` 是一个字符串，换行用 `\n`。缩进保留原文（Java 规定 4 空格或 tab 都行，同一段内统一）。不要在这里写 HTML 转义，页面渲染时会做转义与高亮。

## 内容要求

- `requirement` 写"业务为什么提"，不是"我做了什么"
- `implementation.decisions` 至少 2 条，必须是真决策（有替代方案、有代价），不是功能罗列
- `defects` 有几条写几条，没有就空数组；每条必须能回答"你怎么发现的"
- `followUps` 3–5 条，挑最可能被追问的；和 `code[].quiz` 分工：quiz 贴着代码问细节，followUps 问整块需求的设计
- `code` 至少 1 段；每段注释里都要有数字（行数、上限、超时、倍数），lint 会查
- 数字只写确定的（提交行数、接口数、字段数、白名单代数），不编百分比

## 输出纪律

UTF-8 无 BOM，单文件单个对象，`JSON.parse` 自验通过。只写自己负责的文件。
