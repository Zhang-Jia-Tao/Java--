# 第 3 章 D 批评审（JVM · 垃圾回收）

> 评审口径：Rubric v1｜评审人：P8 面试官（GC 演进方向）
> 结论先行：两题都是「框架漂亮、谱系覆盖广、但关键数字与边界条件失守」的典型八股稿——话能说出口，扛不住第二层追问。

## ① 评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|---|---|---|---|---|---|---|---|---|
| 3-8 | 垃圾回收器有哪些 | 32 | 16 | 13 | 8 | 3 | **72** | 及格 |
| 3-9 | MinorGC / MajorGC / FullGC 的区别，什么场景触发 FullGC | 30 | 16 | 13 | 8 | 3 | **70** | 及格 |

---

## ② 逐题点评

### 3-8 垃圾回收器有哪些 —— 72 分（及格）

- **得分**：A32 / B16 / C13 / D8 / E3
- **必答点核对**：
  - 谱系：Serial ✅ / ParNew ✅ / Parallel Scavenge ✅ / Serial Old ✅ / Parallel Old ✅ / CMS ✅ / G1 ✅ / ZGC ✅ / Shenandoah ⚠️ / **Epsilon ❌ 整款缺失**
  - 各自算法·线程模型·STW·适用场景 ✅（八项基本都点了，这是本篇最大加分项）
  - 组合约束 ⚠️：ParNew↔CMS ✅、PS + Parallel Old ✅；缺「Parallel Scavenge 无法与 CMS 搭配（未实现 CMS 所需接口）」「G1/ZGC/Shenandoah 不参与年轻代-老年代组合」
  - 默认值演进 ⚠️：JDK8 Parallel、JDK9+ G1、ZGC 从未默认、JDK17 仍 G1 ✅；**缺 JDK21 分代 ZGC（JEP 439）**；未区分 JDK8 下 Client=Serial / Server=PS+PO
  - CMS 废弃(JDK9, JEP 291) / 移除(JDK14, JEP 363) ✅
  - G1 Region 上限 ❌ 写错（见硬伤 1）；**Humongous（≥ Region 50%）❌ 未提**
  - `-XX:MaxGCPauseMillis` 软目标 ⚠️：只说「可以指定最大停顿时间」，没说默认 200ms、是**软目标**、G1 靠调年轻代 Region 数去逼近，不保证
  - ZGC/Shenandoah 停顿 ⚠️：把「<10ms」当硬指标说（见硬伤 2）
  - 主流收集器对比表 ❌：「接下来是主流收集器的核心对比：」后直接进下一节，表格缺失 → 应为 **算法 / 线程模型 / STW 形态 / 目标（吞吐 or 延迟）/ 分代 or 分区 / 大对象处理 / JDK 默认区间 / 典型停顿量级 / 是否需大堆** 九维

- **硬伤**：
  1. 原文「将堆划分为 2048 个大小相等的 Region」→ 正确：Region 数量 **1~2048，2048 是上限不是定值**；每个 Region **1~32MB 且为 2 的幂**，大小≈堆/2048 就近取幂，由 `-XX:G1HeapRegionSize` 指定。512MB 堆只有 512 个 Region。
  2. 原文「ZGC…最大停顿时间不超过 10ms」（Shenandoah 同句式）→ 正确：**10ms 是设计目标/量级，不是保证值**；官方口径 JDK11 为 <10ms，JDK16（JEP 376 并发栈处理）后宣传亚毫秒级；Shenandoah 同理，且 Shenandoah 由 Red Hat 主导、JDK12（JEP 189）转正、**不在 Oracle JDK 发行版中**（原文完全没给版本与发行归属）。
- **扣分点**：
  - 术语自造：「全代收集器」不是业界说法，应为「分区/不分代收集器」；G1/ZGC 常被称「全堆收集器」。
  - G1 算法没讲：整体标记-整理 + Region 间复制（原文只说「没有内存碎片」，但 Humongous Region 恰恰会碎）。
  - CMS 缺兜底与调优点：Serial Old 兜底、`CMSInitiatingOccupancyFraction` 默认 68%、浮动垃圾。
  - 误区段逻辑打架：前半「很多人以为 G1 只适合大内存」，后半却用「8GB 以上性能就超过 CMS」来论证——等于自己承认要 8GB。正确表述是「G1 在 **6~8GB 以上** 堆对 CMS 优势明显，小堆（<4GB）下 RSet 开销反而拖后腿」。
- **可加分但没说的**：
  - Epsilon（JDK11, JEP 318）：no-op 收集器，用于性能基线测试/短生命周期任务/「最后一点延迟也不许有」的场景。
  - G1 的两块工程地基：RSet + Card Table（跨 Region 引用）、SATB 写前屏障（并发标记不漏标）；`InitiatingHeapOccupancyPercent` 默认 45% 触发并发标记。
  - ZGC 除染色指针+读屏障外还有**内存多重映射**（同一物理页映射到 3 个虚拟视图）与 JDK21 分代 ZGC。
  - ZGC 的 STW 准确说法是「与堆大小、活跃对象数无关，只与 **GC Roots 集合规模/线程栈扫描** 相关」——原文摸到了边但没落到「JDK16 后栈扫描也并发了」。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 「G1 的 2048 个 Region 是怎么定的？Region 大小谁来选？」→ 堆/2048 就近取 2 的幂并钳在 1~32MB，`G1HeapRegionSize` 可覆盖；2048 是上限，Region 越少则大对象越容易 Humongous。
  2. 「`MaxGCPauseMillis=50` 就一定 50ms 内停？」→ 是软目标，G1 靠「预测模型 + 回收价值排序」挑选本次回收的 Region 数逼近它，大对象/疏散失败时照样超标。
  3. 「JDK17 上想上 ZGC，要注意什么？」→ 不分代（JDK21 前）导致吞吐略降、需要开 `-XX:+UnlockExperimentalVMOptions`（JDK15 起不必）、要求堆预留/大页；且 ZGC 从不是默认，必须显式 `-XX:+UseZGC`。
- **改法**：把 G1 那句改成「G1 把堆切成 **最多 2048 个** 大小相等的 Region（每个 1~32MB、2 的幂），≥ 半个 Region 的对象算 Humongous，单独占连续 Region」；把 ZGC/Shenandoah 的「不超过 10ms」统一改成「**设计目标是 10ms 量级（JDK11）/ 亚毫秒（JDK16 后），STW 只与 Root 规模相关，不随堆增长**」；再补一句 Epsilon 与 JDK21 分代 ZGC，谱系就闭环了。

---

### 3-9 MinorGC / MajorGC / FullGC 的区别，什么场景触发 FullGC —— 70 分（及格）

- **得分**：A30 / B16 / C13 / D8 / E3
- **必答点核对**：
  - 三者定义与范围 ✅（Minor 年轻代 / Major 老年代 / Full 全堆+元空间）
  - **MajorGC 非标准术语的争议 ✅**（写得比多数稿子清醒：不同实现定义不同、行业趋向用 FullGC 泛指）——本篇最佳一句
  - 缺一句：**CMS 语境下 Major GC 特指「老年代 CMS 周期」**，业界混用的根源就在这里
  - 触发场景七大条：老年代不足 ✅ / 元空间不足 ✅ / System.gc ✅ / 大对象进老年代 ⚠️ / 晋升-担保失败 ⚠️ / CMS CMF ✅ / G1 Mixed 跟不上 ✅
  - **`-XX:+DisableExplicitGC` ❌ 未提**（也不提 `ExplicitGCInvokesConcurrent`）
  - **G1 Evacuation Failure（to-space exhausted）❌ 未提**——这才是 G1 线上 Full GC 更常见的直接原因
  - **「G1 Full GC 在 JDK10 前是单线程 Serial 回退」❌ 未提**（JEP 307 起并行）
  - 缺：空间分配担保判定逻辑、Survivor 动态年龄判定、Minor GC 的真实触发条件（**Eden 分配失败**而非「Eden 满了」）、`MetaspaceSize` 首次阈值
  - 三者对比表 ❌：「这是面试必背内容：」后表格缺失 → 应为 **回收区域 / 是否 STW / 触发时机 / 耗时量级 / 发生频率 / 是否回收元空间 / 对延迟影响 / 日志关键字** 八维
- **硬伤**：
  1. 原文「FullGC 会先执行一次 MinorGC，再执行老年代回收，最后回收元空间，这样可以提高回收效率」→ 正确：**顺序由触发原因决定，不能绝对化**。老年代担保失败类 Full GC 前确实常先做一次 Minor GC；但 `System.gc()`、元空间不足触发的 Full GC 不保证先 Minor；HotSpot 实际还会先在 Full GC 里做**软引用清理 + 类卸载/元空间回收**，再说「元空间放最后」也不成立。这是把「一种常见实现路径」写成了「通用定理」。
  2. 原文「JVM 有一个参数 -XX:PretenureSizeThreshold，大于这个值的对象会直接分配在老年代」→ 正确：**默认值 0 = 不启用**（不是「0 就全都进老年代」），且**只对 Serial / ParNew / Parallel Scavenge 生效，对 G1 不生效**——G1 走 Humongous Region（≥ 半个 Region）。漏掉这两点，参数就成了误导。
  3. 原文「MinorGC 后存活对象复制到 Survivor，Survivor 不足只能直接晋升，老年代也不够就 FullGC」（冠以「晋升失败」）→ 正确：这里混了三个概念——**空间分配担保失败**（Minor GC 前用「历次晋升平均大小」对比老年代连续可用空间，不够则**先 Full GC 再 Minor GC**）、**晋升失败 Promotion Failed**（老年代放不下要晋升的对象，多见于 CMS，退化 Serial Old）、**Survivor 装不下**（走担保提前晋升，本身不必然 Full GC）。
- **扣分点**：
  - 场景 4 的因果链写反了层次：真正的 Full GC 发生在「Minor GC **之前**的担保检查」或「晋升时老年代分配失败」，不是「Survivor 满了」。
  - 「新生代设为堆的 1/3 到 1/2」是经验值却当结论说：默认 `NewRatio=2` 即新生代 1/3；调到 1/2 极易挤压老年代、反而**制造** Full GC，面试官会当场反问。
  - 场景 3 与误区 2 内容重复（System.gc 说了两遍），七场景 3 分钟能讲完的东西被拉长，节奏不如 3-8。
  - 「生产环境绝对禁止显式调用 System.gc()」过于绝对——正解是「**用 `-XX:+DisableExplicitGC` 兜底**；且要知道 NIO `DirectByteBuffer` 回收路径、部分框架/中间件会触发它，盲目禁用可能换来 OOM: Direct buffer memory」。
- **可加分但没说的**：
  - GC 日志关键字定位法：`Allocation Failure`（Minor）、`Promotion Failed` / `to-space exhausted`（G1 疏散失败→Full）、`CMS Concurrent Mode Failure`、`System.gc()`、`Metadata GC Threshold`、`Ergonomics`——这是「什么场景触发」的实操答案，比背七条更值钱。
  - 元空间不足的真正后果链：Full GC → 卸载类 → 仍不够则 `OOM: Metaspace`；默认 `MaxMetaspaceSize` 无上限。
  - G1 的 `InitiatingHeapOccupancyPercent=45` 控制何时进混合回收，是「Mixed GC 跟不上」的调优旋钮。
  - `CMSInitiatingOccupancyFraction` 默认 68% 是 CMF 的直接防线。
- **面试官追问（3 个，附一句话标准答法）**：
  1. 「线上 Full GC 一分钟一次，你怎么定位？」→ 先看 GC 日志的**触发原因字段**（Allocation Failure / to-space exhausted / System.gc / Metadata GC Threshold），原因决定优化方向，而不是先调堆。
  2. 「G1 下 Full GC 为什么特别可怕？有优化空间吗？」→ JDK10 前是单线程 Serial 回退、整堆压缩停顿可达秒级；JDK10+ 并行化，更该做的是通过 `MaxGCPauseMillis`、增大堆、降 Humongous 比例避免疏散失败。
  3. 「Full GC 一定回收元空间吗？」→ 会尝试卸载无用类（类加载器可回收 + 类无实例 + 无引用），但不是「一定回收成功」，类卸载需要满足三个条件且受 `ClassUnloadingWithConcurrentMark` 等开关影响。
- **改法**：删掉「FullGC 先执行 MinorGC 再老年代最后元空间」这句定理式表述，改为「**Full GC 前是否先做 Minor GC，取决于触发原因**：担保/晋升类触发会先 Minor GC 或直接整体回收，`System.gc()` 与元空间阈值触发则不一定」；把场景 5 补成「`PretenureSizeThreshold` **默认 0 不启用**、仅对 Serial/ParNew/PS 生效，G1 用 Humongous 判定」；再加一条真正的第八场景「**G1 Evacuation Failure / to-space exhausted**」，七大场景的说法才站得住。

---

## ③ 一句话小结

两题都能在面试里「说满 3 分钟、留不下破绽但不加分」——3-8 赢在谱系与版本演进、输在 G1 Region/Humongous 与停顿指标的量级表述；3-9 赢在 MajorGC 术语争议清醒、输在 Full GC 触发顺序被绝对化与参数默认值缺位，两题的共性缺口都是**「缺对比表 + 缺 GC 日志关键字 + 缺 GC 版本级细节（JDK10 并行 Full GC / JDK21 分代 ZGC / Epsilon）」**，补上这三样即可各进 85+。
