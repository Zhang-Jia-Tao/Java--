# 第 3 章（JVM）评审 B 批：3-4 / 3-5 / 3-6

> 评审口径：Rubric v1，满分 100 = A40 + B25 + C20 + D10 + E5。硬伤 1 处 A 至少扣 8、2 处及以上不得进 90+。
> 抽取错字、多余换行、`<!--p28-->` 之类残留一律不计错。

## 1) 评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 3-4 | 内存泄漏和内存溢出的理解 | 33 | 18 | 14 | 9 | 3 | **77** | 及格 |
| 3-5 | JVM 内存模型里的堆和栈有什么区别 | 30 | 20 | 14 | 9 | 3 | **76** | 及格 |
| 3-6 | 引用类型有哪些、有什么区别 | 35 | 18 | 15 | 9 | 3 | **80** | 良好 |

三题共同画像：**结构与背诵完成度高（D 稳定 9），但都停在"八股清单"层：缺参数、缺机制、缺判定方法论；两题踩了事实性表述问题，一题明确硬伤。** 三题都不能当标准答案直接背。

---

## 2) 逐题点评

### 3-4 内存泄漏和内存溢出的理解 —— 77 分（及格）

- **得分**：A33 / B18 / C14 / D9 / E3
- **必答点核对**：
  - 泄漏 vs 溢出因果（过程 vs 结果、泄漏是溢出主因但非唯一原因）✅ 到位，且给了 10GB 文件的反例
  - 两点核心区别（原因/表现/可恢复性三维）✅
  - 六类泄漏场景（静态集合、未关闭资源、监听器未注销、内部类持有外部类、ThreadLocal 未 remove、本地缓存无淘汰）✅ 六类齐，但缺 **类加载器泄漏（Tomcat 热部署 / 动态代理 / ThreadLocal 持 webapp 类加载器）** 与 **长生命周期容器持有（单例 Map、监听器注册中心）** 两类高频项
  - 溢出场景：堆 ✅ / 元空间 ✅ / 栈 ⚠️（归类错误）/ 直接内存 ✅ / **GC overhead limit exceeded ❌ 全文未提** / **unable to create new native thread ❌**
  - 工具链：jps/jstat/jmap/jstack ✅、MAT/VisualVM ✅；**jcmd ❌、Arthas ❌、`-XX:+HeapDumpOnOutOfMemoryError` + `HeapDumpPath` ❌**（这三项是生产环境判断"能不能定位"的分水岭）
  - StackOverflowError 是 Error 不是 OOM ❌ 混为一谈
  - 直接内存与 Cleaner ⚠️ 只有"受操作系统内存限制"，缺 `-XX:MaxDirectMemorySize` 与 Cleaner（虚引用子类）释放路径
- **硬伤**：
  1. 原文「内存溢出的常见场景……第三，**栈内存溢出**，主要是因为方法调用层次过深，比如无限递归」→ **把 StackOverflowError 归入"内存溢出（OutOfMemoryError）"场景**。正确说法：`StackOverflowError` 是 `VirtualMachineError` 下的 `Error`，不是 OOM；它和 `OutOfMemoryError` 是两条独立路径——HotSpot 的 `-Xss` 固定栈大小、**不动态扩展**，深度超限抛 `StackOverflowError`；只有"为新线程申请栈空间失败"才抛 `OutOfMemoryError: unable to create new native thread`。面试官必用这句话钓人。
  2. 原文「ThreadLocal 的 ThreadLocalMap 会持有 **ThreadLocal 对象和值**的引用」→ 正确说法：`Entry` 的 **key 是 ThreadLocal 的弱引用（WeakReference），value 是强引用**；泄漏点是 value 挂着那条强引用链（Thread → ThreadLocalMap → Entry → value），而不是 key。（与 3-6 的表述自相矛盾，本章内部口径不统一，属扣分证据。）
- **扣分点**（软伤，计入 C/D）：
  - 「Full GC 频繁且耗时很长，**说明存在内存泄漏**」→ 绝对化。堆偏小、大对象/元数据扩张、`System.gc()`、G1 混合回收节奏都会造成 Full GC 频繁；泄漏的**判据**是"Full GC 后老年代占用不回落、且基线逐次抬高"。
  - 「大对象直接进入老年代」→ 默认**不成立**：`-XX:PretenureSizeThreshold` 默认 0（不启用），且只对 Serial/ParNew 生效，Parallel Scavenge 忽略、G1 走 humongous region（>50% region）。
  - 元空间只说"类太多"，缺"默认无上限、受本地内存约束、需 `-XX:MaxMetaspaceSize` 兜底"。
  - 缺"泄漏 ≠ 必然 OOM"这一半：轻度泄漏表现为 GC 频率上升、TP99 抖动，可能长期不 OOM。
  - 缺"判定方法论"：`jstat -gcutil` 看 O（老年代）与 FGC 次数、`jmap -histo:live` 对比两次、dump 后用 MAT 看 Dominator Tree + Path to GC Roots（排除弱/软引用）。
- **可加分但没说的**：
  - **别名为"内存泄漏的第八类"：ClassLoader 泄漏**——容器/热部署下 webapp 类加载器被线程、ThreadLocal、JDBC Driver、ShutdownHook 持住，类卸载不掉 → 元空间泄漏，且**堆 dump 里看不到它**。
  - 生产三板斧：`-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/data/dump`（OOM 现场自动留证）、`-XX:+ExitOnOutOfMemoryError`、GC 日志 `-Xlog:gc*:file=...:time,uptime`（JDK9+ 统一日志）。
  - 直接内存的 `ByteBuffer.allocateDirect` + `-XX:MaxDirectMemorySize`（默认等于最大堆）；`cleaner` 由 `Unsafe.invokeCleaner`/`Cleaner.run` 释放，`System.gc()` 只是"促使"ReferenceHandler 处理。
  - 堆外/元空间的 OOM 文本对照：`Java heap space` / `Metaspace` / `Direct buffer memory` / `GC overhead limit exceeded` / `unable to create new native thread` —— 这五句是面试官最喜欢让你"按文本反推根因"的。
- **面试官追问（3 个 + 一句话标准答法）**：
  1. **"线上 CPU 不高但内存一直涨，你怎么在 5 分钟内判定是泄漏还是堆给小了？"** → 看 `jstat -gcutil` 的 O 列：每次 Full GC 后老年代占用回不到基线、且基线一次比一次高就是泄漏；回得去且稳定就是堆小，先调 `-Xmx`/换收集器再谈代码。
  2. **"ThreadLocal 在线程池里到底泄漏什么？remove 做了什么？"** → key 是弱引用会被回收成 null，但 value 仍被 Entry 和线程强引用挂着；`remove()` 会清 key+value 并触发 `expungeStaleEntry` 把脏 Entry 摘掉，所以线程池里必须 try-finally remove。
  3. **"元空间 OOM 和堆 OOM 的排查工具一样吗？"** → 不一样：堆靠 dump + MAT，元空间要看 `jcmd <pid> VM.metaspace` / `jmap -clstats` / `VM.classloader_stats`，dump 里只有类对象的影子，根因通常是动态代理、CGLIB、热部署导致类加载器无法卸载。
- **改法（可直接替换进稿子）**：把"栈溢出"从内存溢出场景中拆出去，改写为——
  > "先说一处容易被面试官钓的点：栈溢出（StackOverflowError）不是 OOM，它是 Error，属于'栈深度超限'，JVM 规范里栈还有另一种 `OutOfMemoryError`，在 HotSpot 上表现为 `unable to create new native thread`，是申请不到线程栈导致的。真正的内存溢出按区域分五类：堆 `Java heap space`、元空间 `Metaspace`、直接内存 `Direct buffer memory`、堆回收效率不足的 `GC overhead limit exceeded`、线程栈 `unable to create new native thread`。判定泄漏的标准动作是：Full GC 后老年代占用回不到基线且逐次抬高 → 开 `-XX:+HeapDumpOnOutOfMemoryError` 留现场 → MAT 的 Dominator Tree 找最大对象 → Path to GC Roots 排除弱/软引用 → 定位到持有它的静态集合、线程或类加载器。"

---

### 3-5 JVM 内存模型里的堆和栈有什么区别 —— 76 分（及格）

- **得分**：A30 / B20 / C14 / D9 / E3
- **必答点核对**：
  - 栈帧四要素（局部变量表/操作数栈/动态链接/方法返回地址）✅ 完全正确
  - 栈私有 + 堆共享 ✅；生命周期（随线程/随 JVM）✅；分配速度对比 ✅
  - -Xss 默认 1MB ✅（Linux x64 口径；Windows x64 同为 1M，32 位 512K，宜加"平台相关"一句）
  - -Xms/-Xmx 的"默认物理内存 1/4" ⚠️ 旧口径（见下）
  - 栈异常两种 / 堆异常一种 ❌ 表述失准（见硬伤）
  - **逃逸分析 → 标量替换 ❌ 未出现，反而写成"栈上分配"**（本节最大失分点）
  - **TLAB ❌ 未提**（"堆分配慢很多"若不提 TLAB，等于把 HotSpot 的快速路径说没了）
  - 堆分代 1:2、8:1:1、15 次晋升 ✅（"15 次 Minor GC"宜改为"年龄达 `-XX:MaxTenuringThreshold=15`"，且需补**动态年龄判定**：同龄对象总和 > Survivor 一半则提前晋升）
  - native thread OOM ❌ 未提
- **硬伤**：
  1. 原文「堆**只会**抛出一种异常：堆内存不足导致的 `OutOfMemoryError: Java heap space`」→ 事实错误。正确说法：堆还会抛 `OutOfMemoryError: GC overhead limit exceeded`（98% 时间在 GC 且回收不足 2% 的启发式，`-XX:+UseGCOverheadLimit` 默认开）与 `OutOfMemoryError: Requested array size exceeds VM limit`。「只会一种」是绝对化断言，属于考官一句话就能击穿的错。（A −8 的主因）
  2. 原文「堆的内存大小……默认是物理内存的 1/4」→ 过时口径。正确说法：JDK 10+ 容器感知后，默认堆 = **JVM 识别到的可用内存（MaxRAM，容器内为 cgroup limit）的 25%**，等价于 `-XX:MaxRAMPercentage=25`（初值 `-XX:InitialRAMPercentage=1.5625` ≈ 1/64）；1/4 只在"整机、未设 MaxRAMPercentage"时成立，容器里按宿主机 1/4 算是经典事故。
- **扣分点**（表述失准，计入 C，题干指定要判的项）：
  - 「JVM 有**栈上分配**的优化技术，对于没有逃逸出方法的小对象，会直接分配在栈上」→ **HotSpot 从未实现真正的"栈上分配（stack allocation of objects）"**。事实是：`-XX:+DoEscapeAnalysis`（默认开）判定"不逃逸/方法逃逸/线程逃逸"，对**不逃逸**对象做**标量替换（`-XX:+EliminateAllocations`）**——把对象拆成若干标量放进**局部变量表/寄存器**，对象分配被彻底消除；配套 `-XX:+EliminateLocks` 做锁消除。字段被取地址（如传给 native、存入 static）就退化。这句表述必须改，否则会被追着问"那 OOP 头、对象头放哪"。
  - 「大对象和长期存活的对象会直接进入老年代」→ 同 3-4，默认 `PretenureSizeThreshold=0` 不生效，G1 是 humongous。
  - 「栈内存大小非常小……是连续分配的；堆……是不连续的」→ "连续/不连续"混用了物理与逻辑：栈按线程连续预留虚拟地址、物理页按需提交；堆是虚拟地址连续、物理页离散，且靠 TLAB 做指针碰撞。表述不严谨。
  - 缺"堆是 GC 主战场"之外的补充：**方法区/元空间、直接内存不在堆**，直接内存 OOM 是 `Direct buffer memory`——与 3-4 联动缺失。
- **可加分但没说的**：
  - 对象分配全链路：`new` → TLAB 指针碰撞（失败）→ Eden CAS 分配 → 仍失败触发 YGC → 仍放不下走老年代/大对象 → 最终 `Java heap space`。这条链路一讲，堆的"分配慢"就有了解释力（TLAB 把无锁分配做到接近栈速度）。
  - `-Xss` 与线程数的反比关系可以量化：`线程数 ≈ (进程虚拟地址空间 - 堆 - 元空间)/(Xss + 线程私有开销)`，1M × 2000 线程即 2G 虚拟内存。
  - 栈帧大小估算：`javap -c` 看 `max_stack`/`max_locals`，递归深度 ≈ `Xss / frame_size`。
  - 分代比例不是"永远 1:2"：`-XX:NewRatio` 默认 2（老:新=2:1）；G1 已把堆切成 Region、逻辑分代物理不分代——这句能把 3-5 和收集器一章打通。
- **面试官追问（3 个 + 一句话标准答法）**：
  1. **"对象一定分配在堆上吗？逃逸分析到底做了什么？"** → 不是"栈上分配对象"，HotSpot 做的是逃逸分析 + **标量替换**：不逃逸的小对象被打散成标量直接放局部变量表/寄存器，对象根本不创建（配套锁消除），所以看不到"栈上的对象"。
  2. **"-Xss 调大能防 StackOverflowError 吗？代价是什么？"** → 能抬高深度上限，但 HotSpot 栈不动态扩容，且每个线程按 Xss 预留虚拟内存，线程数上限随之下降；根治是把递归改迭代/显式栈，`jstack` 里"同一方法重复出现上千帧"就是典型现场。
  3. **"为什么说堆分配比栈慢，但 TLAB 又能接近栈速度？"** → TLAB 是 Eden 内每线程私有的一块缓冲，分配就是指针碰撞、零同步；只有 TLAB 用尽换新块时才需要 CAS，所以热点路径上堆分配几乎和栈同速。
- **改法**：把误区一正过来，并顺手补 GC overhead——
  > "注意两个点：第一，'栈上分配对象'这个说法在 HotSpot 上是不成立的。HotSpot 做的是逃逸分析 + 标量替换：不逃逸出方法的小对象会被打散成标量放进局部变量表，对象压根不创建，这才是'看起来像栈上分配'的来源，而且字段被取地址就会退化，要靠 `-XX:+DoEscapeAnalysis`（默认开）。第二，堆不只抛 `Java heap space`，还有 `GC overhead limit exceeded`（GC 吃满 98% 时间却只回收不到 2%）和 `Requested array size exceeds VM limit`；栈那边 StackOverflowError 是 Error，OOM 那条叫 `unable to create new native thread`。"

---

### 3-6 引用类型有哪些、有什么区别 —— 80 分（良好）

- **得分**：A35 / B18 / C15 / D9 / E3
- **必答点核对**：
  - 四种引用 + 强度递减 + JDK1.2 引入时间点 ✅
  - 强引用（OOM 也不回收、是泄漏主因）✅
  - 软引用（内存不足优先回收、适合缓存）✅；**`-XX:SoftRefLRUPolicyMSPerMB` 及 LRU 近似机制 ❌**（题干点名，是本题最有区分度的加分点）
  - 弱引用（GC 即回收）⚠️ 缺"无强/软引用可达"这一前提（见下）
  - 虚引用（必须配 ReferenceQueue、不能 get、仅回收通知）✅ 三项全对，质量不错
  - WeakHashMap / ThreadLocalMap 的 key 是弱引用 ✅
  - DirectByteBuffer 用 Cleaner（虚引用子类）释放堆外内存 ✅ 方向对，但"通知 JVM"过于模糊，未点出 Cleaner/`Unsafe.invokeCleaner`/ReferenceHandler
  - **finalize / FinalReference 的坑 ❌ 全篇未提**
  - 四种引用的**对比表**（强度/回收时机/能否 get/典型 API/典型用途/内存压力表现）❌ 原文只有"核心维度对比"标题、未展开（属内容缺失，已计 B）
- **硬伤**：无严格意义上的硬伤（A 扣分来自两处不严谨，见扣分点）。
- **扣分点**：
  - 「不管 JVM 内存是否充足，只要触发垃圾回收，就会立即回收弱引用指向的对象」→ 少了关键前提：**该对象除弱引用外没有强/软引用链可达**（即可达性分析判定不可达）。否则一个还在被强引用的对象照样不会因"存在弱引用"被收。正确说法：**只被弱引用关联的对象，在可达性分析判定不可达后，本次 GC 即被清除，引用本身由 ReferenceHandler 入队**。
  - 「Glide 用软引用来管理图片内存」→ 例证存疑：Glide 现代实现是 `LruResourceCache`（有界 LRU，强引用）+ active resources 的弱引用；Android 官方自 API 9 起就不建议用 `SoftReference` 做图片缓存（ART 上回收时机不可控、易造成抖动）。
  - 缺"双向两轮"这层机制：Reference 被清除后，referent 往往要到下一轮 GC 才真正回收；`FinalReference` 至少多活一轮。
  - 缺 stale entry 清理：ThreadLocalMap 的 key 被回收后 Entry 置为 stale，靠 `expungeStaleEntry` 在 `get/set/remove` 时顺带清理——这正是"弱引用 key 只是减损、不能根治"的原因。
- **可加分但没说的**：
  - 软引用回收策略细节：`SoftReference` 维护 `timestamp/lastAccessed`，GC 用 `clock - freeBytes * SoftRefLRUPolicyMSPerMB` 与 timestamp 比较，过期才清（默认 1000 ms/MB）；`-XX:SoftRefLRUPolicyMSPerMB=0` 等价于"内存一紧张立刻清"。
  - **finalize 的坑**：执行时机不确定（Finalizer 线程单线程、优先级低）、可被重写复活对象、拖慢回收（对象至少多活一轮、局部变量表被持有）、成环的 finalize 永不执行；JDK 9 起 `finalize` 标 `@Deprecated`，JDK 18 起 `--finalization=disabled` 可彻底关闭（JEP 421）。官方替代就是 **Cleaner（PhantomReference 子类 + ReferenceQueue）**，JDK 9 的 `java.lang.ref.Cleaner` 和 DirectByteBuffer 是同一套机制。
  - 现代结论：生产缓存别用软/弱引用做容量控制，用有界 LRU（Caffeine）——引用回收时机不可控，等于把 OOM 判定交给 GC。
  - `WeakReference` + `ReferenceQueue` 的正确用法：`if ((ref = queue.poll()) != null) cleanup(ref)`，否则引用对象本身也会堆积。
- **面试官追问（3 个 + 一句话标准答法）**：
  1. **"软引用什么时候被回收？谁决定？"** → 内存压力下由 GC 按 LRU 近似决定：空闲时间超过 `freeMB × SoftRefLRUPolicyMSPerMB(默认 1000ms/MB)` 的软引用优先清，不看业务优先级。
  2. **"虚引用为什么必须配 ReferenceQueue？不配会怎样？"** → 虚引用的 `get()` 永远返回 null，唯一价值是对象回收后引用被 `ReferenceHandler` 入队让你感知；不配队列就彻底没有可观测点，等于没用。
  3. **"DirectByteBuffer 的堆外内存是谁释放的？和 finalize 什么关系？"** → `Cleaner`（PhantomReference 子类）挂在 ReferenceQueue 上，`DirectByteBuffer` 不可达后 ReferenceHandler 触发 `Cleaner.run()` → `Unsafe.invokeCleaner/freeMemory`；它正是 finalize 的官方替代，别再指望 finalize。
- **改法（可直接替换进稿子）**：
  > "弱引用要加一个前提：只有**除弱引用外没有强/软引用链可达**的对象，才会在可达性分析判定不可达后，被本轮 GC 立刻清除；引用本身随后由 ReferenceHandler 入队。软引用的回收不是'内存不足就全清'，HotSpot 用近似 LRU：对象空闲时间超过 `空闲MB × -XX:SoftRefLRUPolicyMSPerMB(默认1000ms/MB)` 的才优先清。虚引用 `get()` 恒为 null，必须配 ReferenceQueue，典型实现就是 DirectByteBuffer 的 Cleaner——它也是 `finalize` 的官方替代，finalize 时机不确定、能让对象复活，JDK9 起已废弃，JDK18 起可 `--finalization=disabled` 关掉。"

---

## 3) 本章小结

- **平均分 77.7，最高 3-6（80，良好），最低 3-5（76，及格）**。三题 D 项齐整（9 分档），但 A/B/C 三项全线低于"准满分"线：**没有一题能进 90**，直接原因是两处事实性表述问题 + 三题共同的"只背清单、不给参数与机制"。

**最容易被面试官击穿的点（按严重度排序）**
1. **3-5「栈上分配」**——"逃逸分析 + 标量替换"与"栈上分配对象"混为一谈，P8 一句"那对象头放哪、字段取地址怎么办"就穿。
2. **3-4「StackOverflowError 当内存溢出」**——把 Error 和 OOM 混为一类，且与开头"内存溢出=抛 OutOfMemoryError"的定义自相矛盾。
3. **3-4 工具链缺 jcmd/Arthas/`-XX:+HeapDumpOnOutOfMemoryError`**——这三项恰好是"会不会真排查"的分界，答不出等于只有背过没干过。
4. **3-6 软引用说不出 `SoftRefLRUPolicyMSPerMB` 与 LRU 策略**，还缺 finalize/FinalReference 的坑（虚引用题的高频追问落点）。
5. **3-5/3-4 都说"大对象直接进老年代"**——默认 `PretenureSizeThreshold=0` 并不成立，G1 走 humongous，属于把特例当通例。
6. **3-5「堆只会抛一种 OOM」**——`GC overhead limit exceeded` 一答就错。

**最值得保留的亮点**
1. **3-6 的误区二**："ThreadLocal 泄漏是因为 value 是强引用，不是 key 是弱引用；key 若为强引用只会更严重"——这是三题里唯一有"反八股"深度的判断，能直接拉高面试官印象。
2. **3-5 的误区二**："栈越大 → 每线程占用越多 → 可创建线程越少 → 高并发反而 OOM"——把参数和容量规划连起来了，有工程味。
3. **3-4 的本质句 + 反例**："泄漏是过程、溢出是结果"＋"一次加载 10GB 文件，没泄漏也 OOM"——一句话立住框架，反例顺手澄清了常见误判。

**共性改法（三题通用）**：每个结论后面补"参数名 / 报错文本 / 判定动作"三件套。例如泄漏 → `-XX:+HeapDumpOnOutOfMemoryError` + `jstat -gcutil` 的 O 列；栈 → `-Xss` 与 `max_stack`；引用 → `SoftRefLRUPolicyMSPerMB` 与 Cleaner。三题补齐这些即可整体上探到 85+，但要冲 96+，还差一个"我实际用它定位过 XX 问题"的项目锚点（E 项目前三题均为 3/5）。
