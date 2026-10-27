# 第1章 集合 —— 面试稿评分（Rubric v1）

> 评审视角：一线大厂 P8 面试官，Java 后端 8 年。评价口径：**"这段话在真实面试里能不能拿满分/会不会被打断"**。
> 说明：PDF 抽取导致的错字（"用戶""叶面"等）、多余换行、`<!--p3-->` 行号残留、正文里插入的项目锚点段落，均**不扣分**；只对技术性表述计分。

---

## ① 评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 1-1 | HashMap 与 ConcurrentHashMap 区别 | 38 | 21 | 17 | 9 | 4 | 89 | 良好 |
| 1-2 | ArrayList 与 LinkedList 区别、哪个集合线程安全 | 38 | 20 | 16 | 9 | 4 | 87 | 良好 |
| 1-3 | ArrayList 扩容机制 | 38 | 21 | 17 | 9 | 4 | 89 | 良好 |
| 1-4 | HashMap 实现原理 | 36 | 20 | 17 | 9 | 3 | 85 | 良好 |
| 1-5 | HashMap 扩容机制 | 36 | 19 | 15 | 8 | 3 | 81 | 良好 |
| 1-6 | HashMap、Hashtable、ConcurrentMap 区别 | 33 | 20 | 16 | 9 | 3 | 81 | 良好 |

**结论**：全章 6 题均在"良好"带（81–89），**没有任何一题能直接当满分标准答案背诵**。共性问题——结构和口语化都很好（D 稳定 8–9），但"源码级细节 + 高频追问点"集体欠一口气：`size 统计`、`e.hash & oldCap` 的准确表述、`Hashtable 11/2n+1`、`CHM 弱一致 vs 快照` 四处是明显缺口。最接近满分的是 1-1 与 1-3，补 2–3 个点即可上 90+。

---

## ② 逐题点评

### 1-1 HashMap 与 ConcurrentHashMap 区别 —— 89 分（良好）

- **得分**：A38 / B21 / C17 / D9 / E4
- **必答点核对**：
  - 线程安全本质差异（不同步 vs 专为并发设计）✅
  - JDK7 分段锁：16 个 Segment、Segment 继承 ReentrantLock、默认并发度 16 ✅
  - JDK8 CAS + synchronized、锁到桶头节点、并发度≈数组长度 ✅
  - 空桶 CAS 无锁插入 / 冲突才锁头节点 ✅（这段"优化表述"是全文最见功底的地方）
  - HashMap 线程问题：JDK7 扩容成环→get 死循环 CPU 打满；JDK8 无死循环但覆盖/丢失 ✅
  - 数据结构：JDK8 之后两者都是数组+链表+红黑树；8 / 64 / 6 三阈值 ✅
  - CHM 的 Node 用 volatile 修饰 val 与 next ✅
  - null 语义：HashMap 一个 null key + 多 null value；CHM 全禁 ✅，且给了"无法区分 key 不存在 / value 为 null"的动机 ✅
  - 扩容差异：单线程扩容 vs 并发协助迁移 ✅
  - 复合操作非原子 ✅
  - **缺失**：CHM 的 `size()` 统计（baseCount + CounterCell，弱一致估计值）❌；JDK7 Segment **内部 HashEntry 数组**这一层结构 ❌；迭代器语义差异（fail-fast vs 弱一致）❌
- **硬伤**：**无**。（技术事实全部对得上，JDK 版本归属、阈值、锁粒度、volatile 都没写反。）
- **扣分点（A 2 / B 4 / C 3 / E 1）**：
  1. 「复合操作不是原子的……**需要额外加锁**保证原子性」——方向没错但不是最优解：CHM 自带 `putIfAbsent/compute/computeIfAbsent/merge/replace(k,v)`，面试官期待的是"用原子方法，而不是自己再套一把锁"。（1-6 里答对了，1-1 没答对，同章不一致。）
  2. 「这是**并发集合的通用设计**」——顺带把 Hashtable 也带进来了，Hashtable 禁 null 是历史实现（`hash & 0x7FFFFFFF` 后取模 + 早期约定），不是同一动机；一句话混两种原因，容易被追问。
  3. 项目锚点理由偏弱：「mark 是业务标识符（**非自增整数**），天然适合作为 HashMap 的 key」——key 是不是整数跟 HashMap 毫无关系（任意对象都能当 key），这个理由是伪理由。真正站得住的是：mark 唯一、注册发生在 `CommandLineRunner` 单线程启动期、启动后只读。你后半句写对了，前半句要删。
  4. 并行读场景没提"CHM 的 get 是无锁 + 弱一致读，可能读到上一次写之前的值"，这恰好是你后面说"性能接近 HashMap"的原因。
- **可加分但没说的**：
  - `sizeCtl`（-1 初始化中 / -N 表示 N-1 个线程扩容中 / 正数阈值）+ `ForwardingNode`（hash = MOVED）→ 一句话就能把"并发扩容"从口号变成机制。
  - `helpTransfer` + `stride` 分桶认领：其他线程 put 撞到 ForwardingNode 时不是干等，而是加入迁移。
  - JDK7 CHM 的 `size` 是"先不加锁统计两次、不一致再加锁全段统计"；JDK8 是 LongAdder 思路。
  - CHM 不允许 null 还有一条实现层原因：`get` 返回 null 无法用 `containsKey` 二次确认（并发下二次确认本身也不可靠）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"JDK8 的并发扩容具体怎么协作？"** → 用 `sizeCtl` 负值标记"扩容中"，每个桶迁移完就放一个 `ForwardingNode`，别的线程 put 撞到它（hash=MOVED）就 `helpTransfer`，按 stride 认领一段桶区间一起搬。
  2. **"`size()` 是精确值吗？"** → 不是，JDK8 用 `baseCount` + `CounterCell[]` 分散热点（LongAdder 思路），`sumCount()` 求和得到的是弱一致估计值，并发中只能当近似值用。
  3. **"CHM 的 get 为什么可以完全不加锁？"** → Node 的 `val`/`next` 是 volatile，JDK8 又是尾插不改变已发布节点的链接关系，读线程要么看到旧值要么看到新值，不会看到"半个节点"。
- **改法（可直接替换进稿子的一段话）**：
  > 复合操作不是原子的——比如"先判断再更新"，`put` 和 `get` 各自原子，但中间可能被别的线程插进来。所以我不自己加锁，而是用 CHM 提供的原子方法：`putIfAbsent`、`computeIfAbsent`、`compute`、`merge`、`replace(k, old, new)`，它们内部在桶级别加锁并做 CAS，语义和性能都比我外面套一把锁好。另外要提醒一句：CHM 的 `size()` 不是精确值，它是 `baseCount` 加一组 `CounterCell` 分散计数后求和，并发场景下只能当估算。

---

### 1-2 ArrayList 与 LinkedList 区别、哪个集合线程安全 —— 87 分（良好）

- **得分**：A38 / B20 / C16 / D9 / E4
- **必答点核对**：
  - 底层结构：动态数组（连续）/ 双向链表（不连续）✅
  - 随机访问 O(1) vs O(n)，且解释了"下标直接算地址"✅
  - 头 / 尾 / 中间增删复杂度 ✅，且给出**高质量洞察**："中间增删都是 O(n)，但 ArrayList 是内存批量拷贝（`System.arraycopy`），比 LinkedList 的遍历 + 指针修改快得多" ✅
  - 内存占用：ArrayList 预留容量（每次 +50%）/ LinkedList 每节点多两个指针 ✅
  - 澄清误区"LinkedList 增删一定更快"✅
  - 都不是线程安全：覆盖、丢失、链表断裂、迭代器 CME ✅
  - 三种线程安全替代（Vector / synchronizedList / CopyOnWriteArrayList）✅
  - COW 两大缺点：内存开销（整数组复制、GC 压力）、弱一致（读旧快照）✅ —— 这两条答得很准，是本题最强的一段
  - **缺失**：`RandomAccess` 标记接口与 `Deque`（LinkedList 可当栈/队列）❌；`synchronizedList` 迭代仍需手动 `synchronized(list)` 包住 ❌；COW 写操作内部是 `ReentrantLock`、迭代器不支持 `remove` ❌
- **硬伤**：**无**。（"中间增删 ArrayList 反而快"这个反直觉点答对，说明是真读过源码而不是背八股。）
- **扣分点（A 2 / B 5 / C 4 / E 1）**：
  1. 「在尾部增删时，**两者都是 O(1)**」——说法过于绝对：ArrayList 尾部 add 是**均摊** O(1)，触发扩容那一次是 O(n)（要复制整个数组）。面试官常在这里追一句"那扩容那次呢"。
     - 原文表述 → 正确说法：尾部 add 均摊 O(1)，扩容当次 O(n)；`remove(size-1)` 不移动元素，确实 O(1)。
  2. 「LinkedList 每个节点都需要存储前驱和后继指针」——只说了一半。真实开销是 `Node` **对象头（12–16B）+ 3 个引用 + 数据 + 对齐填充**，约 24–40B/元素，而且节点在小堆里散落导致 **缓存不友好（cache miss）**。这一点才是 LinkedList 实际翻车的根因。
  3. 项目锚点措辞含糊：「读写均衡用 Collections.synchronizedList【并发收集可用/不可用优惠券列表 CouponQueryServiceImpl.java】」——如果那段代码实际是 `parallelStream().collect()` 收集结果，用 `synchronizedList` 是错的解法（应各自线程内 List 再 `addAll`，或用 `Collectors.toList`）；如果真是多线程共享写，这个锚点才成立。**锚点写法必须能一句话说清"几个线程、读几次写几次"**，否则等于给面试官递刀。
  4. 漏了"Vector 是 2 倍扩容、`capacityIncrement` 可指定"这个对比点（同章 1-3 答了，这里没串起来）。
- **可加分但没说的**：
  - `ArrayList implements RandomAccess` → `Collections.binarySearch` / `shuffle` 会走 `get(i)` 下标路径而不是迭代器，这是"标记接口有什么用"的标准答案。
  - `LinkedList implements Deque` → 可当 `Stack`/`Queue` 用，且 `ArrayDeque` 才是栈/队列的正确首选（比 `Stack` 和 `LinkedList` 都快）。
  - `synchronizedList` 的 `listIterator` 没被包装成同步，遍历必须 `synchronized (list) { for (...) }`。
  - COW 适用于"读远多于写、且元素个数不大"——写一次复制 O(n)，高频写会退化成 O(n²)。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"LinkedList 除了 List 还能干什么？"** → 它实现了 `Deque`，可以当双端队列/栈用（`offerFirst/pollLast/push/pop`）；但真要做栈或队列，`ArrayDeque` 在所有场景都比它快（无节点分配、缓存友好）。
  2. **"`Collections.synchronizedList` 就彻底线程安全了吗？"** → 不，单方法原子而已；复合操作和**迭代**都不安全，遍历必须用 `synchronized (list)` 把整个循环包住，否则照样 CME。
  3. **"COW 的写操作也要加锁，那它凭什么快？"** → 快在读：读不加锁、不加 volatile 判断，直接读当前数组引用；写用内部 `ReentrantLock` 串行化复制 + 引用切换，用"写变慢"换"读零开销"，所以只适合读多写少。
- **改法（可直接替换进稿子的一段话）**：
  > 补充一个容易漏的点：`ArrayList` 实现了 `RandomAccess` 标记接口，`Collections.binarySearch`、`shuffle` 这类算法会据此走下标访问而不是迭代器，这也是它随机访问快的来源之一；`LinkedList` 则实现了 `Deque`，可以当栈和队列用，但实际做栈/队列我会选 `ArrayDeque`——没有节点分配，缓存友好，比 `LinkedList` 和老的 `Stack` 都快。另外 `Collections.synchronizedList` 只是单方法加锁，遍历时必须自己用 `synchronized (list)` 包住整个循环，否则一样抛 CME。

---

### 1-3 ArrayList 扩容机制 —— 89 分（良好）

- **得分**：A38 / B21 / C17 / D9 / E4
- **必答点核对**：
  - 触发条件：add 前判断 `size + 1 > elementData.length` ✅
  - JDK7 及之前饿汉式（构造即 `new Object[10]`）/ JDK8 懒汉式（首次 add 才到 10）✅，且给了"避免创建了不加元素浪费内存"的动机 ✅
  - 新容量 1.5 倍，公式 `oldCapacity + (oldCapacity >> 1)` ✅ **完全正确**
  - 特殊情况：1.5 倍不够就取 `minCapacity` ✅
  - 上限：`MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8` ✅ 数值写对了
  - 步骤：算容量 → 建新数组 → `System.arraycopy`（native）→ 更新 `elementData` 引用 ✅
  - 性能开销 + 提前 `new ArrayList<>(initialCapacity)` / `ensureCapacity` 预热 ✅
  - 澄清误区："不是 2 倍，从 JDK1.2 起就是 1.5 倍，Vector 才是 2 倍"✅
  - **缺失**：`DEFAULTCAPACITY_EMPTY_ELEMENTDATA` vs `EMPTY_ELEMENTDATA` 的区别 ❌；`modCount++` 与 fail-fast 的关联 ❌；`trimToSize` ❌；`hugeCapacity` 的双分支 ❌
- **硬伤**：**无**。（`1.5` 公式、`-8`、`arraycopy`、JDK7/JDK8 初始化差异、Vector 2 倍，五处最易错的地方全对，这是全章技术准确度最高的一题。）
- **扣分点（A 2 / B 4 / C 3 / E 1）**：
  1. 「如果超过了 `Integer.MAX_VALUE - 8`，**就使用 `Integer.MAX_VALUE`**」——精度不足，源码是双分支：
     - 原文表述 → 正确说法：`grow` 算出 `newCapacity` 后，若 `newCapacity - MAX_ARRAY_SIZE > 0` 走 `hugeCapacity(minCapacity)`：`minCapacity` 本身 > `MAX_ARRAY_SIZE` 才返回 `Integer.MAX_VALUE`，否则**截到 `MAX_ARRAY_SIZE`**；并且 `minCapacity < 0`（溢出成负）时直接抛 `OutOfMemoryError`。所以"超过 -8 就给 MAX_VALUE"是错的，绝大多数情况是**先停在 `MAX_VALUE - 8`**。
  2. 没讲"为什么是 -8"：部分 VM 的数组对象头要存长度等元数据，留 8 字节余量，否则会在申请时抛 `OutOfMemoryError: Requested array size exceeds VM limit`。这是必然追问。
  3. `ensureCapacity` 只说"预扩容"，没讲语义：JDK8 里 `ensureCapacity(minCapacity)` 只在 `minCapacity > elementData.length` 时 `grow(minCapacity)`，能一次到位；但**之后继续 add 仍按 1.5 倍走**，所以"完全避免扩容"的前提是预估准确。
  4. E 项偏弱："创建时就指定初始容量"是通用最佳实践，没有具体项目锚点（比如某个批量导出场景预估 5000 条，一次 `new ArrayList<>(5000)` 省掉 6 次复制）——和 1-1/1-2 的锚点质量不匹配。
- **可加分但没说的**：
  - `new ArrayList<>()` 用 `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`（首次 add 直接到 10），`new ArrayList<>(0)` 用 `EMPTY_ELEMENTDATA`（首次 add 只到 1）——这是"JDK8 懒汉初始化"最漂亮的追问点。
  - `elementData` 是 `transient`，序列化走 `writeObject` 只写 `size` 个元素，不写预留容量——解释了"为什么反序列化后容量刚好等于 size"。
  - 扩容前 `modCount++`，扩容改变数组引用但不改变 modCount 语义；fail-fast 靠的是 `modCount != expectedModCount`。
  - `Arrays.copyOf` 内部就是 `System.arraycopy` + 新建数组，两者不是两套机制。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"为什么上限是 `Integer.MAX_VALUE - 8` 而不是 `Integer.MAX_VALUE`？"** → 给 VM 留数组对象头的元数据空间，越过就会抛 "Requested array size exceeds VM limit"；而且代码路径是 `hugeCapacity` 里 `minCapacity > MAX_ARRAY_SIZE` 才给 `MAX_VALUE`，否则先截到 `MAX_VALUE - 8`。
  2. **"`new ArrayList<>()` 和 `new ArrayList<>(0)` 有什么区别？"** → 前者持有 `DEFAULTCAPACITY_EMPTY_ELEMENTDATA`，首次 add 直接扩到 10；后者持有 `EMPTY_ELEMENTDATA`，首次 add 只扩到 1，之后按 1.5 倍慢慢长。
  3. **"`ensureCapacity(1000)` 之后就一定不会扩容了吗？"** → 一次到位没问题（`grow(minCapacity)` 直接给 1000），但再加到超过 1000 仍按 1.5 倍扩，所以它只是"减少"扩容次数，不是"消除"。
- **改法（可直接替换进稿子的一句话）**：
  > 上限这里要精确一点：算完 1.5 倍后如果超过 `MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8`，会走 `hugeCapacity`——只有"需要的最小容量"本身就超过 `MAX_ARRAY_SIZE` 才给 `Integer.MAX_VALUE`，否则截到 `MAX_VALUE - 8`；留这 8 个字节是给某些 VM 的数组对象头存元数据，越过会抛 "Requested array size exceeds VM limit"。

---

### 1-4 HashMap 实现原理 —— 85 分（良好）

- **得分**：A36 / B20 / C17 / D9 / E3
- **必答点核对**：
  - 哈希表 + O(1)，JDK7 数组+链表 / JDK8 数组+链表+红黑树 ✅
  - 树化 8 / 64、退化 6、O(n)→O(log n) ✅
  - hash 扰动：`h = hashCode ^ (h >>> 16)`，高位参与、减少冲突 ✅
  - 2 的幂 → `& (n-1)` 等价取模且更快 ✅
  - put 全流程：初始化 → 算下标 → 空桶直插 → key 相等覆盖 → 链表/树插入 → 判树化 → 判扩容 ✅（顺序基本正确）
  - 扩容：0.75 阈值、2 倍、不用重算 hash、判最高位决定原位/原位+oldCap ✅
  - 版本差异：JDK7 头插→成环死循环；JDK8 尾插修复 ✅
  - 澄清"JDK8 也不线程安全"✅
  - **缺失**：**get 流程完全没讲** ❌（本题问的是"实现原理"，put+get 是必答的两条腿）；`null` key 走 `hash=0` 放 0 号桶 ❌；`size/threshold/loadFactor/modCount` 字段与 `Node` 内部类 ❌；为什么选红黑树而不是 AVL / 跳表 ❌；8 和 6 之间为什么留 7 ❌
- **硬伤**：**1 处（轻）**
  - 原文表述：「只需要判断**原哈希值的最高位**是 0 还是 1，就可以直接确定新下标是原位置还是原位置加原容量」
    → **正确说法**：判断的是 `(e.hash & oldCap) == 0`，即 hash 值在"**旧容量对应那一位**"（也就是扩容后新增的最高有效位）上是 0 还是 1，**不是 hashCode 的符号位/最高位**。`oldCap` 是 16 就取 bit4，是 32 就取 bit5。这句一旦被追问"为什么是最高位"，答不上来就露了。
  - 另一处精度问题（合并计在此题）：「链表长度**超过 8** 且数组长度**超过 64**」→ 源码是 `binCount >= TREEIFY_THRESHOLD - 1`（链表达 8 个节点即尝试）且 `tab.length >= MIN_TREEIFY_CAPACITY(64)`，即**恰为 64 就能树化**，"超过 64"多算了一档。
- **扣分点（A 4 / B 5 / C 3 / E 2）**：
  1. 上面两处精度问题（A 扣 4）。
  2. 只讲 put 不讲 get：面试官一定会问"get 怎么找"，而 get 恰好能带出"先比 hash 再 `==` 再 `equals`、树节点走 `find`"这些真细节（B 扣）。
  3. 「判断链表长度是否超过 8，如果是就尝试转红黑树」——漏了"`treeifyBin` 里先判 `tab.length < 64` 就 `resize()` 而不是树化"，这一点在 1-5 讲了、这里没讲，同一份稿子前后不一致。
  4. **E 项空缺**：本题通篇没有一句项目/踩坑锚点（1-1、1-2 都有），像是纯八股复述，5 分只能给 3。
- **可加分但没说的**：
  - `hash(key)` 里 `key == null ? 0 : (h = key.hashCode()) ^ (h >>> 16)` → null key 固定落在 0 号桶，且只能有一个。
  - JDK8 迁移用 `loHead/loTail` + `hiHead/hiTail` 两条链**尾插**，既免重算 hash，又保持桶内相对顺序（这正是它不会成环的根因）。
  - `tableSizeFor(cap)`：构造传入的容量会被向上取整到 2 的幂，所以 `new HashMap<>(10)` 实际是 16。
  - 树化阈值取 8 的依据：随机 hash 下桶内节点数服从均值 0.5 的泊松分布，长度到 8 的概率约 `6e-8`；退树取 6 而不是 7，是留出缓冲避免在临界点反复树化/退化抖动。
  - 红黑树 vs AVL：红黑树插删旋转次数少（最多 3 次）、查询 O(log n) 略逊 AVL 但综合更优；跳表内存开销更大且不利于数组+桶结构。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"为什么树化是 8、退化是 6，中间为什么留 7？"** → 随机 hash 下桶内节点数近似均值 0.5 的泊松分布，到 8 的概率约 6e-8，正常情况下几乎不会树化；6 和 8 之间留一个缓冲带，避免节点在 7 附近增减时反复树化/退化。
  2. **"为什么要 `h ^ (h >>> 16)`，不能直接用 hashCode 吗？"** → 因为 table 通常只有 16/32，`index = hash & (n-1)` 只用得到低位，高位差异全被丢掉；异或把高 16 位折到低位，等于让高位也参与选址，冲突率明显下降。
  3. **"null key 放在哪个桶？get 的查找顺序是什么？"** → null key 的 hash 固定为 0，落在 0 号桶；get 是先比 hash、再 `==`、再 `equals` 逐节点比对，命中红黑树就按树的方式 `find`，找不到返回 null。
- **改法（可直接替换进稿子的一句话）**：
  > 迁移时不需要重算 hash：拿 `e.hash & oldCap` 判断——注意不是看 hashCode 的最高位，而是看"旧容量那一位"，16 就取 bit4、32 就取 bit5；结果为 0 就留在原下标，为 1 就落到"原下标 + oldCap"。这样一条链被拆成 lo、hi 两条尾插链，既不用重新取模，也保住了桶内相对顺序，这也是 1.8 不会成环的根本原因。

---

### 1-5 HashMap 扩容机制 —— 81 分（良好）

- **得分**：A36 / B19 / C15 / D8 / E3
- **必答点核对**：
  - 本质：容量固定 → 2 倍新数组 → 重新分布，目的降冲突保 O(1) ✅
  - 触发一：`size > capacity * 0.75`，默认 16 → 阈值 12 ✅
  - 触发二：链表到 8 但数组 < 64 时先扩容不树化 ✅（这条很多稿子都会漏，答得很好）
  - JDK8 三步：算新容量/新阈值（各 2 倍）→ 建新数组 → 迁移 ✅
  - 高低位判定，免重算 hash ✅（表述有问题，见硬伤）
  - 为什么 0.75、为什么 2 的幂 ✅
  - 优化：`初始容量 = 预估数量 / 0.75 + 1` ✅（公式对）
  - **缺失**：JDK7 的迁移方式（逐个重算 `indexFor` + 头插，导致逆序与成环）——**标题承诺了"版本差异"却没展开** ❌；首次 put 的初始化扩容（`table == null` → `resize()` 到 16、阈值 0→12）❌；`loHead/hiHead` 四条链的尾插实现 ❌；`tableSizeFor` 会把用户容量向上取 2 的幂 ❌
- **硬伤**：**1 处（轻）**
  - 原文表述：「只判断**原哈希值的最高位**是 0 还是 1」
    → **正确说法**：`(e.hash & oldCap) == 0` 留在原位，否则 `oldCap + 原下标`；判断的是旧容量那一位，不是 hashCode 最高位。
  - 原文表述：「默认初始容量 16 的 HashMap，当元素**达到 12 个时**就会触发第一次扩容」
    → **正确说法**：`threshold = 16 * 0.75 = 12` 是阈值；`putVal` 先插入再 `if (++size > threshold) resize()`，所以实际是**插入第 13 个元素时**才扩容。"到 12 就扩"是阈值与触发点混为一谈，一问"第 12 个还是第 13 个"就卡住。
- **扣分点（A 4 / B 6 / C 5 / D 2 / E 2）**：
  1. 上述两处（A 扣 4）。
  2. **结构承诺落空**：开头说"从核心本质、触发条件、JDK1.8 扩容过程、**版本差异**、优化方法五个方面"，但正文只有一句「这也是现在的主流版本」，JDK7 与 JDK8 的**迁移方式对比一个字没有**（1-4 反而讲了头插）。面试官会直接打断："那 1.7 是怎么迁的？为什么 1.7 会成环、1.8 不会？"（B 扣 6、D 扣 2——承诺不兑现是最伤表达的）
  3. 「"基于泊松分布的统计结果，此时哈希冲突的概率极低"」——因果有点倒置，属**似是而非**：
     - 原文表述 → 更严谨说法：0.75 本身是**空间占用与查询开销的工程折中**（3/4 装载、1/4 空闲）；泊松分布（JDK8 注释里"桶内节点数近似均值 0.5 的泊松分布"）是用来**论证装载因子 0.75 下冲突有多稀、从而论证树化阈值 8 够用**的。说成"0.75 是泊松算出来的"，追问一句"泊松怎么算的"就答不出。
  4. 「优化方法……公式是预估数量 / 0.75 + 1」对，但漏了关键副作用：`new HashMap<>(cap)` 会走 `tableSizeFor` 向上取 2 的幂，所以 `cap=13` 实际给 16、`cap=17` 给 32，按 2 的幂估内存才准（可加分没拿）。
  5. **E 项偏弱**：只有"我都会尽量提前预估"这种通用说法，没有具体项目/踩坑锚点。
- **可加分但没说的**：
  - JDK7 `transfer()`：`rehash` + `indexFor` 重新取模 + 头插 → 同桶元素顺序反转；两线程并发时互相插到对方链表头 → 成环。
  - JDK8 `loHead/loTail` + `hiHead/hiTail` 尾插，保持相对顺序，环无法形成（但仍会丢数据）。
  - `resize()` 的另一个入口：`table == null` 时首次 put 触发初始化；`treeifyBin` 里 `tab.length < 64` 也会调 `resize()`。
  - JDK7 的 `threshold = capacity * loadFactor` 在 `inflateTable`/`addEntry` 时判定，与 JDK8 的 `++size > threshold` 时机一致，但 JDK7 是"先扩容再插入"还是"先插入再扩容"的差异也会被问。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"一条链迁移到新表，怎么保证不全乱？"** → 用 `(e.hash & oldCap)` 把一条链拆成 lo、hi 两条**尾插**链，lo 留在原位、hi 落到 `oldCap + 原下标`，桶内相对顺序不变。
  2. **"并发扩容为什么会死循环？1.8 为什么不会？"** → 1.7 的 `transfer` 用头插，两个线程可能互相把对方刚迁过去的节点插到自己链表头，形成环，后续 `get` 沿环空转打满 CPU；1.8 改成尾插 + 直接复用 lo/hi 链、不改相对顺序，环构造不出来（但数据覆盖、丢失依旧存在）。
  3. **"`new HashMap<>(13)` 的实际容量是多少？"** → `tableSizeFor` 向上取 2 的幂 → 16，`threshold = 12`；所以想精确控内存，初始容量按 2 的幂给，或者用 `(int)(expect / 0.75f) + 1` 之后再放心一点。
- **改法（可直接替换进稿子的一句话）**：
  > 版本差异这块要补一句关键的：1.7 的 `transfer` 是把每个节点重新 `indexFor` 取模、并且用**头插**，同桶元素顺序会反转；两个线程并发迁移时互相把对方已迁好的节点插到链表头，就插出了环，之后 `get` 沿着环死循环把 CPU 打满。1.8 改成尾插，并且直接按 `(e.hash & oldCap)` 拆成 lo、hi 两条链整体迁过去，不重算 hash、不打乱相对顺序，所以环构造不出来——注意它只是不会成环，数据覆盖和丢失依然存在。

---

### 1-6 HashMap、Hashtable、ConcurrentMap 区别 —— 81 分（良好）

- **得分**：A33 / B20 / C16 / D9 / E3
- **必答点核对**：
  - 三者定位：HashMap 不安全、Hashtable 全表锁已淘汰、ConcurrentMap 高性能并发 ✅（"ConcurrentMap 是接口、实现是 CHM"这一点后文说了 ✅）
  - Hashtable：方法级 `synchronized`、等价整对象锁、读也加锁、并发度 1 ✅
  - CHM JDK7 分段锁 16 / JDK8 CAS+synchronized 锁桶头 / 并发度≈数组长度 ✅
  - CHM 读无锁 + volatile ✅
  - null 语义：三者对比 ✅ + 动机 ✅
  - 迭代器：HashMap/Hashtable fail-fast，CHM 不抛异常 ✅（但有硬伤，见下）
  - 复合操作非原子 → 给出 `putIfAbsent/compute/merge` ✅（比 1-1 完整，好）
  - 适用场景总结 ✅
  - **缺失**：Hashtable 的**初始容量 11、扩容 2n+1、取模而非位运算** ❌（本题最该讲却没讲的对比点）；CHM 的 `size()` 是弱一致估计值 ❌；`ConcurrentMap` 接口定义的四个原子方法（`putIfAbsent/replace/remove(k,v)/` 等）没点名 ❌；Hashtable 的 `Enumeration`/`contains` 遗留 API ❌
- **硬伤**：**2 处**
  1. 原文表述：「**三者都是 Map 接口的实现类**」
     → **正确说法**：`ConcurrentMap` 是**接口**（`extends Map`），不是实现类；三者并列的正确说法是"`HashMap`、`Hashtable` 是 `Map` 的实现类，`ConcurrentMap` 是并发 `Map` 顶层接口，最常用实现是 `ConcurrentHashMap`（另一实现 `ConcurrentSkipListMap`）"。首句即是概念错误，虽然第三段自我澄清了，但面试官第一句话就会抓。
  2. 原文表述：「ConcurrentHashMap 的迭代器是安全失败的，它**遍历的是创建迭代器时的快照**」
     → **正确说法**：CHM 的迭代器是**弱一致（weakly consistent）**的：不维护 `modCount` 校验、不抛 CME，但是**遍历的是当前哈希表结构本身，不做任何快照复制**。"遍历快照"是 `CopyOnWriteArrayList` 的语义——把 COW 的能力安到 CHM 头上是典型的概念混装，追问"那快照是什么时候复制的、内存翻几倍"立刻穿。
- **扣分点（A 7 / B 5 / C 4 / E 2）**：
  1. 上述两处硬伤（A 扣 7，按 rubric 一处硬伤至少扣 8，但第 1 处后文已自我澄清、第 2 处后半句"不能保证遍历到最新数据"方向也对，酌情按 7 计；**但因 2 处硬伤，本题锁定 90 以下**）。
  2. Hashtable 的结构性差异一个字没讲：**容量 11（不是 2 的幂）、扩容 `oldCapacity * 2 + 1`、下标用 `(hash & 0x7FFFFFFF) % length` 取模**。三者对比题里，"为什么 HashMap 能位运算而 Hashtable 只能用取模"是最有区分度的对比维度，漏了等于对比表缺一列（B 扣）。
  3. 「Hashtable……同一时间只能有一个线程执行任何操作」对，但没点出"即使是 `size()`、`contains()` 这种只读方法也加锁"这个最刺眼的细节（你说"读也需要加锁"其实已经覆盖了，这条可以算已答，此处不扣）。
  4. 没提 CHM 的单方法原子 ≠ 复合原子之外的第三个坑：**Hashtable 的 `check-then-act` 也不原子**，很多人以为"方法都 synchronized 就全能"，实际 `if (!map.containsKey(k)) map.put(k,v)` 在 Hashtable 上照样有竞态——正好可以反衬"Hashtable 锁粗但不解决问题"，这一层没讲到（C 扣）。
  5. **E 项**：只有"实际项目中我用 HashMap / CHM / 从不用 Hashtable"，没有任何项目锚点（对比 1-1 的注册表、1-2 的优惠券列表，本题明显掉档）。
- **可加分但没说的**：
  - Hashtable 初始 11 / `2n+1` 扩容 / `0x7FFFFFFF` 后再取模 → 容量非 2 的幂，拿不到位运算红利，且 2n+1 保持奇数降低取模碰撞。
  - `ConcurrentMap` 接口本身定义了 4 个原子默认方法：`putIfAbsent`、`remove(k,v)`、`replace(k,v)`、`replace(k,old,new)`——这才是它作为"接口"存在的价值（JDK5 并发包的设计初衷）。
  - CHM 的 `size()`/`isEmpty()` 是估计值（`sumCount`），`mappingCount()` 才是给 long 用的。
  - `ConcurrentSkipListMap`：有序并发 Map，`ConcurrentMap` 的另一实现，跳表 + CAS，`size()` 精确、支持范围查询。
  - CHM 的 key/value 禁止 null 还有一层：并发下 `get` 返回 null 无法用 `containsKey` 二次确认（两次调用之间状态可能已变）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"`ConcurrentMap` 和 `ConcurrentHashMap` 到底什么关系？"** → `ConcurrentMap` 是 JDK5 引入的**接口**（`extends Map`），规定了 `putIfAbsent/remove(k,v)/replace` 这些原子方法；`ConcurrentHashMap` 是它的主流实现，另一个实现是有序的 `ConcurrentSkipListMap`。
  2. **"Hashtable 初始容量为什么是 11，扩容为什么是 2n+1？"** → 它容量不是 2 的幂，只能用 `(hash & 0x7FFFFFFF) % length` 取模，没法用位运算；`2n+1` 保证结果始终是奇数，取模分布更均匀、碰撞更少。
  3. **"CHM 的迭代器为什么不会 CME？那它能保证看到最新数据吗？"** → 它不做 `modCount` 快照校验，是弱一致迭代器，遍历的是当前表结构，所以不抛异常；但也**不做快照复制**，能否看到迭代开始后的修改不保证——真快照是 `CopyOnWriteArrayList` 的行为。
- **改法（可直接替换进稿子的一句话/一段话）**：
  > 先把概念摆正：`HashMap`、`Hashtable` 是 `Map` 的实现类，`ConcurrentMap` 是 JDK5 加的**并发 Map 接口**，规定了 `putIfAbsent`、`remove(k,v)`、`replace` 这些原子方法，最常用的实现是 `ConcurrentHashMap`，另一个是有序的 `ConcurrentSkipListMap`。再看 Hashtable 为什么慢得不只是锁：它初始容量 11、扩容是 `2n+1`，容量不是 2 的幂，所以下标只能 `(hash & 0x7FFFFFFF) % length` 取模，拿不到 HashMap 位运算的红利。最后 CHM 的迭代器要准确说成**弱一致**：不校验 `modCount`、不抛 CME，但它遍历的是当前表结构，**不做快照复制**——"快照"那是 `CopyOnWriteArrayList` 的语义。

---

## ③ 本章小结

### 分数分布
- **平均分：85.3**
- **最高分：89**（1-1 HashMap vs ConcurrentHashMap、1-3 ArrayList 扩容机制）
- **最低分：81**（1-5 HashMap 扩容机制、1-6 三者区别）
- 全章**没有一题进入 90+（优秀）**，也没有低于 80 的题；问题不是"错得多"，而是"每道题都差最后 1–2 个追问点"。

### 最容易被面试官击穿的 5 个点（按严重度）

1. **CHM 迭代器被说成"遍历快照"（1-6）** —— 把 `CopyOnWriteArrayList` 的语义安到了 `ConcurrentHashMap` 头上。CHM 从不复制数组，只保证弱一致（不抛 CME、不重复）。这是全章最硬的一处概念混装，一问"快照多大内存、什么时候复制的"就穿。
2. **`size` 统计全线缺席（1-1 / 1-6）** —— 两题都没提 JDK8 的 `baseCount + CounterCell`（LongAdder 思路）与"`size()` 是弱一致估计值"。这是 CHM 最经典的高频追问，两题同时空着。
3. **"判断原哈希值的最高位"（1-4 / 1-5 重复出现）** —— 正确是 `(e.hash & oldCap) == 0`，看的是"旧容量那一位"。这句被追问"为什么是最高位、老容量 32 时取哪一位"必然卡住，而且两题都错，不是笔误。
4. **扩容触发点写成"到 12 个就扩"（1-5）** —— 阈值 `threshold=12`，但 `putVal` 是插入后 `++size > threshold`，实际**第 13 个元素**才扩。数字对、时机错，属于"最容易被抓的细节型硬伤"。
5. **Hashtable 只讲锁不讲结构（1-6）** —— 11 初始容量 / `2n+1` 扩容 / 取模而非位运算全缺。三者对比题少了"下标计算"这一列，对比就不成立。
6. （附带，扣 B 不扣 A）**1-5 承诺"版本差异"却零展开**、**1-4 只讲 put 不讲 get** —— 结构承诺不兑现，是面试官最容易打断的位置。

### 最值得保留的 3 个亮点

1. **每题都带"澄清一个常见误区"的固定段落，且选点很准**：LinkedList 增删不一定更快 / ArrayList 不是 2 倍扩容 / CHM 所有操作并非原子 / JDK8 的 HashMap 仍然线程不安全。这是 P8 面试官最买账的结构——主动把面试官的下一刀提前挡掉。
2. **三处真实项目锚点，且说清了"为什么这么选"**：`MerchantAdminChainContext` 责任链注册表（`CommandLineRunner` 单线程启动期注册、运行期只读 → 所以用 HashMap）、批量发券收集 `用户 ID / CartItemVo / OrderItemEntity`、`CouponQueryServiceImpl` 的可用/不可用优惠券列表。E 项的基本盘是稳的，只需把"为什么不用 CHM"的理由说成"启动期单线程写 + 之后只读"，而不是"mark 不是自增整数"。
3. **几个真正源码级的正确表述，可直接背诵**：`oldCapacity + (oldCapacity >> 1)` 的 1.5 倍公式与 `MAX_ARRAY_SIZE = Integer.MAX_VALUE - 8`；`h ^ (h >>> 16)` 的扰动 + `& (n-1)` 等价取模；"中间增删 ArrayList 靠 `System.arraycopy` 批量拷贝反而快"；COW 的"内存复制 + 弱一致"两条缺点。这几句是全章含金量最高的部分。

### 一句话改稿方向
**结构不用动（已经很好），只补四张"追问底牌"**：CHM 的 `sizeCtl/ForwardingNode/baseCount`、`e.hash & oldCap` 的准确说法、Hashtable 的 11/2n+1/取模、CHM 弱一致 ≠ 快照。补完这四点，1-1、1-3 可上 92–94，1-5、1-6 可上 88–90。
