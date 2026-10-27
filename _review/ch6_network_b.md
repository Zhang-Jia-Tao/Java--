<!-- 原文抽取自 Java基础问题.pdf，已做字符归一化；分行与个别错字为 PDF 抽取产物，评审时请以语义为准 -->

# 第6章 计算机网络（常见问题 Q3/Q5/Q6/Q7/Q8/Q9）

常见问题:
Q3.TCP的滑动窗口和拥塞控制 ⭐⭐⭐⭐
滑动窗口(流量控制):
代码块
发送方窗口(已发送未确认 + 可以发送): 
┌─────────────────────────────────────────────────┐ 
│ 已确认 │ 已发送未确认 │ 可发送 ( 窗口内 ) │ 不可发送 │ 
│ 0~500 │ 501~700 │ 701~900 │ 901~ │ 
└─────────────────────────────────────────────────┘ 
 ↑ 
 窗口左边界向右滑动 
 
接收方窗口: 
┌─────────────────────────────────────────────────┐ 
│ 已接收已确认 │ 期望接收 ( 窗口内 ) │ 不期望接收 │ 
│ 0~500 │ 501~700 │ 701~ │ 
└─────────────────────────────────────────────────┘ 
 ↑ 
 窗口左边界向右滑动 
 
接收方通过 ACK 告知发送方自己的窗口大小( rwnd ) 
→ 发送方不能发送超过接收方窗口的数据 
→ 防止发送方发送速度超过接收方处理速度 
拥塞控制(防止网络过载):
代码块
拥塞窗口( cwnd )动态调整: 
 
慢启动阶段: 
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
1
2
3

<!--p74-->

 cwnd = 1 MSS 
 每收到一个 ACK → cwnd += 1 MSS 
 → cwnd 指数增长: 1, 2, 4, 8, 16... 
 → 直到 cwnd 达到 ssthresh (慢启动阈值) 
 
拥塞避免阶段( cwnd > ssthresh): 
 每收到一个 ACK → cwnd += 1/cwnd 
 → cwnd 线性增长 
 
丢包检测: 
 超时 → ssthresh = cwnd/2, cwnd = 1 (重新慢启动) 
 3 次重复 ACK → ssthresh = cwnd/2, cwnd = cwnd/2 (快速恢复) 
Q5.HTTPS的工作原理 ⭐⭐⭐⭐⭐
代码块
TLS 握手过程( RSA 密钥交换): 
客戶端 服务端 
 │ │ 
 │ ─── ClientHello ( 支持的 TLS 版本 , 加密套件 , 随机数 ) ── ▶ │ 1 
 │ ◀ ── ServerHello ( 选定的 TLS 版本 , 加密套件 , 随机数 ) ──│ 2 
 │ ◀ ── Certificate ( 服务器证书链 ) ──────────────────│ 3 
 │ ◀ ── ServerHelloDone ─────────────────────────────│ 
 │ │ 
 │ ─── ClientKeyExchange ──────────────────────────── ▶ │ 4 
 │ ( 用服务端公钥加密的 PreMasterSecret) │ 
 │ ─── ChangeCipherSpec ──────────────────────────── ▶ │ 5 
 │ ─── Finished ( 握手摘要 ) ───────────────────────── ▶ │ 6 
 │ ◀ ── ChangeCipherSpec ─────────────────────────────│ 7 
 │ ◀ ── Finished ( 握手摘要 ) ──────────────────────────│ 8 
 │ │ 
 │ 双方用 PreMasterSecret 派生对称密钥 │ 
 │ │ 
 │ ─── 应用数据(加密) ─────────────────────────────── ▶ │ 
 │ ◀ ── 应用数据(加密) ───────────────────────────────│ 
为什么不直接用非对称加密传输数据:
•
非对称加密(RSA2048位):比对称加密(RC4/AES)慢100~1000倍
•
HTTPS用非对称加密交换对称密钥,之后用对称密钥加密实际数据
Q6.连接池(数据库/HTTP/Redis)的原理
连接池的核心机制:
4
5
6
7
8
9
10
11
12
13
14
15
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19

<!--p75-->

代码块
应用启动 
 ↓ 
连接池初始化:建立 initialSize=5 个连接 
 ↓ 
请求到来 
 ↓ 
从池中借出连接( getResource() ) 
 ↓ 
业务逻辑使用连接(查询 / 写入) 
 ↓ 
归还连接到池( close() → 归还池,不是真正关闭) 
 ↓ 
后台线程定时检测空闲连接健康性( testWhileIdle ) 
 ↓ 
应用关闭时:关闭所有连接( destroy-method="close" ) 
为什么连接要复用:
代码块
每次新建连接(无池): 
 建立 TCP 连接: 1.5 RTT ( 30~100ms ) 
 TLS 握手(如 HTTPS ): 1~2 RTT (如果数据库用 SSL ) 
 数据库认证: 0.5 RTT 
 总计:每个请求多花 50~200ms 
 
使用连接池: 
 首次建立连接(池预热): 50~200ms 
 后续请求:从池中借出: 0.1~1ms 
 总计:每个请求几乎无额外开销 
Q7.JDBC的 Connection 是不是线程安全的?
不是线程安全的。
代码块
// 错误用法:多线程共用一个 ConnectionConnection conn = 
dataSource.getConnection(); 
Thread A: conn.setAutoCommit(false); conn.insert(); 
Thread B: conn.commit(); // ← 并发修改事务状态,数据混乱 
正确的多线程连接管理:
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
1
2
3
4
5
6
7
8
9
10
1
2
3

<!--p76-->

代码块
// 方式 1 :每个线程一个 Connection (从池中各自借出) 
Connection conn1 = dataSource.getConnection(); // Thread A 
Connection conn2 = dataSource.getConnection(); // Thread B 
// 各自独立,互不干扰 
 
// 方式 2 :同一个 Connection ,用 synchronized 包裹事务操作 
synchronized (conn) { 
 conn.setAutoCommit(false); 
 conn.insert(); 
 conn.commit(); 
} 
 
// 项目中的做法:每次查询从池中借出独立的 Connection 
try (SqlSession session = sqlSessionFactory.openSession()) { 
 // session 持有 Connection 
 // 业务逻辑 
} // 关闭 session → 归还连接到池 
Q8.CDN的工作原理
代码块
用戶请求 www.example.com/logo.png 
 ↓ 
DNS 解析:域名 → CDN 专用域名 
 ↓ 
DNS 智能调度:最近 / 最快 / 最空闲的 CDN 节点 
 ↓ 
CDN 边缘节点检查缓存: 
 ├── 命中( Cache Hit ):直接返回缓存内容 
 └── 未命中( Cache Miss ):回源(回源站拉取) → 缓存 → 返回 
 ↓ 
响应给用戶(从 CDN 节点,不是源站) 
CDN的缓存策略:
•
静态资源(图片/CSS/JS):长期缓存( Cache-Control: max-age=31536000 )
•
动态内容:不缓存或短缓存
Q9:浏览器中输入URL到叶面显示的完整过程?
代码块
1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
1
2
3
4
5
6
7
8
9
10
11

<!--p77-->

1. URL 解析 → 提取协议、域名、路径 
2. DNS 解析:浏览器缓存 → 系统缓存 → hosts 文件 → DNS 服务器 
 域名 → IP 地址( A 记录 / CNAME ) 
3. 建立 TCP 连接( HTTP )或 TLS 握手( HTTPS ) 
4. 发送 HTTP 请求 
 GET /index.html HTTP/1.1 
 Host: www.example.com 
 ... 
5. 服务器处理请求,返回 HTTP 响应 
 HTTP/1.1 200 OK 
 Content-Type: text/html 
 ... 
 <html>...</html> 
6. 浏览器解析 HTML → 构建 DOM 树 
7. 遇到 <link> → 加载 CSS 
8. 遇到 <script> → 执行 JS (可能阻塞渲染) 
9. 构建渲染树 → 布局 → 绘制 
10. 叶面显示 
