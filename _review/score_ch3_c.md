# 第 3 章 Q7 评审（GC 机制）

## ① 评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 3-7 | Java 的 GC 机制你知道哪些 | 32 | 17 | 10 | 9 | 3 | 71 | 及格 |

---

## ② 逐题点评

### 3-7 Java 的 GC 机制你知道哪些 —— 71 分（及格）

- **得分**：A32 / B17 / C10 / D9 / E3
- **总体印象**：八段式框架（本质→判定→算法→收集器→GC类型→参数→误区→实践）非常完整，是"能背完、能自洽"的答案；但**全部停在"是什么"，没有一处下潜到"为什么"**，且三色标记/SATB/安全点/晋升年龄全缺——面试官只需一个追问就能击穿。

**必答点核对**

- 引用计数 vs 可达性分析（含循环引用缺陷、Java 选后者）✅
- GC Roots 枚举 ⚠️：只列"虚拟机栈/本地方法栈/静态变量/常量"——**漏活跃线程本身、被 synchronized 持有的对象、JNI Global 引用、系统类加载器**；且栈与方法栈本是同类，实际只覆盖一半
- 三色标记（黑白灰）+ 漏标两条件 ❌ 全缺
- 增量更新（CMS 写屏障 + 重新标记）vs SATB（G1 快照，代价是浮动垃圾）❌ 全缺
- 标记-清除 / 复制 / 整理 / 分代四算法 ✅（有一处说反，见硬伤）
- 复制算法"利用率只有 50%" 🆚 后文"SurvivorRatio 默认 8:1:1" ⚠️：两处自相矛盾未澄清（HotSpot 是 Eden+2Survivor≈90%）
- 收集器谱系（年轻代/老年代/全代三分法）✅ 但仅到"标签"级
- CMS 四阶段、并发模式失败、浮动垃圾、Serial Old 兜底 ⚠️→❌ 只给了"并发标记清除"一个标签
- G1 Region / RSet / CSet / Mixed GC / Humongous / 停顿预测模型 ❌ 全缺
- 版本演进：CMS JDK9 废弃 → JDK14 移除；ZGC JDK11 实验 → JDK15 转正 → JDK21 分代；JDK17 默认 G1 ❌ 全缺
- GC 类型与触发（Minor/Major/Full）✅ 基本对
- Full GC 触发（元空间满、System.gc、晋升失败）✅；缺并发模式失败、Humongous 分配失败、RMI 定时 gc ⚠️
- 参数 -Xms/-Xmx 设同值、-Xmn、SurvivorRatio、UseG1GC ✅
- 参数 -XX:MaxTenuringThreshold=15、PretenureSizeThreshold、MaxGCPauseMillis、ParallelGCThreads、MetaspaceSize、HeapDumpOnOutOfMemoryError、DisableExplicitGC ❌
- STW 与安全点/安全区域（safepoint poll、OopMap、为何要 STW）❌ 全缺
- 晋升年龄 15 及"为何上限是 15"（对象头 4 bit）❌
- 动态年龄判定（同龄及以上总和 > Survivor 一半即直接晋升）❌
- 空间分配担保（Minor GC 前检查老年代连续空间；JDK6u24 后 HandlePromotionFailure 失效但担保仍做）❌
- 误区澄清 System.gc 只是建议 + 停顿/吞吐权衡 ✅ 最有价值的两个点

**硬伤（原文表述 → 正确说法）**

1. 「标记-清除：先标记出所有需要回收的对象，然后统一清除」→ **标记阶段标记的是"存活（可达）对象"，清除阶段回收"未被标记"的对象**；若真去标垃圾，JVM 得先枚举所有对象反推，成本更高。
2. 「现在老年代的 GC 都使用这种（标记-整理）算法」→ **CMS 是标记-清除、不压缩**，只有 Serial Old / Parallel Old 用标记-整理；G1/ZGC 走复制（evacuation）。且此句与原文自己说的"CMS 是并发标记清除"直接自相矛盾。
3. 「-XX:+PrintGCDetails 打印 GC 详细日志、-Xloggc:gc.log 输出到文件」→ **JDK9 起废弃、JDK11+ 被移除**，JDK17 上直接 `Unrecognized VM option` 启动失败；正确写法 `-Xlog:gc*:file=gc.log:time,uptime,level,tags`。

**扣分点**

- A 项：上述 3 处硬伤共扣 8 分；另有「分代收集是现在所有 JVM 默认使用的算法」绝对化过度（Shenandoah 及 JDK21 前的 ZGC 不分代）、「ZGC/Shenandoah 停顿不超过 10ms」是 JDK11~15 口径（JDK16+ ZGC 已亚毫秒）——过时表述再扣少量。
- B 项：五组必答点（三色标记+SATB、STW/安全点、晋升与担保、CMS/G1 内部机制、版本演进）整体缺失，仅覆盖约 2/3。
- C 项：零源码级/零内存布局/零屏障机制，属"结论罗列"型八股，最容易被追问到答不出。
- D 项：扣 1 分——开篇 OCR 断行有残留、且"现在所有 JVM 默认"这类绝对化措辞在面试里容易被抓。

**可加分但没说的（按性价比排序）**

1. 三色标记 + 漏标两条件 + 增量更新/SATB 差异（这是 GC 面试区分度最高的地方，必补）。
2. STW 与安全点：`safepoint poll` 轮询点、`OopMap` 记录栈上引用位置，解释"为什么 STW 不可避免、为什么 GC 前要等所有线程到达安全点"。
3. 晋升三件套：15 岁（4 bit）+ 动态年龄判定 + 空间分配担保。
4. G1 的 Region/RSet/CSet/Mixed GC/`MaxGCPauseMillis` 停顿预测模型，一句话讲清"可预测"从哪来。
5. 版本线：CMS JDK9 deprecated/JDK14 移除，G1 JDK9 起默认，ZGC 11 实验→15 转正→21 分代。

**面试官追问（3 个，附一句话标准答法）**

1. **Q：三色标记什么时候会漏标？CMS 和 G1 各自怎么堵这个洞？**
   A：漏标只需两个条件同时成立——①黑对象新增了指向白对象的引用；②灰对象删掉了到白对象的引用（白对象因此断开与已扫描部分的链）。CMS 用**增量更新**：写屏障把"新增引用"记进脏卡，重新标记阶段把这些黑对象当根重扫；G1 用 **SATB**：写屏障在引用被**删除前**把旧值入队，按并发标记开始时的逻辑快照标记，代价是产生浮动垃圾、需等下一轮回收。
2. **Q：对象到底什么时候进老年代？**
   A：四条路——年龄达到 `MaxTenuringThreshold`（默认 15，上限也只能 15，因为对象头年龄位只有 4 bit）；**动态年龄判定**（Survivor 中年龄 ≤N 的对象总和超过 Survivor 一半，则 N 岁及以上直接晋升）；大对象直接进老年代（`PretenureSizeThreshold`；G1 下是超过半个 Region 的 Humongous）；Minor GC 后 Survivor 放不下，靠**空间分配担保**落到老年代。
3. **Q：G1 凭什么"可预测停顿"？区域化到底解决了什么？**
   A：堆切成约 2048 个等大 Region，逻辑分代、物理不连续；RSet（卡表实现）记录跨 Region 引用，避免回收单个 Region 时全堆扫描；每次按"回收收益/停顿时长"给 Region 排序，只选代价和不超过 `MaxGCPauseMillis` 的子集入 CSet，用衰减均值的历史数据预测，这就是"可预测"的来源；回收 Young+部分 Old 的混合轮次叫 Mixed GC。

**改法（2-3 句，可直接替换进稿子）**

把"四大算法"那段改成"**标记的永远是活对象，清的是没被标记的**"，并在复制算法后补一句"HotSpot 不按 1:1 切，而是 Eden:两个 Survivor = 8:1:1，可用空间约 90%，仍属复制算法"；把收集器段从"标签罗列"升级为"CMS（标记-清除+并发+Serial Old 兜底，JDK14 已移除）/ G1（Region+RSet+CSet，JDK9 起默认）/ ZGC（JDK15 转正、JDK21 分代）"三段式并各带一句机制；参数段把 `PrintGCDetails/-Xloggc` 全部替换为 `-Xlog:gc*:file=gc.log:time,uptime,level,tags`，再补 `MaxTenuringThreshold=15`、动态年龄判定、空间分配担保三条，并在结尾加一句 STW 与安全点的收口。

---

## ③ 一句话小结

框架和误区澄清是这份答案的真亮点，但它是一份"**能背完、扛不住一句追问**"的八股答案——补上三色标记/SATB、STW 安全点、晋升三件套，改掉 3 处硬伤，可从 71 冲到 88+。
