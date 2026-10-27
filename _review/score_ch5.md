# 第5章 Java基础语法 —— 评审报告

> 评审口径：统一 Rubric v1。评分人视角 = 一线大厂 P8 面试官（Java 语言基础 / IO / 反射方向）。
> 纪律：不因篇幅长加分；PDF 抽取错字（"分叶对象"→分页对象等）与多余换行不计；事实错误按硬伤处理并给出「原文表述 → 正确说法」。
> 总评一句话：**结构规范、没有"说反"的核心概念，绝大部分是"结论正确但只到结论"，深度（C）与版本精度是本章集体短板；IO 题有一处版本硬伤。**

---

## 一、评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 5-1 | String、StringBuilder、StringBuffer 的区别 | 38 | 21 | 15 | 9 | 3 | 86 | 良好 |
| 5-2 | String 的 intern() 方法有什么作用 | 35 | 19 | 13 | 8 | 2 | 77 | 及格 |
| 5-3 | Java 的异常体系 | 38 | 17 | 13 | 9 | 4 | 81 | 良好 |
| 5-4 | 泛型是什么、泛型擦除是什么 | 37 | 17 | 13 | 9 | 3 | 79 | 及格 |
| 5-5 | 反射是什么、有哪些应用场景 | 37 | 16 | 13 | 9 | 4 | 79 | 及格 |
| 5-6 | BIO、NIO、AIO 的区别 | 31 | 15 | 12 | 8 | 4 | 70 | 及格 |

**本章平均分 78.7｜最高 86（5-1）｜最低 70（5-6）｜无 90+ 题，无 96+ 满分题。**

---

## 二、逐题点评

### 5-1 String、StringBuilder、StringBuffer 的区别 —— 86 分（良好）

- **得分**：A38 / B21 / C15 / D9 / E3
- **必答点核对**：
  - 三者的可变性差异 ✅（不可变 vs 可变、底层数组）
  - String 不可变的支撑条件 ⚠️（只说了"final char 数组"；漏掉"类本身 final""不提供任何修改方法""hash 字段可缓存"这三件套，也没说 `private final` 的意义是"引用不可变、数组内容仍可被类内部改"）
  - JDK9+ byte[] 压缩字符串 ⚠️（提到 byte 数组，但没提 `coder` 标识 LATIN1/UTF16、没提 JEP 254 省内存的动机，属于"点到但不透"）
  - 设计不可变的三个动机（安全 / 线程安全 / hash 缓存）✅ 表述标准
  - StringBuilder 非同步 vs StringBuffer `synchronized` ✅
  - 编译期常量折叠 + 运行期拼接优化 ⚠️（见扣分点，未区分 JDK9 invokedynamic）
  - 循环内拼接必须显式 StringBuilder ✅（这是本题最好的一句）
  - 默认容量 16、扩容 `old*2+2` ✅ 完全正确（注意这是父类 `AbstractStringBuilder.ensureCapacityInternal` 的逻辑）
  - 二者共同父类 `AbstractStringBuilder`、`value` 非 final + `count` 计数 ⚠️（未提，导致"扩容机制"说得像各自实现）
  - 适用场景与取舍 ✅
- **硬伤**：无。
- **扣分点**：
  1. **"变量拼接会优化成 StringBuilder.append" 是 JDK8 及以前的实现**。JDK9+ 走 `invokedynamic` + `StringConcatFactory.makeConcatWithConstants`，运行期由 bootstrap 方法生成拼接逻辑（内部仍是 sb/byte[]，但字节码里已看不到 `new StringBuilder`）。按纪律不算硬伤，但属时代性不精确，C 扣 3 分。面试官只要问一句"javac 编译出来是什么字节码"，这里就露馅。
  2. 未点明 **StringBuilder / StringBuffer 的 `value` 不是 final、`count` 才是长度真相**，所以"扩容"能改的是数组内容，不是引用——这正是"可变 vs 不可变"的字节码级证据，缺了它 C 项上不去。
  3. 开头承诺"从核心本质、可变性、线程安全和适用场景**四个方面**"，实际讲的是"可变性 / 线程安全 / 拼接性能 / 扩容机制"，承诺与目录不符，D 扣 1。
  4. "是单线程环境下的**唯一**推荐"措辞绝对化（实际单线程也能用 StringBuffer，只是慢）。
  5. E 项只有一句"实际项目中这种场景很少"，没有真实锚点（例如日志拼接、SQL 拼装、导出 Excel 表头拼接时用 `StringBuilder(预估容量)` 的踩坑）。
- **可加分但没说的**：
  - JDK9+ 的 compact strings 同样作用于 `AbstractStringBuilder`（StringBuilder 也变 `byte[] + coder`）。
  - `StringBuilder` 初始容量预估（`new StringBuilder(n)`）可避免多次 `Arrays.copyOf`，是"循环拼接"场景的配套优化。
  - `+` 拼接 null 时的语义：`"a" + null` → `"anull"`（`String.valueOf` / `append` 做了特殊处理），这是线上脏数据常见来源。
  - 字符串常量池从永久代搬到堆（JDK7）——本题不提也行，但会与 5-2 形成呼应。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **String 到底为什么不可变？从源码三个层次说。**
     → "类 `final` 不可被继承改写；字段 `private final byte[] value`（JDK9 前 `char[]`）是 `private`，不提供任何 setter/append；所有"改内容"的方法（`substring`/`concat`/`replace`）都返回新对象——三者缺一不可。"
  2. **JDK9 为什么把 `char[]` 换成 `byte[]` + `coder`？**
     → "JEP 254 压缩字符串：Latin-1 字符只占 1 字节，`coder` 标记 LATIN1/UTF16，整体堆占用降 40% 左右，代价是 `charAt` 等访问多一次分支判断。"
  3. **循环里用 StringBuilder 还可能有什么坑？**
     → "没预估容量会反复 `old*2+2` 扩容 + 数组复制；另外在循环里 `new StringBuilder` 放错位置（放到循环内）等于白用，要放到循环外并 `setLength(0)` 复用。"
- **改法（可直接替换进稿子）**：
  > 关于拼接性能补一句："`+` 拼接的编译产物分两个时代：JDK8 及以前，javac 把变量拼接展开成 `new StringBuilder().append(...).toString()`；JDK9 起改为 `invokedynamic` 调用 `StringConcatFactory`，拼接逻辑由运行期生成，字节码更紧凑、也不再限制参数个数。所以'会优化成 StringBuilder'是 8 时代的说法，JDK9+ 应说'走 StringConcatFactory'。但**循环里的 `+` 两个时代都救不了**：每次迭代都要新建拼接载体，复杂度 O(n²)，必须显式 `new StringBuilder(预估容量)` 放循环外。"

---

### 5-2 String 的 intern() 方法有什么作用 —— 77 分（及格）

- **得分**：A35 / B19 / C13 / D8 / E2
- **必答点核对**：
  - intern 语义（"返回常量池中该字符串的引用"）✅
  - JDK7 常量池从永久代移到堆 ✅（版本正确）
  - 池中已存在 → 直接返回池中引用 ✅
  - 池中不存在 → JDK7+ 放入"当前对象的引用"、不复制 ✅（这一句很关键，答对了）
  - **JDK6 是"复制字符串到永久代常量池"** ❌ 完全没讲。只说"JDK7 之前常量池在永久代"，没有落到"因此 JDK6 的 intern 是拷贝、JDK7+ 是登记引用"这个因果，JDK6/7 对比就废了。
  - `new String("abc")` 的对象个数及**成立条件** ❌/⚠️（原文无条件说 2 个，见硬伤）
  - `+` 拼接的对象计数 ⚠️（漏了中间 `StringBuilder`，且没交代"字面量是否新建取决于池中是否已有"）
  - `==` / `equals` 配合 intern 的判定示例 ❌（一道都没给，这是该题最高频的考法）
  - 去重收益 + 生产风险 ✅（提到 StringDeduplication、常量池过大有性能问题，方向对）
  - StringTable 结构与调优（`-XX:StringTableSize`、桶冲突、常量池可被 GC 回收）❌
  - 常量池为什么搬家的原因（永久代易 OOM、池中字符串要能被回收）❌
- **硬伤 / 不严谨表述（原文表述 → 正确说法）**：
  1. "面试官常考的是 `new String("abc")` 创建几个对象——**答案是 2 个**"
     → **不严谨，条件缺失**：2 个成立的前提是"此时常量池里还没有 `abc`"（本次运行首次出现）。若池中已有（同类/父类早已出现过 `"abc"` 字面量，或已被别人 `intern` 过），则**本次只 new 出 1 个堆对象**，字面量不再新建。正确说法："1 个或 2 个，取决于常量池是否已存在 `abc`；面试标准答法是'通常说 2 个：常量池 1 个 + 堆 1 个，但前提是池中没有'。"按纪律这属表述不严谨，A 扣少量、C 一并扣。
  2. "`s1 = new String("a") + new String("b")` …… s1 本身 1 个 + `"a"`/`"b"` 各 1 个常量池对象 + 2 个 new 出来的 String = 5 个对象"
     → **计数口径错/漏项**：`+` 在 JDK8 由 javac 展开为 `new StringBuilder().append(...).toString()`，中间那个 **StringBuilder 对象（及其内部数组）是实打实的第 6 个对象**；JDK9+ 走 indy 也只是把拼接载体藏进 `StringConcatFactory` 生成的逻辑里，运行期仍会创建。正确说法："按'JVM 实际 new 出来的对象'计是 6 个（a、b 两个字面量对象 + 2 个 new String + 1 个 StringBuilder + 1 个结果 String，且 a/b 是否新建同样取决于池中是否已有）；不含 StringBuilder 内部 `char[]`/`byte[]`。"
  3. "**JDK8 之后**字符串常量池也受堆大小限制"
     → **版本不精确**：常量池 JDK7 就已搬到堆，受堆限制是**从 JDK7 开始**；JDK8 相关的是 G1 的 `StringDeduplication`（JDK8u20+）与 `-XX:StringTableSize` 的默认值变化（JDK7 仅 1009，JDK8 涨到 60013 量级）。
- **扣分点**：
  1. 三个"经典题"全在讲，但**没有一道给出可判定的结论 + 前提条件**：缺 `new String("abc") == "abc"` → false；`s.intern() == "abc"` → true；`new StringBuilder("ja").append("va").toString().intern() == s` → JDK6 false / JDK7+ true（这是区分 JDK6/7 intern 差异的"标答级"例子）。
  2. 深度不足：没讲 **StringTable 是 native 的哈希表、常量池里存的是堆对象引用、池中字符串可被 Young GC 回收**，因此"intern 会内存泄漏"的说法在 JDK7+ 已经不成立（JDK6 才成立）——这正是面试官想听的辨析点。
  3. "滥用 intern 反而可能因为常量池过大导致性能问题"方向对，但没给机制（StringTable 桶冲突 → 查找退化为链表）与参数（`-XX:StringTableSize`），沦为口号。
  4. D 扣 2：对象计数那段像现场数数，**真实面试会被打断**；且"答案是 2 个"这种绝对句一旦被追问"如果池里已经有呢"就崩。
  5. E 扣 3：只有 `StringDeduplication` 一句理论联想，无项目锚点（例如"日志/字典类字段大量重复字符串时用 Guava/`intern` 做过内存对比"）。
- **可加分但没说的**：
  - `intern()` 的返回值就是池中引用，**JDK7+ 可能与调用者自身同一对象**（所以 `s == s.intern()` 在 JDK7+ 常为 true）。
  - 常量池搬家的原因：永久代空间小且回收条件苛刻，`-XX:MaxPermSize` 时代大量 intern 直接 `OutOfMemoryError: PermGen space`。
  - `StringDeduplication`（G1）与 `intern` 的区别：前者是 GC 期对 `value` 数组做去重、不改对象身份，后者改的是引用指向，二者成本模型完全不同。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **`new String("abc")` 和 `"abc"` 相等吗？怎么把它变成同一个对象？**
     → "`==` 为 false（一个堆对象、一个池对象），`equals` 为 true；调用 `intern()` 后 `s.intern() == "abc"` 为 true，但 `s` 本身不变。"
  2. **JDK6 和 JDK7 的 `intern()` 到底差在哪？给个能跑出不同结果的例子。**
     → "JDK6 把字符串**复制**进永久代常量池，返回池中副本，所以 `new StringBuilder("ja").append("va").toString().intern() == 那个对象` 为 false；JDK7+ 常量池在堆、只**登记引用**，同一个例子返回 true。"
  3. **大量 intern 会不会 OOM？怎么调？**
     → "JDK7+ 池在堆里、字符串可被 GC 回收，不会像 JDK6 那样直接撑爆永久代；但 StringTable 是定长哈希表，桶冲突会让 intern 变慢，可用 `-XX:StringTableSize`（JDK8 默认约 6 万桶）调大，或改用 G1 的 StringDeduplication。"
- **改法（可直接替换进稿子）**：
  > "intern 的行为要分版本说：JDK6 常量池在永久代，池中没有就把字符串**复制一份**进去，返回副本——所以副本和原对象 `==` 为 false；JDK7 起常量池搬到堆里，池中没有就只把**堆中这个对象的引用登记进去**，不复制，因此 `==` 通常为 true，这也是'JDK7 之后 intern 更省内存'的原因。对象个数题要带前提：`new String("abc")` **在池中还没有 `abc` 时**创建 2 个对象（池 1 + 堆 1），若池中已有则只创建 1 个堆对象。"

---

### 5-3 Java 的异常体系 —— 81 分（良好）

- **得分**：A38 / B17 / C13 / D9 / E4
- **必答点核对**：
  - `Throwable → Error / Exception → RuntimeException` 主干 ✅
  - Error 举例（OOM / StackOverflowError / NoClassDefFoundError）✅
  - 受检异常必须显式处理、编译器强制 ✅
  - 非受检四类举例（NPE / IAE / CCE / IOOBE）✅
  - `finally` 执行时机（除 `System.exit`）✅
  - try-with-resources + `AutoCloseable` ✅
  - catch 顺序（子类在前，否则编译报错）✅
  - `throws` vs `throw` ✅
  - **`finally` 覆盖返回值 / `finally` 里 return 吞异常** ❌ 完全未提，这是该题第一追问
  - **try-with-resources 的核心动机：suppressed 异常**（主异常保留，close 异常进 `getSuppressed()`）❌ 只讲了"更简洁"，讲错了重点
  - 异常链 `cause`/`initCause`/构造器保留 cause ⚠️（本章只在 5-5 出现 `InvocationTargetException.getCause`，本题未提）
  - 异常的性能来源（`fillInStackTrace` 抓栈、对象分配）⚠️（只提"循环里捕获有性能损耗"，没说为什么）
  - 自定义异常 + `@RestControllerAdvice` 全局处理 ✅（有实战味道）
  - Error "不应该捕获" ⚠️ 绝对化（`NoClassDefFoundError` 在 SPI/热部署场景常被框架 catch 后转译）
  - 缺失：异常表 / 字节码层面（`athrow`、异常表区间）、`try-with-resources` 的字节码形态、受检异常在 lambda 中的处理、`StackOverflowError` 能否恢复
- **硬伤**：无技术性错误。
- **扣分点**：
  1. B 扣 8：**`finally` 覆盖返回值**与**suppressed 异常**两处缺失，恰好是异常题的两大高频硬考点。面试官问"`try{return 1;} finally{return 2;}` 返回几"，本题答不上来。
  2. B 再扣：只讲"try-with-resources 更简洁"，没说它解决的是"**close 抛异常会吞掉主异常**"这个正确性问题——这才是它替代 finally 的真正理由，说成"简洁"是把设计动机降级为语法糖。
  3. C 扣 7：全程停在"分类 + 最佳实践"层，没有一处下探到字节码/运行时（`fillInStackTrace` 成本、异常表在 `Code` 属性里、为什么 catch 不影响未异常路径性能）。
  4. D 扣 1：开头说"从四个方面回答"，正文实际是"结构 / 关键点 / 原则"三块，且"关键点"四条平铺，缺一个"受检 vs 非受检"的对比小表（编译期检查、调用方负担、典型场景、是否适合业务异常）。
  5. A 扣 2：见"Error 不应该捕获"的绝对化措辞 + "finally 一定会执行"的边界只举了 `System.exit`（还有 `Runtime.halt`、JVM crash、守护线程被杀）。
- **可加分但没说的**：
  - 受检异常的工程争议：业务异常继承 `RuntimeException`（不污染签名、配 `rollbackFor`），而 `IOException` 类必须处理——这个取舍说出来就是加分项。
  - `try-catch` 放在循环外 vs 循环内的取舍（不是"绝对不要在循环里 catch"，而是"按批失败还是单条失败"）。
  - `Exception` 与 `Throwable` 在 `catch` 中的选择：`catch (Throwable)` 会连 `ThreadDeath`/`OOM` 一起吞，框架层才这么干。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **`try { return 1; } finally { return 2; }` 返回什么？为什么？**
     → "返回 2。`finally` 的 `ireturn` 在字节码里后执行、覆盖了 try 分支已压栈的返回值；更糟的是 `finally` 里 return 会**吞掉异常**，所以代码规范禁止在 finally 中 return。"
  2. **try-with-resources 相比 finally 到底好在哪？close 抛异常怎么处理？**
     → "关键不是简洁而是正确性：若 try 块和 close 都抛异常，finally 写法会丢掉主异常；try-with-resources 保留主异常、把 close 的异常挂到 `getSuppressed()` 里，且按**声明逆序**关闭。"
  3. **什么时候 `finally` 不执行？异常的开销主要在哪？**
     → "`System.exit`/`Runtime.halt`、JVM 崩溃或被杀、执行 finally 的线程是守护线程且 JVM 退出、死循环卡在 try 内。开销主要在构造异常时的 `fillInStackTrace`（抓栈 + 分配对象），所以别用异常做流程控制、别在高频路径建异常。"

---

### 5-4 泛型是什么、泛型擦除是什么 —— 79 分（及格）

- **得分**：A37 / B17 / C13 / D9 / E3
- **必答点核对**：
  - 泛型目的（编译期类型安全、消除强转）✅
  - 伪泛型 / JDK5 引入 / 擦除实现 ✅
  - 擦除到边界（无界 → `Object`）✅ + 必要处插入 `checkcast` ✅
  - `List<String>` 与 `List<Integer>` 运行期 `getClass()` 相同 ✅
  - 基本类型不能做类型参数 ✅
  - 静态上下文不能用类泛型参数 ✅（表述准确："类泛型参数"，泛型方法自己的 `<T>` 是允许的）
  - 不能 `new T()` ✅
  - 不能 `new T[]`（数组运行期检查元素类型）✅ 理由给对了
  - 通配符 `<? extends T>` / `<? super T>` + PECS ✅（口诀标准）
  - **桥方法（bridge method）** ❌ 完全没提，这是"擦除"题的灵魂追问
  - **堆污染 + `@SafeVarargs`** ❌
  - **`instanceof List<String>` 非法 / 不能 `catch` 泛型异常 / 不能仅靠泛型参数重载** ❌
  - **`List<Object>` 不是 `List<String>` 的父类型**（泛型不协变）❌
  - 擦除动机（向后兼容、迁移兼容）❌ 只说了"伪泛型"，没给"为什么必须这样"
  - `Signature` 属性 / 反射取泛型（本章在 5-5 提了 `Type`，本题未呼应）⚠️
  - 项目用法（`Result<T>`、`PageResult<T>`）✅
- **硬伤**：无（无把机制说反的地方）。
- **扣分点**：
  1. A 扣 3：`<? extends T>`"**只读不写**"、`<? super T>`"**只写不读**"是口语化近似，严格说不成立——`List<? extends T>` 可以 `add(null)`、可以 `clear()`/`remove()`；`List<? super T>` 的 `get()` 返回 `Object` 是**能读的，只是读了没用**。说法似是非，属"会被追问"的表述，按纪律计 C/A 少量扣分。
  2. B 扣 8：桥方法、堆污染、`instanceof` 三处缺口，正好覆盖"擦除"深挖的三个方向（多态、类型安全、运行期判型），面试官任选一个都能问穿。
  3. C 扣 7：擦除只停在"编译期替换 + 插 cast"层面，没有：`Signature` 属性（擦除后泛型信息仍在 class 文件的 `Signature`/`LocalVariableTypeTable` 里，故反射能拿到 `Type`）、桥方法的生成时机、为什么数组是协变而泛型不是（`String[]` 是 `Object[]`，`List<String>` 不是 `List<Object>`），也没给"为什么 Java 不做具化泛型"（兼容已有字节码/生态）。
  4. D 扣 1：五个要点编号清晰、可背诵，但"第一…第二…第三…第四…第五"后面直接跳到"最后是实际应用"，中间缺一句"以上四点是擦除的直接后果"的收口，逻辑闭环差一点。
  5. E 扣 2：`Result<T>`/`PageResult<T>` 只是"用了"，没有取舍或踩坑（例如 `PageResult<T>` 反序列化时 `TypeReference` 必须带泛型，否则拿到 `LinkedHashMap`——这才是真实痛点）。
- **可加分但没说的**：
  - 擦除还导致：泛型类不能有 `static` 泛型字段、`new T[n]` 只能 `(T[]) new Object[n]`（unchecked 警告）、`Arrays.asList` 的 `@SafeVarargs`。
  - 泛型方法可以有自己的类型参数：`static <T> T pick(T a, T b)` 合法——用来纠正"静态上下文不能用泛型"的误解。
  - 绕过擦除的第二种写法：`List.class.cast` 无效，但通过 `Method.invoke` 传 `Object` 可行（原文只说了反射 `add(Object)`，对）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **什么是桥方法？为什么要生成它？**
     → "子类继承/实现泛型父类并重写方法时（如 `class StringNode extends Node<String>` 重写 `T get()`），擦除后父类方法签名是 `Object get()`、子类是 `String get()`，为了让多态仍成立，编译器生成一个 `Object get(){ return this.get(); }` 的 bridge 方法（带 `ACC_BRIDGE|ACC_SYNTHETIC`），强转后转发。"
  2. **为什么 `new T[]` 和 `instanceof List<String>` 都不行？**
     → "数组是协变的且运行期真检查元素类型，擦除后 `new T[]` 无法确定组件类型（只能 `(T[]) new Object[n]` 并接受 unchecked）；`instanceof` 要求 reifiable 类型，`List<String>` 擦除后只剩 `List`，故只能用 `instanceof List<?>`。"
  3. **什么是堆污染？`@SafeVarargs` 解决什么？**
     → "泛型可变参数 `T... args` 实际是 `Object[]`，若把 `List<String>[]` 这样"以为安全"的数组塞进去，运行期就可能取到错误类型元素——即堆污染（编译器给 unchecked 警告）。`@SafeVarargs` 是承诺"我只读、不写、不逃逸该数组"来消除警告，必要时还要做防御性复制。"

---

### 5-5 反射是什么、有哪些应用场景 —— 79 分（及格）

- **得分**：A37 / B16 / C13 / D9 / E4
- **必答点核对**：
  - 反射定义（运行期获取类结构 + 动态操作）✅
  - `Class` / `Method` / `Field` ✅，**`Constructor` 缺席** ❌（"核心类有三个"这个说法本身就把实例化入口漏掉了，而 DI 的一半工作就在构造器上）
  - 三种获取 Class ✅
  - `forName` 与 `loadClass` 的区别（是否触发初始化/static 块）❌；且"forName 最常用"不严谨（业务里最常见的是 `Xxx.class` 和 `getClass()`，`forName` 主要是框架按字符串加载）
  - 应用场景 5 个（Spring IOC / JDBC 驱动 / JDK 动态代理 / 注解处理 / 序列化框架）✅
  - 性能开销来源（方法查找、安全检查、装箱拆箱）✅ 但不够
  - 性能缓解：缓存 `Method` ✅；`MethodHandle` ⚠️ 只提了名字，"膨胀阈值"一笔带过；**`LambdaMetafactory`/`ReflectionFactory` 未提** ❌
  - `setAccessible(true)` + 破坏封装 + 安全风险 ✅
  - **JDK9 模块化下的非法反射访问**（`module-info` 未 `opens` → `InaccessibleObjectException`，需 `--add-opens`）❌ 完全缺失，这是"现在还用不用 setAccessible"的必答配套
  - `InvocationTargetException.getCause()` ✅
  - 泛型要用 `Type` 而非 `Class` ✅（本章少见的深度点，加分）
  - `Class.newInstance()` vs `getDeclaredConstructor().newInstance()` ❌（前者 JDK9 废弃、只支持无参、把构造器异常原样抛出）
  - 反射破单例 / 枚举免疫 / `final` 字段改写 ❌
- **硬伤**：无（无事实倒置）。
- **扣分点**：
  1. A 扣 3 + D 扣 1："核心类有三个"是**不完整定义**而非错误，但会被面试官立刻纠正（"Constructor 呢？"）；"forName 最常用"属口径问题，在实际写代码的场景里站不住。
  2. B 扣 9：模块化访问限制、`Constructor`/实例化链路、`LambdaMetafactory` 三个必答点缺失，导致"性能"和"注意事项"两段都停在"缓存一下、别多用"的层面。
  3. C 扣 7：性能只归因到"方法查找、安全检查、装箱"，缺最关键的**JIT 无法内联/去虚化**（反射调用点对编译器不透明，热点代码不能被内联优化，这才是数量级差距的来源），也缺 JDK 内部从 native 访问器（`inflationThreshold` 默认 15 次后生成字节码访问器）到 `MethodHandle` 的演进脉络。
  4. D 扣：五点结构清楚、可背；但 `MethodHandle`/膨胀阈值那句是"名词堆叠"，真实面试会被打断问"膨胀阈值是多少、为什么"。
  5. E 扣 1：`@Autowired` 字段注入 vs 构造器注入"底层都是反射"这个锚点真实且好用，但只此一句，没有踩坑（如反射 + 泛型擦除导致 `@Autowired List<T>` 注入歧义）。
- **可加分但没说的**：
  - `Class.forName(name, false, loader)` 的 `initialize` 参数——JDBC 驱动加载"为什么用 forName"的标准解释。
  - 反射在 Spring 里的具体落点：`BeanWrapper`/`CachedIntrospectionResults` 缓存 `PropertyDescriptor`，这正是"缓存 Method"的工业级版本。
  - `setAccessible` 在 JDK17 强封装下的现状：`--add-opens java.base/java.lang=ALL-UNNAMED` 才能改 `String.value`，且 JDK17 起 `final` 字段反射写行为收紧。
  - 安全侧：反序列化 gadget 链、`Runtime.exec` 反射调用、`SecurityManager` 已废弃（JDK17 移除），防护靠白名单/`ObjectInputFilter`。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **反射为什么慢？慢多少？怎么优化到接近直接调用？**
     → "三层原因：`getMethod` 等方法查找是字符串遍历+复制数组；每次 `invoke` 要包装成 `Object[]`、基本类型装箱、做访问权限检查；最要命的是调用点对 JIT 不透明、无法内联。优化：缓存 `Method` 并 `setAccessible(true)` 跳过检查，再进一步用 `MethodHandle`（`invokeExact` 可内联）或 `LambdaMetafactory` 生成函数式接口调用，能逼近直接调用。"
  2. **JDK9 之后 `setAccessible(true)` 还能随便用吗？**
     → "不能。强封装下对未 `opens` 的包内非 public 成员会抛 `InaccessibleObjectException`，要么模块 `opens` 该包，要么启动加 `--add-opens`；`java.base` 的核心类（`String`、`Integer`）默认不开放。"
  3. **`Class.forName` 和 `ClassLoader.loadClass` 差在哪？为什么 JDBC 用前者？**
     → "`forName` 默认 `initialize=true`，会触发类初始化、执行 static 块（驱动把自己注册进 `DriverManager` 就靠这个）；`loadClass` 只加载不初始化，初始化延迟到首次主动使用。"
- **改法（可直接替换进稿子）**：
  > "核心类其实是四个：`Class`、`Method`、`Field`、`Constructor`，实例化走 `getDeclaredConstructor(...).newInstance(...)`（`Class.newInstance()` 在 JDK9 已废弃）。另外提醒一个现在的坑：JDK9 之后 `setAccessible(true)` 受模块系统约束，动 `java.base` 的私有成员会抛 `InaccessibleObjectException`，需要 `--add-opens` 或模块 `opens`。"

---

### 5-6 BIO、NIO、AIO 的区别 —— 70 分（及格）

- **得分**：A31 / B15 / C12 / D8 / E4
- **必答点核对**：
  - BIO 阻塞、一连接一线程 ✅
  - NIO 非阻塞 + `Selector` 多路复用 ✅
  - AIO 异步 + 回调 ✅
  - `Channel` / `Buffer` / `Selector` 三件套 ✅
  - `flip()` 切换读写 ✅（缺 `position/limit/capacity` 三指针与 `clear` vs `compact`）
  - 事件位 `OP_ACCEPT/READ/WRITE` ✅
  - Netty 基于 NIO ✅；Redis 单线程 + epoll ✅（跨组件联想，加分）
  - BIO vs NIO 的根本差异（线程阻塞等待 vs 事件就绪处理）✅ 说清了直觉
  - **同步/异步与阻塞/非阻塞是两个维度**（NIO 是"同步非阻塞"）❌ 缺失，面试第一追问
  - **epoll vs select/poll**（fd 上限、红黑树、就绪链表、LT/ET）❌ 缺失，只说了"轮询"
  - **零拷贝（mmap / sendfile / `transferTo`）** ❌ 缺失（本章该题最明显的丢分点）
  - **Netty 为什么不用 AIO** ❌ 缺失
  - AIO 在 Linux 的实现现状 ⚠️（只说"支持不完善"，没给"Linux 上 JDK 的异步 socket 实为 epoll 模拟、native AIO 只用于文件"）
  - Tomcat 默认 IO 模型 ❌ **硬伤**（见下）
  - 项目锚点（缓冲流、大文件流式）✅ 但落到"传统 IO 流"，与 NIO 关系弱
  - 缺失：粘包/半包、Reactor 模型（单/多/主从）、`DirectByteBuffer` 与堆外内存
- **硬伤（原文表述 → 正确说法）**：
  1. "Spring MVC **传统的 Tomcat 是 BIO 模型**，**Tomcat 8.5+ 支持 NIO 模式**"
     → **版本/默认模型双错**：Tomcat **6.0 起就内置 NIO Connector**（`Http11NioProtocol`），**8.0 起默认即为 NIO**；8.5 新增的是 **NIO2**（`Http11Nio2Protocol`）并把 BIO Connector 标记废弃，**9.0 已移除 BIO**。说"Tomcat 是 BIO、8.5+ 才有 NIO"等于把十五年前的默认当现状，面试官一句"Tomcat 7 默认跑的是什么 Connector"就直接击穿。Spring Boot 内嵌 Tomcat 更是全程 NIO。
     *正确说法*："Tomcat 早在 6.x 就提供 NIO Connector，8.0 起默认 NIO，8.5 增加 NIO2、BIO 被弃用，9.0 移除；所以'Tomcat 是 BIO 模型'这个说法只在 Tomcat 6 及更早成立。"
  2. 次一级不严谨："NIO 是'一个线程**轮询**所有连接的事件'"——`Selector.select()` 在 Linux 上底层是 `epoll_wait`，是**内核事件通知**，不是用户态轮询；"轮询"这个词描述的是 select/poll 时代，用在这里会让追问"那 epoll 和 select 有什么区别"接不上。（不算硬伤，计 C/D。）
- **扣分点**：
  1. A 扣 9：Tomcat 硬伤一处（按纪律 A 至少 8 分起扣）。
  2. B 扣 10：零拷贝、epoll vs select、同步/异步维度、Netty 不用 AIO——四个高频必答点全缺，且这四个正好是"BIO/NIO/AIO 区别"这道题从 80 分走向 95 分的位置。
  3. C 扣 8：全是"模型级"描述，没有一次下探到系统调用/内核结构（`epoll_create1/epoll_ctl/epoll_wait`、`copy_from_user`、Reactor 事件循环）。"只有数据就绪才去处理"讲对了直觉，但没有"数据仍在**内核缓冲区**，`read` 仍要把数据拷到用户态，所以 NIO 依然占线程"这一层辨析——这恰是"为什么 Netty 还要线程池"的由来。
  4. D 扣 2："AIO……一般不提"这类口语随意；且该题缺对比表格（阻塞行为 / 线程模型 / 内核机制 / 适用场景 / 典型实现 / 编程复杂度 六个维度），原文以"AIO 实际应用很少"带过，属于 rubric 第 5 条"对比维度缺失"。
  5. E 扣 1：文件上传/批量导出用缓冲流是真锚点，但属于 BIO 侧优化，与本题的 NIO/AIO 主线是两张皮，没能形成"我用 Netty 改写某接口、QPS/线程数怎么变"的闭环。
- **可加分但没说的**：
  - NIO 的"同步"体现在：就绪事件由 `select` 返回后，**数据拷贝仍由用户线程阻塞完成**；AIO 是内核拷完再通知，所以 AIO 才是真异步 —— 一句话就能把两组概念钉死。
  - 零拷贝三兄弟：`mmap`（少一次用户态拷贝，仍有内核页表映射）、`sendfile`（数据全程不进用户态，`FileChannel.transferTo` 底层就是它）、`splice`（Linux 管道零拷贝）；Kafka/RocketMQ/Netty 的 `FileRegion` 都用它。
  - Netty 不用 AIO 的理由：Linux 上 JDK AIO 用 epoll 模拟，无性能收益还有额外线程/回调开销；`AsynchronousChannelGroup` 线程模型不可控；AIO 生态与调试工具链远不如 NIO。
  - Redis 6.0 起是"命令执行单线程 + IO 多线程"，说"单线程模型"要加这个补丁。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **NIO 是同步还是异步？同步/异步和阻塞/非阻塞的区别是什么？**
     → "NIO 是**同步非阻塞**：`select` 告诉你'数据就绪'，但 `read` 把数据从内核缓冲区拷到用户态这一步仍由当前线程阻塞完成；只有 AIO 是异步——内核把数据拷完再回调，调用方全程不阻塞。阻塞/非阻塞说的是'调用是否立即返回'，同步/异步说的是'数据拷贝由谁完成、结果怎么交付'，两个维度正交。"
  2. **epoll 比 select/poll 强在哪？**
     → "select 有 1024 fd 上限、每次调用都要把整个 fd 集合从用户态拷进内核、返回后还要 O(n) 遍历找就绪；poll 去掉了数量上限但仍要全量拷贝+遍历；epoll 用红黑树在内核维护关注集合（`epoll_ctl` 一次注册，O(logn)）、就绪 fd 放进就绪链表，`epoll_wait` 只返回就绪项、复杂度 O(就绪数)，还支持 LT/ET 两种触发模式。"
  3. **什么是零拷贝？你在什么场景会用到？**
     → "目的是去掉'内核缓冲区 → 用户缓冲区 → 内核 socket 缓冲区'这两次无谓拷贝：`sendfile` 让数据在内核内直接流向网卡（Java 的 `FileChannel.transferTo`），`mmap` 把文件映射进用户地址空间减少一次拷贝。典型是文件下载/消息队列刷盘（Kafka）、大文件网关转发。"

---

## 三、本章小结

- **平均分 78.7**（6 题），最高 86（5-1），最低 70（5-6）。整体处于"良好偏下 / 及格上限"区间：**没有一道能进 90+，也没有不及格题**；共同特征是"结构像模像样、结论基本正确、但深度只到结论为止"，一旦追问"源码/字节码/系统调用"就下不去。

- **最容易被面试官击穿的 5 个点（按严重度排序）**：
  1. **5-6 Tomcat 的 IO 模型（硬伤）**："Tomcat 是 BIO、8.5+ 才支持 NIO"——8.0 起默认就是 NIO，这是最容易被一句话判"基础不牢"的错误，且它出现在"实际应用"这一段的收尾，杀伤力更大。
  2. **5-2 `new String("abc")` 无条件 2 个对象 + `+` 拼接计数漏中间 `StringBuilder`**：这两个经典题恰恰是面试官最爱设"前提陷阱"的地方，答成绝对结论等于自曝没想清楚。
  3. **5-3 缺 `finally` 覆盖返回值 / try-with-resources 的 suppressed 异常**：这是异常题的标准第一追问，且它暴露的是"知道 API 不知道语义"。
  4. **5-4 缺桥方法与堆污染**：讲擦除不讲 bridge method，等于讲 HashMap 不讲红黑树——广度够了，深度断层。
  5. **5-5 缺 JDK9 模块化下的 `setAccessible` 限制 + 反射性能真正归因（JIT 无法内联）**：在现代 JDK 上直接就是"纸上反射"。
  6. （并列）**5-1 的 `+` 拼接仍停留在 JDK8 叙事**：JDK9 起是 `invokedynamic + StringConcatFactory`，这是"版本敏感度"的体检项。

- **最值得保留的 3 个亮点**：
  1. **每题都有清晰的口头脚手架**（"我从 X、Y、Z 三/四个方面回答" + 首先/然后/最后），真实面试里能立刻开口、不跑题，D 项基本盘很稳。
  2. **存在真正的原理级彩蛋**：5-5 的"泛型信息要用 `Type` 而不是 `Class`"、5-5 的 `InvocationTargetException.getCause()`、5-6 的"Redis 单线程模型同源于 IO 多路复用"——这几句是能拉开档次的，说明作者读过源码/踩过坑，只是没系统展开。
  3. **有工程实践意识**：5-3 的 `RRException` + `@RestControllerAdvice` + "Redis 故障返回友好提示"、5-6 的"大文件流式处理避免全量加载"，都是可直接引用的项目锚点，E 项不难补到 4-5 分。
