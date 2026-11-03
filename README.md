# Java 终极笔记

面向 2026 届秋招 / 春招的 **Java 后端面试笔记站**，附带一套能跑起来的全栈项目骨架。
所有内容都是静态生成的（Astro 5 + Tailwind 4），可以本地起服务器随手翻，也可以构建后丢到任意静态托管。

- 站点：**1135 个页面**，`sitemap.xml` 868 条 URL
- 栏目：Java 基础 / Hot200 / 项目 / 实习 / MySQL / 中间件 / AI / 前端 / 训练 / 考频 / 投递 / 简历
- 额外：`mini-fullstack/` —— 登录 + 分页 + 上传的可运行全栈骨架（[单独 README](mini-fullstack/README.md)）

---

## 1. 三条命令打开

**Windows：双击 `start.cmd`**（内部用 `-ExecutionPolicy Bypass`，绕开公司电脑常见的 Restricted 策略）。

命令行方式：

```powershell
cd Java终极笔记
.\start.ps1

.\start.ps1 -Stop            # 停止（含 4321 / 4400）
.\start.ps1 -Build           # 生产构建 + preview（看最终产物，而不是 dev 预览）
.\start.ps1 -NoEditor        # 不启批注服务（只读浏览）
.\start.ps1 -Clean           # 清 node_modules / dist / 日志
```

**macOS / Linux**

```bash
cd Java终极笔记
chmod +x start.sh && ./start.sh
```

脚本会：检查 Node 版本 → 首次自动 `pnpm install` → 起 **Astro dev（4321）** →
起 **批注服务（4400）** → 打开浏览器。

两个端口的分工：

| 端口 | 进程 | 作用 |
|---|---|---|
| 4321 | `astro dev`（`-Build` 时是 `astro preview`） | 站点本体 |
| 4400 | `scripts/anno-server.mjs` | 批注 / 内容编辑 / 使用统计的本地持久化 |

**只启 4321 也能正常阅读**，只是你的批注和改动只存在浏览器 localStorage 里，换浏览器就没了。

### 手动方式（等价）

```bash
cd site
pnpm install

# 终端 1
pnpm dev            # http://127.0.0.1:4321

# 终端 2（可选但推荐）
pnpm anno           # http://127.0.0.1:4400
```

> 如果 `pnpm dev` 报 `ERR_PNPM_IGNORED_BUILDS`（新版 pnpm 对 esbuild/sharp 的 build 脚本有
> supply-chain 策略），直接调 CLI 即可：`node node_modules/astro/astro.js dev --port 4321`。
> `start.ps1` / `start.sh` 内部走的就是这条路，所以脚本不会踩这个坑。

---

## 2. 仓库里有什么

| 目录 | 内容 |
|---|---|
| `site/` | 笔记站本体（Astro）。所有页面、组件、数据都在这里 |
| `mini-fullstack/` | 可运行的全栈骨架：Spring Boot 3 + Vue 3 + Nginx/Compose，一键启动见其 README |
| `_review/` | 内容审阅用的中间产物（部分被 gitignore） |
| `*方案.md` | 各栏目的内容设计文档（Hot200 / 项目经历 / 网站） |
| `.git/` | 版本库（远端 `github.com/Zhang-Jia-Tao/Java--`） |

### site/ 内部结构

```
site/
├─ src/
│  ├─ pages/            页面（文件即路由）
│  │  ├─ index.astro    首页
│  │  ├─ notes/         Java 基础（章 → 题）
│  │  ├─ hot200/        Hot200 高频题
│  │  ├─ project/       项目经历（14 页）
│  │  ├─ intern/        实习
│  │  ├─ mysql/ mw/     MySQL / 中间件
│  │  ├─ ai/            AI 相关（19 页）
│  │  ├─ frontend/      前端最小集 + mini 项目讲解
│  │  ├─ train/         训练场（drill / review）
│  │  ├─ freq / apply / resume    考频 / 投递 / 简历
│  │  └─ search.astro   全站搜索（构建期生成索引）
│  ├─ components/       24 个组件（导航、批注、编辑器、成绩卡、图表…）
│  ├─ data/             JSON 数据源（题、评分、图表、简历映射…）
│  ├─ layouts/          BaseLayout（含同步服务地址注入）
│  └─ styles/           tokens.css（Tailwind 4 @theme 设计令牌）
├─ scripts/             24 个 Node 脚本：生成 / 合并 / 校验 / 批注服务
├─ public/              静态资源（vendor、图表、图片）
└─ server-data/         本地数据（**gitignore**，见第 5 节）
```

---

## 3. 内容体系

顶栏 12 个入口：

| 入口 | 路径 | 一句话 |
|---|---|---|
| Java 基础 | `/notes` | 按章组织的核心知识，每章带题 |
| Hot200 | `/hot200` | 200 道高频题（分块 + 评分） |
| 项目 | `/project` | 项目经历问答、指标、压测口径 |
| 实习 | `/intern` | 实习期任务记录与表述 |
| MySQL | `/mysql` | 索引 / 事务 / 锁 / 优化 |
| 中间件 | `/mw` | Redis / MQ / 网关等 |
| AI | `/ai` | AI 相关题目与用法 |
| 前端 | `/frontend` | 前端最小集 15 讲 + [mini 项目骨架](/frontend/mini) |
| 训练 | `/train` | 复述训练、间隔复习 |
| 考频 | `/freq` | 题目出现频次统计 |
| 投递 | `/apply` | 投递台账、公司维度跟进 |
| 简历 | `/resume` | 简历映射、一句话模板 |

另外还有若干「工具页」：`/search` 全站搜索、`/map` 知识地图、`/diagrams` 架构图、
`/glossary` 术语表、`/numbers` 关键数字、`/sheet` 速查表、`/errors` 易错点、`/roadmap` 路线图、`/scores` 评分总览。

--- 

## 4. 站点为什么长这样（设计取向）

1. **内容即数据**：题目、评分、图表、简历映射都是 `src/data/*.json`，页面只负责渲染。
   改内容多半不用碰 `.astro`，改数据即可，也就不会破坏「DOM 索引定位」的编辑记录（见第 5 节）。
2. **诚实的评分体系**：`ScoreBadge` / `ScoreBreakdown` 把「能背」和「能讲」分开打，
   扣分项显式列出，不做无脑满分。
3. **单页密度高但可检索**：每页有 TOC 轨、阅读进度、前后题导航，全站搜索在构建期生成索引（不是运行时拉接口）。
4. **零后端依赖**：生产构建是纯静态，`pnpm build` 出 `dist/` 就能托管；
   只有本地编辑/批注需要 4400 那个小服务，且它写的是本地文件，不进仓库。

---

## 5. 本地编辑与批注（这套站最特别的地方）

打开 `http://127.0.0.1:4321`（必须是 `localhost` / `127.0.0.1`）后：

| 能力 | 触发方式 | 落盘位置 |
|---|---|---|
| 就地改正文 | **双击**任意段落 / 列表项 / 标题块 | `site/server-data/content-overrides.json` + localStorage |
| 写批注 | 右下角「批注」按钮 | `site/server-data/annotations.json` |
| 查看使用统计 | 自动记录 | `site/server-data/usage.json` |
| **整库备份** | 批注面板「导出」，或 `pnpm data:export` | `site/backups/notes-backup-<时间>.json` |
| **恢复** | 批注面板「导入」选备份文件，或 `pnpm data:import <文件>` | 写回 `site/server-data/` |

### 换机器 / 重装 / 清缓存前，把数据带走

`site/server-data/` 被 gitignore，只存在本机。批注、就地编辑、实习期编辑、使用统计、复习记录**全在这里**，`uploads/` 里还有你贴进正文的图片。三种方式任选：

```bash
cd site
pnpm data:export                             # → site/backups/notes-backup-20261103-1730.json（图片内嵌 base64）
pnpm data:info backups/xxx.json              # 看看备份里有什么
pnpm data:import backups/xxx.json            # 合并恢复（同 id 取较新的，不重复）
pnpm data:import backups/xxx.json --replace  # 覆盖恢复（先自动备份现状）
```

页面上也能操作：右下角**批注 → 导出**（4400 在线时导整库；没起则只导批注），
**批注 → 导入**选文件即可（整库 JSON 与旧批注 JSON 都认）。

注意：

- 备份是**单个 JSON**，图片 base64 内嵌，好丢网盘；体积随图片数量增长。
- 合并语义：批注按 `id` 去重、取 `at` 较新；计数类（使用统计）取较大值，不会翻倍。
- `--replace` 会先把当前数据导出成 `*-before-import.json` 再覆盖，误操作可回滚。
- 备份默认落在 `site/backups/`（已 gitignore），**不要提交进仓库**。
机制说明（维护时必读）：

- 编辑记录以 **DOM 路径** 为键（相对 `<main>` 的 `nth-child` 链），不是行号也不是内容哈希。
  所以**不要在页面中间插入或删除元素**，否则后面的编辑记录会错位。
  要插入内容，请改 `.astro` 源码重新构建，或加在该页最后。
- 内容同步地址由 `BaseLayout.astro` 注入：本机访问时默认 `http://127.0.0.1:4400`，
  也可在控制台 `localStorage.setItem('dsh:sync', 'http://x.x.x.x:4400')` 手工指定（手机调试用）。
- `site/server-data/` 被 gitignore：**这些是你本机的数据**。换机器要自己拷走，
  或者把它们当作「临时草稿」，定稿后再落到源码里。

---

## 6. 构建与发布

```bash
cd site
pnpm build          # = astro build && node scripts/gen-seo.mjs
pnpm preview        # 本地看 dist 产物（4321）
```

- `astro build` 输出到 `site/dist/`，当前 **1135 页**（约 30 秒）。
- `scripts/gen-seo.mjs` 生成 `sitemap.xml`（868 条，会跳过镜像页）与 robots 相关文件。
- 发布：把 `dist/` 交给任何静态托管即可（这是纯静态站，无 SSR）。
  仓库远端是 `github.com/Zhang-Jia-Tao/Java--`，推送后由你惯用的方式发布。
- 改了导航 / 页脚 / 搜索，记得三处一起改：
  `components/SiteHeader.astro`（顶栏）、`components/SiteFooter.astro`（页脚分组）、
  `pages/search.astro`（搜索索引，否则新页面搜不到）。

### 页面体积与性能备忘

- 站点无图片依赖的页面首屏很小；重页面主要是长列表（Hot200、项目问答）。
- 图表走 `public/vendor` 内的本地脚本，不引外链 CDN。
- 不跑 `pnpm check`（`astro check` 会交互式提示安装 `@astrojs/check`，CI 里会卡住）。

---

## 7. 常用脚本（site/scripts）

| 脚本 | 用途 |
|---|---|
| `anno-server.mjs` | 批注 / 内容编辑 / 统计的本地服务（4400） |
| `gen-seo.mjs` | 生成 sitemap 等 SEO 文件 |
| `backup.mjs` / `backup-lib.mjs` | 本地数据整库备份与恢复（批注/编辑/统计/图片） |
| `validate-expert.mjs` | 校验资深评审批注格式（`--strict` 更严格） |
| `merge-expert.mjs` | 合并专家批注进数据 |
| `gen-freq.mjs` | 统计题目考频 → `data/freq.json` |
| `gen-diagrams.mjs` | 生成架构图数据 → `data/diagrams.json` |
| `parse-project.mjs` / `scaffold-project.mjs` | 解析 / 生成项目页数据 |
| `validate-project.mjs` / `validate-doc.mjs` / `intern-lint.mjs` | 内容校验 |
| `gen-hot200-*.mjs` / `merge-*.mjs` | Hot200 的分块、补充、合并 |
| `intern-apply.mjs` | 投递台账批处理（`--dry` 只预览） |

`site/package.json` 暴露的快捷命令：`pnpm dev` / `pnpm anno` / `pnpm build` / `pnpm preview` / `pnpm intern:apply` / `pnpm data:export` / `pnpm data:import`。

---

## 8. 排错

| 现象 | 原因 | 处理 |
|---|---|---|
| `start.ps1` 报「running scripts is disabled」 | 执行策略 Restricted | 用 `start.cmd`，或 `powershell -ExecutionPolicy Bypass -File .\start.ps1` |
| 4321 打不开 | 端口被占 | 脚本会自动释放；或 `.\start.ps1 -Port 4400` 换个端口 |
| 批注保存后刷新没了 | 4400 没起 | `.\start.ps1` 默认会起；或 `cd site && pnpm anno` |
| 批注面板一直「…」 | 浏览器把地址当非本机（如局域网 IP） | 用 `127.0.0.1` 访问，或设 `localStorage['dsh:sync']` |
| 改了页面标题但搜索搜不到 | 忘了改 `pages/search.astro` | 在搜索索引里补条目 |
| `pnpm dev` 报 `ERR_PNPM_IGNORED_BUILDS` | pnpm 11 对依赖的 build 脚本默认拒绝执行 | 用脚本启动，或 `node node_modules/astro/astro.js dev --port 4321` |
| 构建后某页 404 | 新增页面没被路由匹配 | 检查 `src/pages/` 下的文件名与动态参数 |
| 编辑错位 / 改到别的段落 | 页面中间插入过元素 | 见第 5 节：编辑记录按 DOM 索引存 |

日志：`start.ps1` 会把 dev / anno 输出写到 `.run/`。

---

## 9. 写作与评审约定

- **中文输出**，术语保留英文原词（CORS、JWT、INP 等）。
- **评分必须诚实**：给出分数 + 编号扣分项，不写「完美」「无懈可击」。
- **版本类事实标注时间**（如「Vite 7 / 2025-06」），避免知识截止后被悄悄证伪。
- 每条结论尽量带**可验证的抓手**（命令、现象、面试追问），不写空泛形容词。
- 内容改动分批提交，每批一个 commit，说明改了什么、验证了什么。

---

## 10. 当前状态

- 构建：1135 页 / ~30 秒；sitemap 868 条。
- 内容：12 个栏目齐全；`/frontend` 15 讲 + `/frontend/mini` 项目骨架讲解 + 可运行的 `mini-fullstack/`。
- 待办：资深评审批注还差 499 条（Hot200 103 + 项目 355 + Java 41）；
  项目页的压测口径需要按真实拓扑再校一遍。

有疑问先看 `start.ps1` 头部的注释，再看 `site/scripts/`；这份 README 只做导航，不重复细节。
