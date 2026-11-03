# mini-fullstack · 全栈最小可运行骨架

一个「能跑、能讲、能写进简历」的全栈项目骨架：**登录 + 分页列表 + 上传 + 同域部署**。
刻意克制功能，把功夫花在边界上：401 静默刷新（并发单飞）、refresh token 轮换与重放检测、
查询条件同步 URL、上传白名单校验、Nginx 同域反代。

> 配套讲解在站点 `/frontend/mini`：每个文件解决什么问题、面试官会顺着问什么。
> 本目录是「可以直接跑起来」的版本。

---

## 1. 三条命令启动

**Windows：双击 `start.cmd` 即可**（它用 `-ExecutionPolicy Bypass` 起 PowerShell，绕开公司电脑常见的 Restricted 策略，只对本次进程生效）。

命令行方式：

```powershell
cd mini-fullstack
.\start.ps1
# 如果提示「running scripts is disabled」：
powershell -NoProfile -ExecutionPolicy Bypass -File .\start.ps1
```

**macOS / Linux**

```bash
cd mini-fullstack
chmod +x start.sh && ./start.sh
```

脚本会自动：检查 Node ≥ 20.19 与 JDK ≥ 17 → 首次缺依赖时安装前端依赖 →
后台起后端（8080）→ 前台起前端（5173）→ 打开浏览器。

- 默认用 **H2 文件库**，不需要 MySQL、不需要 Docker（数据落在 `backend/data/mini.mv.db`）。
- 停止：`.\start.ps1 -Stop`（或 `./start.sh stop`）
- 只起后端：`.\start.ps1 -BackendOnly`；只起前端：`.\start.ps1 -FrontendOnly`
- 换 MySQL：见第 6 节。

演示账号：`demo` / `123456`（首次启动自动创建，并塞 30 条示例任务）。

访问：<http://127.0.0.1:5173>（端口在 `vite.config.ts` 里固定为 IPv4 回环，避免 Windows 只绑 `::1` 导致探活失败）

---

## 2. 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| JDK | 17+（推荐 21） | Spring Boot 3.4 最低 17 |
| Node | 20.19+（Vite 7 要求） | `node -v` 看一眼 |
| Maven | 3.9+ | 或在 IDEA 里跑，脚本会检测 |
| MySQL | 8.0+ | 可选，默认用 H2 |
| Docker | 可选 | 只用于整容器部署 |

---

## 3. 目录结构

```
mini-fullstack/
├─ start.ps1 / start.sh          一键启动 / 停止
├─ .env.example                  可覆盖的配置（复制成 .env）
├─ docker-compose.yml            web + api + db 三容器
├─ deploy/nginx.conf             非容器部署用的 Nginx 配置
├─ backend/
│  ├─ pom.xml
│  ├─ Dockerfile
│  └─ src/main/
│     ├─ java/com/example/mini/
│     │  ├─ MiniApplication.java         启动 + 种子数据
│     │  ├─ common/                      统一响应体 / 业务异常 / 全局异常
│     │  ├─ config/SecurityConfig.java   无状态鉴权、密码编码器
│     │  ├─ auth/                        JWT 签发校验、过滤器、登录刷新、refresh 轮换
│     │  ├─ user/                        用户实体与仓储
│     │  ├─ task/                        任务实体、仓储、服务、接口
│     │  └─ file/                        上传落盘与接口
│     └─ resources/application.yml
└─ frontend/
   ├─ package.json · vite.config.ts · tsconfig.json · index.html
   ├─ Dockerfile · nginx.conf
   └─ src/
      ├─ main.ts · App.vue · router.ts
      ├─ api/http.ts                     axios 实例 + 401 单飞刷新
      ├─ stores/auth.ts                  access 只存内存
      ├─ views/LoginView.vue · TaskListView.vue
      ├─ components/UploadButton.vue
      └─ types/api.ts                    与后端契约
```

---

## 4. 接口一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | `/api/ping` | 否 | 健康检查，启动脚本靠它探活 |
| POST | `/api/auth/login` | 否 | 返回 access（15 分钟），refresh 走 httpOnly Cookie |
| POST | `/api/auth/refresh` | Cookie | 轮换：旧 refresh 立即作废；重复使用触发重放检测 |
| POST | `/api/auth/logout` | 是 | 吊销当前 refresh 会话 |
| GET | `/api/tasks?page=1&size=10&kw=` | 是 | 分页（**page 从 1 开始**）+ 关键词，只返回自己的数据 |
| POST | `/api/tasks` | 是 | 新建，`ownerId` 只取 token，忽略请求体 |
| POST | `/api/files` | 是 | 上传图片，返回 `/uploads/xxx.jpg` |

统一响应：`{ "code": 0, "msg": "ok", "data": ... }`；失败时 HTTP 状态码表达传输层，
`code` 表达业务层（`40100` 未登录、`40300` 无权限、`40001` 参数问题）。

---

## 5. 验收清单（做完这个项目要能自己过一遍）

1. 登录后刷新页面仍是登录态（access 在内存、refresh 在 Cookie）
2. access 过期 → 静默续期一次成功；refresh 也失效 → 跳登录并带回跳地址
3. 并发 5 个接口同时 401 → Network 里只出现 1 次 `refresh`
4. 复制列表页 URL 到新标签页 → 分页与关键词完全复现
5. 快速连续改关键词 → 不出现旧结果覆盖新结果
6. 传 6MB 文件被前端拦下；传 `.exe` 被后端拦下；传 jpg 成功
7. 直接访问 `/tasks` 刷新不 404（SPA 回落）
8. Network 中所有 `/api` 同域，无 OPTIONS 预检
9. 换一个账号登录，看不到别人的任务（水平越权）
10. 第二次用同一个 refresh 换票 → 该 refresh 家族被吊销（重放检测）

---

## 6. 换成 MySQL

```bash
# 1) 起库（有 Docker 时）
docker compose up -d db

# 2) 用 mysql profile 启动后端
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

或直接改 `.env`（复制 `.env.example`）：

```
SPRING_PROFILES_ACTIVE=mysql
MYSQL_URL=jdbc:mysql://localhost:3306/mini?useSSL=false&serverTimezone=Asia/Shanghai
MYSQL_USER=root
MYSQL_PASSWORD=root
```

首次连 MySQL 时把 `ddl-auto` 设为 `update` 建表，稳定后改回 `validate`。

---

## 7. 整容器部署

```bash
cp .env.example .env      # 至少改 JWT_SECRET
docker compose up -d --build
# 打开 http://localhost:8080
```

三个容器：`web`（Nginx 出静态 + 反代 /api）、`api`（Spring Boot）、`db`（MySQL）。
对外只暴露 8080，api 与 db 不出宿主端口。

---

## 8. 排错

| 现象 | 原因 | 处理 |
|---|---|---|
| 启动脚本报找不到 java | 未装 JDK17+ 或 JAVA_HOME 指向 JDK8 | 装 JDK21，重开终端 |
| 前端 5173 起来了但接口 404 | 后端没起 | 看 `.run/backend.log`，确认 8080 有 `/api/ping` |
| 登录一直 401 | 后端种子数据没跑 | 删 `backend/data/` 重启（H2 文件库） |
| 刷新页面掉登录 | refresh Cookie 被浏览器拦（Secure/SameSite） | 本地是 http，`COOKIE_SECURE=false` |
| 上传 413 | 超过 5MB | 调 `spring.servlet.multipart.max-file-size` |
| 部署后刷新 404 | Nginx 缺 `try_files` | 见 `deploy/nginx.conf` |
| 图片不上 | 路径没挂载 | 容器里 web 与 api 共享 `uploads` 卷 |

日志位置：`.run/backend.log`、`.run/frontend.log`。

---

## 9. 设计说明（面试要能讲的部分）

- **access 只放内存**：localStorage 任何脚本都能读，第三方依赖被投毒即失守；刷新页面靠 httpOnly Cookie 里的 refresh 换新的 access。
- **单飞刷新**：首屏常有 3~5 个并发请求，token 过期会同时 401；不单飞就是 5 次刷新，在轮换机制下前面几次 refresh 立即作废，用户被踢。`refreshing ??=` 把并发收敛成一次。
- **refresh 轮换 + 家族吊销**：每次刷新旧 token 立刻失效；同一个 token 被用第二次，说明可能泄露，整个家族吊销并要求重新登录。
- **同域**：dev 用 Vite proxy、线上用 Nginx 反代，前端代码里不出现第二个域名，CORS 相关的问题从根上消失。
- **归属只取 token**：`@AuthenticationPrincipal Long uid`，请求体里的 ownerId 一律忽略，这是水平越权最常见的入口。
- **H2 默认**：降低启动门槛；线上切 MySQL 只改 profile，代码不动。

---

## 10. 已知限制（别在简历里吹过头）

- 没有单元测试与 E2E 框架（下面的「已实测」是我用脚本跑的黑盒验证，不是 CI 里的测试）。
- 上传落本地磁盘、单实例；生产要换对象存储 + 预签名 URL。
- 没有实现分片上传与秒传，只做了单文件 5MB。
- 权限只有「登录用户看自己的数据」，没有 RBAC。
- 前端状态只做到「够用」，没有做多标签页同步。

---

## 11. 已实测（本机跑过，不是「应该能跑」）

后端 20 项（`java -jar` + curl 等效请求）：

| 覆盖点 | 结果 |
|---|---|
| `/api/ping` 健康检查 | 200，`code=0` |
| 未登录访问受保护接口 | 401 + `code=40100`，格式统一 |
| 登录 / 密码错误 | 200 下发 access(144 字符) + refresh Cookie；错误 → `40103` |
| 分页 / 关键词 | 30 条种子数据、每页 10 条、关键词命中 11 条 |
| 新建 / 改状态 / 空标题 | TODO → DOING；空标题被 `@NotBlank` 拦下返回中文提示 |
| refresh 轮换 | 换票成功，旧的立即失效 |
| **旧 refresh 重放** | 401 + `code=40101` |
| **重放后整条 family 吊销** | 新 refresh 也失效（这里踩过一次坑：吊销动作在 `rotate()` 事务里会被回滚，已改成 `REQUIRES_NEW` 独立事务） |
| 上传 PNG | 200，返回 `/api/files/xxx.png`，再读回内容一致 |
| exe 改名 jpg / 文本改名 png | 400 + `code=40012`（魔数校验） |
| 路径穿越 `../pom.xml` | 400 非法文件名 |
| 未登录上传 / 登出后 refresh | 401 / 401 |

前端 11 项（真实浏览器：Chrome headless + CDP）：

| 覆盖点 | 结果 |
|---|---|
| 未登录访问 `/tasks` | 跳 `/login?redirect=/tasks` |
| 登录 | 进入列表，10 行，`1 / 3 · 共 30 条` |
| 搜索 | URL 变 `?kw=示例任务+1`，结果 11 条 |
| 翻页 | URL 变 `?page=2&kw=...`，分页器 `2 / 2` |
| 硬刷新 | 仍是登录态（bootstrap 用 Cookie 换 access），**refresh 只调 1 次**（单飞） |
| 深链 `/tasks?page=2` | 直接复现第 2 页 |
| 控制台 | 无未捕获异常 |

没有验证到的：MySQL profile、Docker Compose、Nginx 反代（本机没有 Docker / MySQL / Nginx），
以及「access 15 分钟到期」的真实等待场景（用重放与刷新间接覆盖了换票逻辑）。