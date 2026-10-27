# 第2章 并发 —— 面试稿评分（Rubric v1）

> 评审人：资深 Java 面试官（P8，主考 JUC/并发）
> 被评审文件：`_review/ch2_concurrency.md`（349 行，10 题，已全文读完）
> 评分口径：A 准确 40 / B 完整 25 / C 深度 20 / D 表达 10 / E 亮点 5，总分 = 五项之和。
> 抽取误差（"叶缺失"=页缺失、"用戶/叶面/可观性"等）不扣分；只有技术性表述错误才计硬伤。

---

## 一、评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 2-1 | 线程的创建方式有哪些 | 32 | 20 | 15 | 9 | 5 | **81** | 良好 |
| 2-2 | 进程的通信方式 | 32 | 18 | 12 | 8 | 2 | **72** | 及格 |
| 2-3 | 不同线程之间如何通信 | 36 | 19 | 14 | 8 | 2 | **79** | 及格 |
| 2-4 | JUC 包下常用的类 | 38 | 17 | 13 | 9 | 3 | **80** | 良好 |
| 2-5 | synchronized 与 ReentrantLock 及应用场景 | 34 | 20 | 15 | 9 | 4 | **82** | 良好 |
| 2-6 | ThreadLocal 作用/原理/kv/问题/解决 | 34 | 21 | 16 | 9 | 5 | **85** | 良好 |
| 2-7 | volatile 是线程安全的吗、为什么 | 37 | 18 | 13 | 9 | 2 | **79** | 及格 |
| 2-8 | 什么情况产生死锁、如何解决 | 37 | 20 | 14 | 9 | 3 | **83** | 良好 |
| 2-9 | 如何创建线程池、常见参数 | 38 | 22 | 15 | 9 | 3 | **87** | 良好 |
| 2-10 | 线程池参数调优或监控方法 | 35 | 18 | 13 | 8 | 3 | **77** | 及格 |

- **本章平均分：80.5** ｜ 最高 87（2-9）｜ 最低 72（2-2）
- **无一道进入 90+**：卡点高度一致——B（必答点）与 C（原理深度）双项欠账，A 项还有 3 处硬伤。
- 判档说明：80-89"良好"= 有 1 处中等错误或 2-3 个必答点缺失；70-79"及格"= 有硬伤或明显遗漏，面试官会追问到答不出。

---

## 二、逐题点评

### 2-1 线程的创建方式有哪些 —— 81 分（良好）

- **得分**：A32 / B20 / C15 / D9 / E5
- **必答点核对**：继承 Thread ✅；实现 Runnable ✅；Callable+FutureTask ✅；线程池（Executor 框架）✅；start vs run ✅（"真正启动新线程、native 方法、JVM 调度执行 run"全对）；单继承/任务-线程耦合缺点 ✅；FutureTask.get 阻塞 ✅；Executors 快捷方法 vs ThreadPoolExecutor 七参数 ⚠️（这里只作"优化补充"一句带过，没展开，与 2-9 重复但没有深度）；`IllegalThreadStateException` ❌；`submit` vs `execute`、`ExecutionException` 包装 ❌；JDK21 虚拟线程/`Thread.ofVirtual` ❌。
- **硬伤**：
  1. **"以上这四种方式，都是基于 Runnable 接口。"** → 正确说法：Runnable 与 Callable 是**两个并列接口**（Callable 有返回值、可抛受检异常、无 `run`，只有 `call`）。之所以能塞进 Thread/线程池，是因为 `FutureTask implements RunnableFuture`（= `Runnable + Future`）做了一层**适配**；线程池的 `submit(Callable)` 更是直接吃 Callable，根本不经过 Runnable。这句话把"有返回值的方式"重新归回"无返回值的方式"，是典型的概念回退。
  2. 三级递进里说"线程池是生产环境唯一推荐的方式"——可接受的口语强调，但同一段又说"继承 Thread 是第一种方式"，前面却把"任务定义"和"线程管理"混成同一层"四种创建方式"，分类维度不齐（继承 Thread/Runnable 是"任务"，线程池是"执行器"）。计 A 少量扣分。
- **扣分点**：C 项扣在"原理只到 native 一句"，没有讲 `Thread.start0`→JVM 创建 JavaThread→`Thread.run` 调用链、也没有讲 `FutureTask` 的 state 状态机；B 项扣在漏掉最高频的三个追问点（重复 start、submit/execute、get 超时与异常）；D 项小扣：四种方式没有一句"一句话记忆锚"（"1 个类、1 个接口、1 个适配器、1 个框架"）。
- **可加分但没说的**：`start()` 只能调用一次，第二次抛 `IllegalThreadStateException`（线程状态回不到 NEW）；`FutureTask` 的 7 种 state（NEW→COMPLETING→NORMAL/EXCEPTIONAL/CANCELLED/INTERRUPTED）与 `get` 的 park 阻塞；`Callable` 也可直接 `executorService.submit()` 拿 `Future`；JDK21 虚拟线程——创建方式已从"继承 Thread"时代走出来，"平台线程 vs 虚拟线程"是近两年必问的新增量。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 同一个 Thread 对象能连续调用两次 `start()` 吗？→ 不能，第二次抛 `IllegalThreadStateException`，线程一旦启动就无法回到 NEW 状态，要重新 new。
  2. `submit` 和 `execute` 什么区别？→ `execute` 只收 Runnable、异常直接抛到线程的 `UncaughtExceptionHandler`；`submit` 内部包成 `FutureTask`，异常被吞进 Future，只有 `get()` 时以 `ExecutionException` 抛出——"用 submit 却不 get"是最常见的吞异常事故。
  3. Callable 怎么交给 Thread？→ 必须用 `FutureTask` 适配（它实现了 `RunnableFuture`），因为 Thread 的构造只认 `Runnable`。
- **改法（可直接替换进稿子）**：把第 27 行那句换成——"这四种方式其实分两层：**前三种是任务定义**（Runnable 和 Callable 是两个并列接口，FutureTask 用 `RunnableFuture` 把 Callable 适配成 Runnable；真正启动一律靠 `Thread.start()`），**第四种是任务执行**（Executor 框架接管线程生命周期）。生产的正确姿势是：定义任务是 Runnable/Callable，执行一律交给 `ThreadPoolExecutor`。"

---

### 2-2 进程的通信方式 —— 72 分（及格）

- **得分**：A32 / B18 / C12 / D8 / E2
- **必答点核对**：七种 IPC 全齐 ✅（匿名管道/FIFO/信号/消息队列/共享内存/信号量/Socket）；匿名管道"亲缘关系+半双工"✅；FIFO"以文件存在、无亲缘可用"✅；信号"异步、信息量小"✅；共享内存"效率最高+需信号量同步"✅；信号量"不传业务数据、只做同步"✅；Socket"通用性最强、可跨机"✅；POSIX vs System V 两类标准 ❌；管道容量与阻塞语义 ❌；共享内存为何最快（零拷贝）❌；Java 侧落地手段（`MappedByteBuffer`/Unix Domain Socket/JNI）❌。
- **硬伤**：
  1. **"消息队列：Java 生态中对应 RabbitMQ、Kafka、RocketMQ 等消息中间件"** → 正确说法：OS 的 IPC 消息队列是**内核对象**（System V `msgget/msgsnd/msgrcv` 或 POSIX `mq_open`），生命周期跟着内核、只在**同一台机器**、消息体小、无持久化语义；而 RabbitMQ/Kafka 是**应用层的跨主机消息中间件**，底层用的是 Socket + 磁盘日志，跟 IPC 消息队列只是"名字相同"。把它们说成"对应"，等于把内核 IPC 和分布式 MQ 拉平，面试官一句"那 Kafka 和 `msgget` 是一回事吗"就穿。
  2. **"Socket 是第七种"** 这句本身没错，但紧接着说"RPC 框架（Dubbo、gRPC）底层都是 Socket"——方向对、层级错：Dubbo/gRPC 底层是 Socket + 自定义协议编解码（Dubbo 的 dubbo 协议头 16 字节、gRPC 走 HTTP/2 帧），这一点可以一句话讲清，现在完全没讲，暴露"知道名字不知道栈"。
- **扣分点**：B 项扣得最多——OS 教材级七种列完了，但**没有一条给出"选型对比维度"**（亲缘/跨机、是否携带数据、是否内核态拷贝、是否有持久化），这类题面试官恰恰考"你会不会选"。C 项 12/20：全是"是什么"，没有"为什么快/为什么慢"（共享内存快在无内核拷贝、管道慢在两次拷贝+上下文切换、Socket 慢在协议栈）。D 项：无收尾对比段，七个 bullet 像清单不像回答。E 项 2/5：没有一句落到 Java 工程实践。
- **可加分但没说的**：① 共享内存快的本质是"物理页映射进各自虚拟地址空间，读写不经过 read/write 系统调用"，代价只剩首次缺页；② 匿名管道容量默认 64KB（Linux），写满阻塞——这是"管道为什么不能当消息总线"的原因；③ Java 里真正能做本机 IPC 的手段：`FileChannel.map` 共享内存、`UnixDomainSocketAddress`（JDK16+）、Netty native transport；④ 信号量与"通信"的区别——严格说它是**同步原语**而非通信通道，教材把它并列是为了覆盖 System V IPC 三件套，主动点出来是加分项。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 为什么共享内存是效率最高的 IPC？→ 因为数据只写一次：多个进程把同一物理页映射进各自地址空间，写完直接访存，省掉了管道/Socket 的"用户态→内核→用户态"两次拷贝和系统调用。
  2. 匿名管道和命名管道（FIFO）区别？→ 匿名管道只能靠 fork 继承 fd、只服务亲缘进程、进程退出即消失；FIFO 有文件系统路径，任意本地进程 `open` 后即可通信，但仍是**本机**、仍是单向字节流。
  3. 那 Kafka 算 IPC 吗？→ 不算，它是跨主机的应用层消息中间件，底层是 Socket + 磁盘日志；OS 的 IPC 消息队列是内核维护的链表，两者不同层、不同生命周期。
- **改法（可直接替换进稿子）**：在最后加一段收口——"选型上我记三个维度：**要不要跨机**（跨机只有 Socket）、**数据量大不大**（大块数据走共享内存，小事件走信号/管道）、**要不要同步**（共享内存必须配信号量，否则会读到写一半的数据）。另外要区分清楚：RabbitMQ/Kafka 是应用层 MQ，和内核 `msgget` 消息队列只是重名，不在一个层次。"

---

### 2-3 不同线程之间如何通信 —— 79 分（及格）

- **得分**：A36 / B19 / C14 / D8 / E2
- **必答点核对**：六大类齐 ✅；volatile 可见性+不保证原子 ✅；synchronized 互斥+可见性/有序性 ✅；wait/notify 释放锁 ✅；wait vs sleep（Object/Thread、是否释放锁、是否需同步块）✅；JUC 四件套（CountDownLatch/CyclicBarrier/Semaphore/Exchanger）语义 ✅；管道流 ✅；ThreadLocal 隔离 ✅；`remove` 防泄漏 ✅；**阻塞队列（`put/take`）作为主通信手段 ❌**；**Condition 的 `await/signal` ❌**；**`LockSupport.park/unpark` ❌**；虚假唤醒的 `while` 解法 ⚠️（只点出问题没给解法）；信号丢失的解法 ⚠️（同上）；happens-before 本质 ❌。
- **硬伤**：无严格硬伤。但有两处"似是而非"，按纪律计入 C/D：
  1. **"第六种是基于 ThreadLocal 的线程私有通信"** → 严格说 ThreadLocal **不是通信**，是**隔离**：线程 A 写的副本线程 B 永远读不到，通信的定义是"一个线程的信息能被另一个线程感知"。为了凑"六大类"把隔离当通信，面试官会直接反问"这算通信吗"，答不上就掉档。正确说法：线程通信的本质是**共享内存 + happens-before + 挂起/唤醒**三条腿；ThreadLocal 是"避免共享"的另一条路，属于反例而非通信方式。
  2. **"volatile……其他线程立即看到"** → 通俗说法可接受，但严格讲 volatile 提供的是 happens-before（写 hb 后续读），"立即刷新主内存"是教学抽象（JMM 里主内存/工作内存是规范概念，不是物理内存）。
- **扣分点**：B 项扣在**最该讲的没讲**——`BlockingQueue` 的 `put/take` 是生产环境线程通信的绝对主力（生产者消费者首选），比 `wait/notify` 重要得多，文中只在 2-4 顺带提了一句；`Condition` 的 `await/signal` 也没进六类，导致"ReentrantLock 的多条件队列"在 2-3、2-5 两题都没落地。C 项：只讲"是什么"，`wait` 为什么必须持锁（`IllegalMonitorStateException` + check-then-act 原子性）、`notify` 为什么容易丢信号（无状态、唤醒即丢）都没有展开。D 项：六类平铺、无"哪类该用/哪类别用"的取舍。E 项 2/5：无项目锚点。
- **可加分但没说的**：`LockSupport` 的"先 unpark 后 park 也生效"（许可机制），这是它比 wait/notify 强的地方，也是 AQS 的底座；`while` 循环包 `wait` 防虚假唤醒的标准模板；`Condition` 一个锁多个等待队列做"精确唤醒"（有界阻塞队列就是 `notFull/notEmpty` 两个 Condition）；`CompletableFuture` 的回调式通信（不阻塞线程）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. `wait()` 为什么必须在 synchronized 块里？→ 因为它要操作 monitor 的 wait set，必须先持有 monitor，否则抛 `IllegalMonitorStateException`；更重要的是"判断条件 + 进入等待"必须原子，否则会丢信号。
  2. 为什么必须用 `while` 而不是 `if` 包 `wait()`？→ 防虚假唤醒（spurious wakeup）和被 notify 后条件又被别人改掉，醒来第一件事是重新检查条件。
  3. 生产环境你更愿意用 wait/notify 还是 BlockingQueue？→ BlockingQueue，它把"锁 + 两个 Condition + 容量判断"全封装了，`put/take` 自带阻塞与唤醒，不会丢信号也不会虚假唤醒，这也是线程池工作队列的底座。
- **改法（可直接替换进稿子）**：把第六类改成——"第六类其实是**共享内存 + 阻塞队列**：`BlockingQueue` 的 `put/take` 是生产环境最常用的线程通信方式，内部用 `ReentrantLock` + `notFull/notEmpty` 两个 Condition 实现；而 ThreadLocal 严格说不是通信而是**隔离**（线程 A 的副本 B 读不到），放在这里是为了对比'共享'与'不共享'两条路线。"

---

### 2-4 JUC 包下常用的类 —— 80 分（良好）

- **得分**：A38 / B17 / C13 / D9 / E3
- **必答点核对**：六大分类 ✅；ReentrantLock 公平/可中断/多 Condition ✅；ReentrantReadWriteLock 读写分离、读读不互斥 ✅；StampedLock 乐观读 ✅（版本也对：JDK8）；CAS 原子类 + `AtomicStampedReference` 解 ABA ✅；ConcurrentHashMap JDK8 CAS+synchronized ✅；COW 读多写少 ✅；ThreadPoolExecutor 手动创建 ✅；CompletableFuture（JDK8）✅；同步工具三件套语义 ✅；阻塞队列三种 ✅；**AQS 完全缺席 ❌**；**LongAdder ❌**；**Condition/LockSupport ❌**；**ThreadLocalRandom ❌**；**Phaser / PriorityBlockingQueue / DelayQueue / LinkedTransferQueue / ConcurrentSkipListMap / ForkJoinPool ❌**。
- **硬伤**：无。事实层干净：StampedLock、CompletableFuture 都是 JDK8，`LinkedBlockingQueue 默认无界`（严格说是容量 `Integer.MAX_VALUE` 的"逻辑无界"，面试官可能顺口纠一句，不算错）。
- **扣分点**：**C 项 13/20 是本题最大失血**——题目是"JUC 有哪些类"，但真正区分 P6/P7 的是"这些类的底座是什么"。全文一次都没出现 AQS，而 ReentrantLock/ReadWriteLock/Semaphore/CountDownLatch/Condition 全是 AQS 的实现类；也没提 CAS 的底层 `Unsafe.compareAndSwapInt`/`VarHandle`。B 项扣在"只列老熟人"：`LongAdder`（JDK8，高并发计数比 AtomicLong 强一个量级）、`ThreadLocalRandom`（`Random` 的 CAS 争用坑）、`DelayQueue`（订单超时关单的真实用法）都缺席，而这些恰恰是"你真的用过 JUC"的证明。D 项尚可，有一句"最佳实践"收口。
- **可加分但没说的**：`LongAdder` 的 Cell 分段 + `base` 汇总（牺牲强一致换吞吐）；`CopyOnWriteArrayList` 的坑（每次写全量复制、只保证最终一致、大数组写会 STW 感）；`ConcurrentHashMap` 的 `size()` 是估算（`baseCount + CounterCell[]`）；`ThreadLocalRandom.current()` 为什么比 `new Random()` 快；`ForkJoinPool` 的工作窃取与 `parallelStream` 默认共用。
- **面试官追问（3 个，附一句话标准答法）**：
  1. `ReentrantLock.lock()` 底层怎么走？→ `AQS.acquire` → `tryAcquire` 用 CAS 把 `state` 从 0 改 1 → 失败就 `addWaiter` 入 CLH 双向队列 → `acquireQueued` 里 `LockSupport.park` 挂起，靠前驱 `unpark` 唤醒。
  2. `LongAdder` 为什么比 `AtomicLong` 快？→ AtomicLong 所有线程 CAS 同一个变量，高并发下自旋严重；LongAdder 把计数拆到多个 Cell，线程按 hash 落到不同槽，`sum()` 时才汇总（弱一致）。
  3. `StampedLock` 乐观读有什么代价？→ 乐观读不加锁、只拿 stamp 校验，失败要降级重试；它不可重入、不支持 Condition，且写锁饥饿风险高于 ReadWriteLock，所以适合"读极多、写极少"的极窄场景。
- **改法（可直接替换进稿子）**：开头分类后补一句骨架句——"这六类里有个共同的底座叫 **AQS**：`ReentrantLock`、`ReadWriteLock`、`Semaphore`、`CountDownLatch`、`Condition` 都是 AQS 的子类或内部类，AQS 用一个 `volatile int state` + CLH 双向队列 + `LockSupport` 把'抢不到锁怎么办'这件事标准化了；原子类的底座则是 CAS。所以 JUC 真正要记的是 **AQS + CAS + 队列** 三件套，类名只是它们的排列组合。"

---

### 2-5 synchronized 和 ReentrantLock 及其应用场景 —— 82 分（良好）

- **得分**：A34 / B20 / C15 / D9 / E4
- **必答点核对**：JVM 关键字 vs API 层 ✅；独占可重入 ✅；可重入实现（Monitor 计数器 / AQS state）✅；公平性（synchronized 非公平 / RL 可选，默认非公平）✅；可中断 `lockInterruptibly` ✅；可超时 `tryLock(timeout)` ✅；条件变量（1 个 wait set vs 多 Condition）✅；Monitor 基础 ✅；锁升级 ✅（历史对）；AQS `state` + 双向队列 + CAS + 唤醒 ✅；性能演进（JDK6 后反超）✅；finally unlock ✅；分布式锁边界 ✅（亮点）；**对象头 Mark Word ❌**；**monitorenter/monitorexit 字节码 ❌**；**ObjectMonitor 结构（owner/cxq/EntryList/WaitSet）❌**；**AQS 独占/共享模式、Condition 队列 ❌**；**synchronized 三种用法锁对象（this/Class/实例）❌**；**锁降级 / 只升不降 ❌**；**公平锁源码 `hasQueuedPredecessors` ❌**。
- **硬伤**：
  1. **"JDK1.6 引入锁升级：从偏向锁开始→轻量级锁→重量级锁"**（作为当前事实陈述）→ 正确说法：偏向锁是 JDK6 引入的，但 **JDK15（JEP 374）起已默认禁用并标记废弃，JDK18 移除了实现**。今天在新 JDK 上答"锁从偏向锁开始"会被判定"知识停更"。安全答法："JDK6 是偏向锁→轻量级→重量级；JDK15 之后偏向锁默认关闭、JDK18 移除，现在实际是**无锁→轻量级（CAS 自旋改 Mark Word）→重量级（ObjectMonitor）**，且只能升级不能降级。"
  2. **"当锁被释放时，会唤醒等待队列中的头节点线程"** → 正确说法：`head` 是**哨兵/虚拟节点**（`thread == null`），`unlock → unparkSuccessor(head)` 唤醒的是 `head.next` 这个**后继节点**，不是 head 自己。这个细节是面试官验证"你读过 AQS 源码"的标准探针。
- **扣分点**：B 项扣在"锁的对象是谁"这个必答点完全没写（`synchronized` 方法与 `static` 方法、`synchronized(this)` 与 `synchronized(Xxx.class)` 的差别，是这题的标准起手式）；AQS 只讲了独占，共享模式（`Semaphore`/`CountDownLatch` 用）与 Condition 的等待队列一字未提。C 项：Monitor 只说"基于对象监视器"，没有对象头/字节码/管程三段结构，等于"名词级深度"。A 项另扣：把"高并发下 ReentrantLock 才略有优势"作为结论偏绝对（现代 JDK 两者高竞争都走 `park/unpark`，差距主要在功能而非吞吐），属"说法似是而非"。
- **可加分但没说的**：`synchronized` 代码块编译成 `monitorenter/monitorexit`（异常路径有两条 exit）；Mark Word 的三段式（无锁存 hash+age+biase 位 → 轻量级指向栈中 `LockRecord` → 重量级指向 `ObjectMonitor`）；`ObjectMonitor` 的 `owner`/`cxq`/`EntryList`/`WaitSet` 与"重量级锁为什么要陷入内核"；公平锁靠 `hasQueuedPredecessors()` 判断有没有更早的排队者；`tryLock()` 无参版是"立即返回"，可能是**插队**破坏公平；读写锁的锁降级（写锁→读锁可以，反之不行）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. `synchronized` 的锁信息到底存在哪？→ 对象头 Mark Word：轻量级锁存"指向线程栈中 LockRecord 的指针"，重量级锁存"指向 ObjectMonitor 的指针"，Monitor 里有 owner、cxq/EntryList（阻塞队列）、WaitSet（wait 队列）。
  2. 偏向锁现在还有吗？→ JDK15 起默认禁用（JEP 374），JDK18 移除了实现，新版本直接答"轻量级 CAS 自旋 → 重量级 Monitor"，并且锁只能升级不能降级。
  3. `ReentrantLock` 公平锁怎么实现的？→ `FairSync.tryAcquire` 先 `hasQueuedPredecessors()` 看队列前面有没有人，有就乖乖排队；非公平版直接 CAS 抢，抢不到再入队——这就是"非公平吞吐更高但可能饿死"的根源。
- **改法（可直接替换进稿子）**：把锁升级那段整段换成——"JDK6 把锁优化成偏向锁→轻量级锁（CAS 改 Mark Word + 自旋）→重量级锁（ObjectMonitor，`park` 陷入内核）。注意这是历史演进：**偏向锁在 JDK15 已默认关闭、JDK18 被移除**，今天要答'无锁→轻量级→重量级，且只升不降'。而 ReentrantLock 走 AQS：`volatile int state` 记重入次数 + CLH 双向队列排队 + `LockSupport.park/unpark` 挂起唤醒，`unlock` 唤醒的是 `head.next` 而不是 head（head 是哨兵）。"

---

### 2-6 ThreadLocal 作用、原理、key/value、问题、解决 —— 85 分（良好）

- **得分**：A34 / B21 / C16 / D9 / E5
- **必答点核对**：核心作用是隔离而非共享 ✅（少见的好意识）；变量不在 ThreadLocal 而在 Thread 持有的 `ThreadLocalMap` ✅；`set` 以当前 ThreadLocal 为 key ✅；Entry 数组、key = ThreadLocal 弱引用、value 强引用 ✅；key 为何弱引用 ✅；泄漏链（key 被 GC → null，value 强引用不断，线程池长存活）✅；脏数据（线程复用读到上一任务残留）✅；`remove` 必须放 finally ✅；澄清"泄漏根因不是弱引用而是没 remove" ✅（最高价值的一条）；`private static final` 最佳实践 ✅；项目锚点（gulimall 登录用户上下文）✅；**`expungeStaleEntry`/`cleanSomeSlots` 探测式清理 ❌**；**ThreadLocalMap 用开放寻址/线性探测（无链表）❌**；**`0x61c88647` 黄金分割 hash ❌**；**InheritableThreadLocal / TransmittableThreadLocal ❌**；**FastThreadLocal ❌**。
- **硬伤**：
  1. **"这些 Entry 永远不会被访问到，也不会被回收，直到线程结束"** → 正确说法：`ThreadLocalMap` 在 `set`（走 `cleanSomeSlots`）、`get`/`set` 命中 stale key（走 `expungeStaleEntry`）时会**探测式清理**掉 key 为 null 的 Entry，并把后面的元素 rehash 填洞。所以准确表述是"**清理是被动、偶发、不可依赖的**：只有当线程后续再操作这个 Map 时才可能被顺手清掉，长期不再访问的线程里就会一直挂着，所以必须主动 `remove()`"。文中把"不会回收"讲成绝对，等于不知道 `expungeStaleEntry`，面试官追问"既然会自动清理，那为什么还要 remove"就答不出。
  2. 计 A 项同时扣一点：把"唯一正确的解决方案"表述得过于绝对——真实工程还有两条路（`static final` 防 key 被 GC + 线程池任务包裹 try/finally 统一 remove、或用 TTL 做上下文透传后清理），主动给 remove 是对的，但"唯一"二字会被追问。
- **扣分点**：C 项 16/20，是本章最高，但离 18+ 差在"Map 的实现细节"——没提它是**开放寻址 + 线性探测**（不同于 HashMap 的链地址法）、没提 `threadLocalHashCode` 与黄金分割数、没提 `expungeStaleEntry` 的 rehash 过程。B 项：`InheritableThreadLocal`（父→子只在 `new Thread` 时复制一次）与线程池场景失效、`TransmittableThreadLocal` 这条线完全没提，而这正是"ThreadLocal 有什么问题"的第二层答案（脏数据/上下文丢失）。E 项满分：gulimall 拦截器 + `LoginUserInterceptor.loginUser.get()` 讲得具体、有代码味道。
- **可加分但没说的**：`ThreadLocalMap` 的 `Entry extends WeakReference<ThreadLocal<?>>` 且**没有 `super(k)` 之外的花样**——key 弱、value 强的根因在这里；为什么不用 `WeakHashMap`；`set` 时若发现 stale slot 会先尝试复用该槽位；`Netty FastThreadLocal` 用数组下标直接寻址（还顺手解决 hash 冲突和清理，性能高一个量级）；线程池里上下文透传的工程解法（TTL + `TtlExecutors` 装饰、或手动捕获-回填）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 既然 key 是弱引用会被回收，为什么还泄漏？→ 回收的只是 key，Entry 本身还在 `ThreadLocalMap.Entry[]` 里，value 被 Entry 强引用，Entry 又被 Thread 强引用，线程不死这条链就不断；清理只在下次 set/get 时"顺手"发生，不可依赖。
  2. `ThreadLocalMap` 怎么解决哈希冲突？→ 开放寻址 + 线性探测（不是链表），hash 用 `threadLocalHashCode` 配合黄金分割 `0x61c88647` 让槽位均匀；探测到 stale slot 就 `expungeStaleEntry` 清掉并 rehash 后面的元素。
  3. 线程池里父子线程/异步任务怎么传上下文？→ `InheritableThreadLocal` 只在 `new Thread` 时复制，线程池复用线程不生效；要用阿里 `TransmittableThreadLocal`（TTL）装饰线程池，或提交任务时手动捕获再回填。
- **改法（可直接替换进稿子）**：把"永远不会被回收"那句换成——"`ThreadLocalMap` 其实有**被动清理**：`set` 走 `cleanSomeSlots`、`get/set` 探测到 stale key 走 `expungeStaleEntry`，会把 key 为 null 的 Entry 擦掉并 rehash。但清理的**时机和次数完全不可控**——线程不再访问这个 Map 就永远不清理，线程池里核心线程又不退出，所以内存泄漏依然会发生、脏数据依然会发生。结论不变：**必须 remove，且放 finally**。"

---

### 2-7 volatile 是线程安全的吗、为什么 —— 79 分（及格）

- **得分**：A37 / B18 / C13 / D9 / E2
- **必答点核对**：结论明确"不是线程安全"✅；三性框架 ✅；保证可见性 ✅；保证有序性 ✅；不保证原子性 ✅；`count++` 三步拆解 ✅；DCL 单例需要 volatile ✅；一写多读适用场景 ✅；性能误区澄清（volatile 不慢）✅；**内存屏障四类（LoadLoad/LoadStore/StoreStore/StoreLoad）❌**；**StoreLoad 最贵、x86 用 lock 前缀 ❌**；**happens-before 是可见性的规范表述 ❌**；**64 位 long/double 的原子性 ❌**；**volatile 数组元素不是 volatile ❌**；**"三性"表述的准确性 ⚠️**。
- **硬伤**：无严格硬伤。两处"似是而非"（计入 C/D）：
  1. **"线程安全需要同时满足原子性、可见性和有序性三个条件"** → 准确说法：线程安全的定义是"多线程访问下程序行为与单线程语义一致"（正确性）；原子性/可见性/有序性是 **JMM 层面的三性**，是达成正确性的**手段**，不是并列的"条件"。这句是八股惯用语，面试官一般不纠，但被追问"那 CAS 满足三性吗"就会卡。
  2. **"volatile 会立即将修改刷新到主内存"** → 规范表述是"volatile 写 happens-before 后续 volatile 读"，主内存/工作内存是 JMM 抽象；物理实现靠缓存行失效 + 内存屏障，不是"立刻写回 RAM"。文中"禁止编译器和 CPU 重排序"只说了一半：真正手段是**四条屏障**，尤其 `StoreLoad`（x86 上是 `lock addl`，最贵的那条）才是 volatile 写慢的原因。
- **扣分点**：C 项 13/20 是本题主因——这道题面试官 100% 会追"volatile 靠什么实现"，答案的完整链条是"JMM 抽象 → happens-before 规则 → 内存屏障插入点 → x86 落地（lock 前缀 / mfence）→ MESI 缓存一致性"，文中止步于"内存屏障"四个字，没给屏障组合。B 项：DCL 只给了"没有 volatile 会返回未初始化对象"的结论，没给"new 的三步（分配/初始化/赋引用）2-3 可能重排"的因果，而这是考官最想听的。E 项 2/5：无项目场景（状态标记/优雅停机开关都可以挂上去）。
- **可加分但没说的**：`volatile` 写前 `StoreStore`、写后 `StoreLoad`；读后 `LoadLoad`、读前 `LoadStore`（保守插法，共四条）；`volatile` 保证 long/double 读写的原子性（非 volatile 的 64 位读写在旧规范允许拆分）；`volatile int[] arr` 只保证引用可见，**元素不保证**；`while(!flag)` 空转 + `Thread.onSpinWait()`；`volatile` 不能做"检查-再动作"（check-then-act），必须 CAS/加锁。
- **面试官追问（3 个，附一句话标准答法）**：
  1. volatile 靠什么保证有序？→ 四条内存屏障：写前 StoreStore、写后 StoreLoad；读后 LoadLoad、读前 LoadStore；x86 上只有 StoreLoad 需要真指令（`lock` 前缀），所以 volatile 写比读贵得多。
  2. volatile 和 synchronized 在 happens-before 上是什么关系？→ 都是 JMM 规则源：volatile 写 hb 后续同名变量读；monitor 释放 hb 后续对同一锁的加锁。可见性的本质是 hb，不是"物理刷主存"。
  3. DCL 为什么一定要 volatile？→ `new` 分三步：分配内存、调用构造、把引用赋给变量；JIT 可能把 2、3 重排，另一个线程就拿到"引用非 null 但字段全是默认值"的半成品对象，volatile 禁止这个重排。
- **改法（可直接替换进稿子）**：在"内存屏障"处补一句——"具体是四条屏障：volatile 写前插 StoreStore、写后插 StoreLoad；volatile 读后插 LoadLoad、读前插 LoadStore。其中 **StoreLoad 最贵**（x86 用 `lock` 前缀刷 store buffer），这也解释了为什么 volatile 读几乎零成本、写有成本。上层语义用 happens-before 说更准：volatile 写 happens-before 后续对同一变量的读。"

---

### 2-8 什么情况会产生死锁、如何解决 —— 83 分（良好）

- **得分**：A37 / B20 / C14 / D9 / E3
- **必答点核对**：死锁定义 ✅；四条件齐（互斥/请求与保持/不可剥夺/循环等待）✅；双线程互锁场景 ✅；其他场景（循环等待、持锁调阻塞方法、未释放、数据库死锁）✅；`jps` + `jstack -l PID` ✅；JConsole/VisualVM/Arthas ✅；四种破坏方式 ✅；全局顺序 ✅（最有效）；`tryLock` 定时锁 ✅；项目实践（统一顺序 + tryLock）✅；**活锁 / 饥饿 的区别 ❌**；**线程池池饥饿型死锁 ❌**；**`ThreadMXBean.findDeadlockedThreads` ❌**；**jstack 输出特征（"Found one Java-level deadlock"）❌**；**超时重试 + 无锁/CAS 破坏互斥 ❌**。
- **硬伤**：无严格硬伤。一处"过绝对"（计 A 少量 + D）：
  1. **"互斥条件……这是锁的基本特性，无法破坏"** → 不够准：互斥是可以**部分破坏**的——用 CAS/乐观锁替代互斥、用不可变对象、用"资源复制"（每个线程一份副本，如 COW/ThreadLocal）、用消息队列把并发串行化。标准问法"四个条件哪个容易破坏"的期望答案是"**循环等待最容易，互斥最难但也可以用无锁化规避**"，答"无法破坏"会显得没想过。
- **扣分点**：B 项：**线程池型死锁**完全没提——"同一线程池里任务互相 `get()` 对方结果"导致池饥饿，这是 Java 后端事故里最常见的死锁形态，比双锁互等更贴近生产；`jstack` 的判定口径也只说了"能检测"，没说它靠 `ThreadMXBean.findDeadlockedThreads`、也没说输出里那段 `Found one Java-level deadlock` 长什么样。C 项：排查工具链停在"用 jstack"，没有通往"怎么读栈（`BLOCKED` + `waiting to lock` + `locked` 三行互指）"，也没有 `arthas thread -b` 这种直接给出阻塞源头的做法。E 项：有实践句但无案例（没讲"上次线上怎么定位的"）。
- **可加分但没说的**：死锁/活锁/饥饿三者的区别与判定；线程池死锁的解法（隔离线程池、`CompletableFuture` 异步化、不用 `get` 阻塞、有界等待）；用 `ReentrantLock.tryLock(1, SECONDS)` + 失败释放回退做"乐观重试"；全局顺序的落地写法（按 `System.identityHashCode` 或业务主键排序后依次加锁，注意 hash 冲突退化）；数据库死锁交给 DB 死锁检测（`innodb_deadlock_detect`），应用侧靠固定更新顺序 + 短事务。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 死锁、活锁、饥饿怎么区分？→ 死锁是互相持锁永久阻塞；活锁是都在动但互相谦让导致无人推进（如重试时机相同）；饥饿是某线程长期抢不到资源（非公平锁/低优先级）。排查上死锁看 `jstack`，活锁看 CPU 高但吞吐为 0，饥饿看排队时长。
  2. 线程池怎么会死锁？→ 两个任务提交到同一个池，A 等 B 的结果、B 等 A 的结果，池里线程被占满后就互相等，叫池饥饿；解法是隔离线程池或改成异步回调（`thenCompose`），不要阻塞 `get`。
  3. `jstack` 一眼怎么看死锁？→ 输出末尾有 `Found one Java-level deadlock:` 段落，线程栈里 `waiting to lock <0x...>` 和 `locked <0x...>` 互指；代码里也能 `ThreadMXBean.findDeadlockedThreads()` 主动检测报警。
- **改法（可直接替换进稿子）**：把"互斥无法破坏"改为——"互斥最难破坏，但也不是绝对：把互斥资源改成不可变/线程私有副本（COW、ThreadLocal），或用 CAS 做无锁化，都可以绕开互斥；生产上最常用的是**破坏循环等待**（全局锁顺序）和**破坏请求与保持**（`tryLock` 超时 + 失败释放重试）。"

---

### 2-9 如何创建线程池、线程池常见参数 —— 87 分（良好）

- **得分**：A38 / B22 / C15 / D9 / E3
- **必答点核对**：池化思想与目标 ✅；不用 `Executors` 铁律 ✅；四种默认池隐患全对（Fixed/Single 无界队列 → OOM；Cached/Scheduled 的 max = `Integer.MAX_VALUE`）✅；七参数一个不落 ✅；`workQueue` 推荐有界 ✅；`ThreadFactory` 自定义命名 ✅；四种拒绝策略语义 ✅（Abort 抛 `RejectedExecutionException`、CallerRuns 提交线程执行、Discard 静默丢、DiscardOldest 丢最老）；执行流程 core→队列→max→拒绝 ✅；监控意识 ✅；**`ctl` 高 3 位 = 五种状态（RUNNING/SHUTDOWN/STOP/TIDYING/TERMINATED）❌**；**`execute` vs `submit` ❌**；**`shutdown` vs `shutdownNow` ❌**；**"无界队列让 maximumPoolSize 永久失效"这条因果 ❌**；**`allowCoreThreadTimeOut` / `prestartAllCoreThreads` ❌**；**CallerRunsPolicy 在池已 shutdown 时会静默丢弃 ❌**。
- **硬伤**：无。这是本章事实最干净的一题：七参数、四策略、默认池隐患、执行流程、`CPU+1` 的"页缺失"理由（原文"叶缺失"为抽取误差，按纪律不扣分）全部正确；`keepAliveTime` 60s 的说法也标了"一般"，没有说成规范。
- **扣分点**：C 项 15/20——流程背对了，但**没讲"为什么先入队再扩容"这个设计动机**（TPE 的意图是队列优先削峰、队列满才说明真扛不住），而这道题的分水岭就在这里；也没提 `ctl` 把"运行状态 + 线程数"压进一个 `AtomicInteger` 高 3 位/低 29 位（`runStateOf`/`workerCountOf`）的精巧设计。B 项：`maximumPoolSize` 与队列的**耦合因果**没点破——"用了无界队列，max 就永远用不上"，这句话能把 2-9 和 2-10 串成体系；`execute/submit`、`shutdown/shutdownNow`、`allowCoreThreadTimeOut` 三个高频追问全缺。D 项：七参数是平铺讲解，缺一句"参数之间的联动关系"（core 与 queue 决定排队延迟，max 与 queue 决定突发容量）。
- **可加分但没说的**：`CallerRunsPolicy` 的隐藏行为——`if (!e.isShutdown()) r.run()`，池已关闭时**任务被静默丢弃**，所以它也不保证 100% 不丢；`DiscardOldestPolicy` 碰上 `PriorityBlockingQueue` 丢的是"优先级最高"而不是"最老"；`SynchronousQueue` + `CachedThreadPool` 组合下"队列不存元素 → 每次都尝试扩线程"；拒绝策略可自定义（落库/告警/MQ 重投）；`ThreadPoolExecutor` 的 `finalize` 已废弃，别指望它收尾。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 为什么线程池是"先入队、队列满了才扩到 max"？→ TPE 的设计意图是让队列先削峰，只有当队列都塞不下时才认为"真的扛不住"，才扩非核心线程；代价是队列容量直接决定 max 是否有效——**用无界队列，max 永远是摆设**。
  2. `shutdown` 和 `shutdownNow` 区别？→ `shutdown` 置 SHUTDOWN、不接新任务、把队列里跑完；`shutdownNow` 置 STOP、中断工作线程、返回还没执行的任务列表。
  3. `execute` 和 `submit` 区别？→ `execute` 只收 Runnable、异常直接冒到 `UncaughtExceptionHandler`；`submit` 包成 `FutureTask`，异常被吞进 Future，只有 `get()` 才以 `ExecutionException` 抛出。
- **改法（可直接替换进稿子）**：在"工作原理"后补一句因果——"注意 `maximumPoolSize` 只有在**有界队列**下才有意义：队列塞满才会扩到 max。这就是为什么生产禁用无界队列——不只是 OOM，还让 max 和拒绝策略**永久失效**，线程数永远卡在 core。"

---

### 2-10 线程池参数调优或监控的方法 —— 77 分（及格）

- **得分**：A35 / B18 / C13 / D8 / E3
- **必答点核对**：无万能参数 + 吞吐/响应/资源三角 ✅；先监控后压测、小步迭代 ✅；CPU 密集 `CPU+1` ✅；IO 密集 `2-4 倍` ⚠️（与 2-9 的"*2"口径不一）；混合型拆两个池 ✅；队列大小按"执行时长 × 可接受等待"估算 ✅；有界队列 ✅；max 2-4 倍 ⚠️；`keepAliveTime` 60s ✅；拒绝策略选择 ✅；监控指标五项（活跃/排队/完成/拒绝/耗时）✅；jstack/jconsole ✅；Actuator + Prometheus + Grafana ✅；**`beforeExecute/afterExecute/terminated` 埋点 ❌**；**`getActiveCount` 是遍历近似值 ❌**；**运行时 `setCorePoolSize/setMaximumPoolSize` 动态调参 ❌**；**Little 定律/利用率公式 ❌**；**线程池隔离（bulkhead）、动态线程池框架 ❌**；**优雅关闭/任务可中断性 ❌**。
- **硬伤**：一处（口径与结论不严谨）：
  1. **"CallerRunsPolicy 既能保证任务不丢失"** → 正确说法：CallerRuns 在池**未关闭**时由提交线程兜底执行、起到"反压降速"作用；但源码是 `if (!e.isShutdown()) r.run()`，池已 shutdown 时**任务被静默丢弃**；而且它会阻塞提交线程（可能是 Tomcat 工作线程），极端情况下造成上游雪崩。说"保证不丢"过强。
  2. 跨题一致性：2-9 说 IO 密集 `CPU 核心数 * 2`，2-10 说 `2-4 倍`——两个都是经验区间，但同一份稿子里出现两个不同数值，面试官会问"到底几倍"，暴露"背的是零散结论而不是一个可推导的口径"。（按 rubric，经验值本身不算硬伤，但**当成"原则"给死值**要扣分。）
- **扣分点**：B 项 18/25——**监控只停留在"我会监控"的层面**：说了监控哪些指标，没说**怎么采**（`ThreadPoolExecutor` 的 `getActiveCount()/getQueue().size()/getCompletedTaskCount()/getPoolSize()` 只是一部分，且 `getActiveCount` 是遍历 workers 的**近似值**），也没说拒绝次数必须自定义 `RejectedExecutionHandler` 累加（`AbortPolicy` 抛异常要 catch 才能计数）。C 项 13/20：调优先讲"公式化的推导"再讲经验值，文中反了——全是经验值（1000、2-4 倍、2-4 倍），没有一个可验算的模型。D 项 8：三处"一般"堆叠，缺取舍（为什么不选 `SynchronousQueue`、为什么拆池而不是调大 max）。
- **可加分但没说的**：**利用率公式**（Brian Goetz）：`N = CPU 核数 × 目标利用率 × (1 + 平均等待时间/平均计算时间)`，IO 密集本质是"等待占比高"，所以倍数不是拍的；**继承 `ThreadPoolExecutor` 覆写 `beforeExecute/afterExecute/terminated`** 是最标准的埋点方式（记耗时、记异常），拒绝数用自定义 handler 计数；**运行时调参**：`setCorePoolSize/setMaximumPoolSize` 生效，core 调大要配合 `prestart` 或等新任务触发；**动态线程池**（Hippo4j / dynamic-tp / 自研配置中心下发）是当下大厂标准答案；**线程池隔离**（不同下游不同池，对应 Hystrix/Sentinel 舱壁模式）；**优雅关闭**（`shutdown` + `awaitTermination` + 拒绝策略配合）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 线程数到底怎么算才不是拍脑袋？→ 用利用率口径：`N = 核数 × 目标 CPU 利用率 × (1 + 等待时间/计算时间)`，IO 密集因为等待占比高所以倍数大，最后靠压测校准（Little 定律同理：并发 = 到达率 × 平均驻留时间）。
  2. 拒绝次数和任务耗时怎么统计？→ 耗时用继承 `ThreadPoolExecutor` 覆写 `beforeExecute/afterExecute` 埋点；拒绝数用自定义 `RejectedExecutionHandler` 累加 `AtomicLong`，指标上报 Micrometer → Prometheus。
  3. 线上要扩线程池能不能不停机？→ 能，`setCorePoolSize/setMaximumPoolSize` 是运行时生效的；生产一般用 Hippo4j/dynamic-tp 接配置中心动态下发，配合告警阈值自动/人工调整。
- **改法（可直接替换进稿子）**：把"IO 密集设置 CPU 核心数的 2-4 倍"换成——"IO 密集不要记死倍数，用 **`N = 核数 × 目标利用率 × (1 + 等待/计算)`** 算：假设等待占 80%，目标利用率 80%，那就是 `16 × 0.8 × 5 = 64` 左右；经验值 2N 只是"等待≈计算"时的特例。算完必须压测校准，因为队列长度会把'线程数够'变成'延迟高'。"

---

## 三、本章小结

### 1. 分数概况

- **平均分 80.5**，最高 **87**（2-9 线程池参数），最低 **72**（2-2 进程通信）。
- 分布：良好 6 题（2-1/2-4/2-5/2-6/2-8/2-9）、及格 4 题（2-2/2-3/2-7/2-10）、**90+ 零题、满分零题**。
- 卡点结构高度一致：**A 项平均 35.2/40**（3 处硬伤 + 若干过绝对表述）、**B 项平均 19.3/25**（每题稳定缺 2-4 个高频追问点）、**C 项平均 14.1/20**（原理普遍停在名词层）。**D 项 8.7/10 是唯一稳定达标项**——结构、结论先行、口语化都做得好；**E 项两极分化**（2-1/2-6 的 gulimall 锚点很实，2-2/2-3/2-7 完全裸奔）。
- 一句话定性：**这是一份"能过 P6、卡在 P7"的稿子**——分类和结论都对，但每道题的"最后一公里"（源码结构、设计动机、版本演进、工程埋点）都缺。

### 2. 最容易被面试官击穿的 5 个点（按严重度排序）

1. **2-2 把 MQ 中间件当成 OS IPC 消息队列**（"消息队列：Java 生态中对应 RabbitMQ、Kafka"）——层级混淆，一问"Kafka 和 `msgsnd` 是一回事吗"直接穿。这是本章最"外行"的一句。
2. **2-1 "四种创建方式都基于 Runnable 接口"**——Callable 与 Runnable 并列，FutureTask 只是适配器；线程池 `submit(Callable)` 根本不经过 Runnable。等于把"有返回值"这个核心差异又抹平了。
3. **2-6 "key 为 null 的 Entry 永远不会被回收"**——不知道 `expungeStaleEntry/cleanSomeSlots` 的探测式清理。考官必问"既然会自动清理，为何还要 remove"，答不出就从 90 掉到 80。
4. **2-5 把偏向锁讲成当下默认存在**——JDK15（JEP 374）默认禁用、JDK18 移除实现，2026 年面试"锁从偏向锁开始"会被判知识停更；同题"唤醒头节点线程"也不准（head 是哨兵，唤醒的是 `head.next`）。
5. **2-9 与 2-10 的 IO 密集线程数口径自相矛盾**（`*2` vs `2-4 倍`），且两处都以"原则"口吻给死值——不是经验法则错，而是"把经验法则当规范"+"同一份稿子两个数"。

### 3. 最值得保留的 3 个亮点

1. **2-6 的两个"反误区"**："泄漏根因不是弱引用，而是没 `remove`"、"ThreadLocal 核心是隔离不是共享"。这两句是 P7 级认知，比背 `ThreadLocalMap` 结构值钱得多，很多候选人到面试结束都没意识到。
2. **2-5 的分布式锁边界**："ReentrantLock 只能锁住当前进程，多实例部署必须上 Redisson"——主动把单机锁推进到分布式语境，是"有架构视角"的信号，本章唯一一处 E 项接近满分。
3. **2-1 的 gulimall 商品详情流水线**：5 个数据源、1 个前置 + 4 个并行、`CompletableFuture` 编排、耗时取决于最长路径——有真实模块名、有依赖拓扑、有收益口径，是本章最像"你真的做过"的一段。
   （次优：**2-9 的四种拒绝策略 + 四种默认池隐患**写得干净准确，可直接作为该题的标准答案底稿，只需补 `ctl` 状态机、`execute/submit`、以及"无界队列让 max 失效"的因果即可冲 92+。）

### 4. 全章共性改法（三条，建议统一返工）

1. **每道题的"最后一公里"补 3 句源码/机制**：AQS（`state` + CLH 双向队列 + `LockSupport`）、Monitor（Mark Word + `monitorenter` + `ObjectMonitor`）、内存屏障（四类 + StoreLoad 最贵）、`ctl`（高 3 位状态 + 低 29 位线程数）。这四组补完，C 项整体能抬 3-4 分/题。
2. **剔除/加限定三处过绝对表述**："无法破坏互斥"→"最难破坏但可绕过"；"CallerRunsPolicy 保证不丢"→"起反压作用，池关闭时会静默丢弃"；"CPU+1 是配置原则"→"**经验起点**，最终靠压测校准"（同理 IO 的 2N/2-4N 统一成一个口径 + 公式）。
3. **版本时代性统一过一遍**：偏向锁（JDK15 废弃/JDK18 移除）、StampedLock（JDK8）、CompletableFuture（JDK8）、`LongAdder`（JDK8）、虚拟线程（JDK21，全章一次未提，是当前最大的"知识新鲜度"缺口）。补一句虚拟线程，等于告诉面试官"我还在跟进 JDK"。
