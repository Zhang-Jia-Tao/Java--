# 第4章 Spring —— 面试稿评审（Rubric v1）

> 评审对象：`_review/ch4_spring.md`（Q1–Q10，共 10 题）
> 评审口径：只对「高频问题」问答部分打分；开头 Spring 笔记（容器职责 / IOC 六步 / 事务原理与 ThreadLocal 绑定）作为技术基线，用于判断答案是否与笔记矛盾、是否有笔记里有而答案丢了的点。
> 评审人视角：大厂 P8 面试官（Spring 全家桶 + 微服务主考）。判定标准见 `00_rubric.md`。

---

## 一、评分总表

| 编号 | 题目 | A准确(40) | B完整(25) | C深度(20) | D表达(10) | E亮点(5) | 总分 | 判定 |
|------|------|-----------|-----------|-----------|-----------|----------|------|------|
| 4-1 | 说一下你对 Spring 的理解 | 37 | 19 | 14 | 9 | 4 | 83 | 良好 |
| 4-2 | IOC 和 AOP 是通过什么机制实现的 | 32 | 19 | 14 | 8 | 3 | 76 | 及格 |
| 4-3 | 依赖注入了解吗、怎么实现依赖注入的 | 27 | 20 | 13 | 8 | 2 | 70 | 及格 |
| 4-4 | Spring 是如何解决循环依赖的 | 31 | 18 | 15 | 9 | 5 | 78 | 及格 |
| 4-5 | MVC 分层介绍（含完整工作流程） | 35 | 12 | 9 | 8 | 2 | 66 | **不合格** |
| 4-6 | 了解 Spring Cloud Alibaba 吗、和 Spring Boot 的区别 | 38 | 20 | 12 | 9 | 3 | 82 | 良好 |
| 4-7 | 用过哪些微服务组件 | 37 | 19 | 12 | 9 | 4 | 81 | 良好 |
| 4-8 | Spring Bean 的生命周期 | 38 | 17 | 15 | 9 | 4 | 83 | 良好 |
| 4-9 | Spring 事务的传播行为有哪些 | 38 | 17 | 14 | 9 | 4 | 82 | 良好 |
| 4-10 | Spring Boot 自动配置原理 | 38 | 19 | 14 | 9 | 3 | 83 | 良好 |

- 本章**平均 78.4 分**，最高 83（4-1 / 4-8 / 4-10），最低 66（4-5）。
- 结构性问题：**10 题里 0 题达到 90+**。共性不是"不会"，而是"停在了框架层结论"——每题的骨架（"从 X 个方面回答"）都很漂亮，但普遍缺**最后一层源码入口/版本变迁**，且 **4-2 / 4-3 / 4-4 三题各带着 1–2 处会被一句话推翻的硬伤**。
- 编号说明：原文按 `Q1…Q10` 排列，本文件统一记为 4-1 … 4-10（对应任务书编号）。

---

## 二、逐题点评

### 4-1 说一下你对 Spring 的理解 —— 83 分（良好）

- **得分**：A37 / B19 / C14 / D9 / E4
- **必答点核对**：
  - 定位：轻量级企业级容器 + 一站式框架 ✅
  - 两大核心 IOC/DI ✅、AOP ✅（且点明"运行时织入 / 动态代理"，方向正确）
  - 生态体系：Framework / Boot / Cloud / Data / Security / Batch ✅（这一层比多数候选人全）
  - 核心价值：解耦、声明式事务、集成能力、测试支持 ✅
  - 设计思想收尾（IOC/AOP/扩展点/约定大于配置）✅ —— 这句是加分句式
  - BeanFactory vs ApplicationContext 的分层 ⚠️ **完全没提**（考官心里第一颗探针）
  - 扩展点思想只喊了口号，没落到 BeanPostProcessor / BeanFactoryPostProcessor / Aware ❌
  - "Spring 有什么缺点/边界" ❌ 未准备
- **硬伤**：（无严格意义的事实错误）以下 2 处属"似是而非"，会被追问：
  1. 原文「订单创建成功后发一条 RocketMQ 消息给仓储服务**解锁库存**」→ 语义反了。正常链路是"下单成功 → 锁定/预扣库存"，"解锁（释放）"发生在支付超时或订单取消时。若你的场景确实是"下单先扣、失败回补"，应明确说"下单成功扣减、失败由补偿消息回补"，别用"解锁"。
  2. 原文「比 Seata 的性能更好」→ 绝对化表述。正确说法：「Seata AT 有全局锁 + undo_log 两阶段，热点行冲突时性能下降明显；可靠消息最终一致没有全局锁、只保证最终一致，秒杀这类高并发热点场景更合适——代价是只保证最终一致、需要自己做幂等和消息表」。
- **扣分点**：
  - B（-6）：缺"容器分层"（BeanFactory 是底层 IoC 容器 / ApplicationContext 在其上加事件、国际化、资源加载、环境抽象）与"扩展点"的具体落点，导致这题像"产品介绍"而不是"技术理解"。
  - C（-6）：通篇是"What/Why"，没有一处"Spring 内部怎么做的"。至少该给一句 `AnnotationConfigApplicationContext#refresh()` 的 12 步主线（invokeBeanFactoryPostProcessors → registerBeanPostProcessors → finishBeanFactoryInitialization）。
  - D（-1）：第二段"两大核心特性"之后插了一段分布式事务踩坑，再回到"第三、第四点优势"，**结构被打断**（"第三/第四"前面没有第一第二，因为第一第二被那段踩坑隔走了）——面试官会听出"背稿拼接痕迹"。
- **可加分但没说的**：
  - 「Spring 不是银弹」：Bean 多了启动慢（单例全量初始化）、AOP 只对容器管理的 Bean 生效、版本升级成本（javax→jakarta）。
  - Spring 6 / Boot 3 的演进：AOT + GraalVM native、`@HttpExchange` 声明式 HTTP 客户端（这些能立刻区分"用过 2.x"和"跟到 6.x"）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"BeanFactory 和 ApplicationContext 什么关系？"** → 「BeanFactory 是最底层的 IoC 容器，只提供 getBean 和懒加载；ApplicationContext 是它的超集，组合了 BeanFactory，额外提供国际化、事件发布、资源加载、Environment，并且默认**启动时预实例化所有单例**——所以 `ClassPathXmlApplicationContext` 启动慢但报错早，`XmlBeanFactory` 相反。」
  2. **"Spring 的扩展点你用过哪些？"** → 「BeanFactoryPostProcessor 改 BeanDefinition（比如占位符替换、Mapper 扫描）、BeanPostProcessor 改 Bean 实例（AOP 代理、@Async 代理都在 postProcessAfterInitialization 织入）、Aware 系列拿容器能力、ApplicationListener 做启动事件，我们项目的责任链注册表就是在 `ApplicationRunner` 里装配的。」
  3. **"Spring 有什么缺点？"** → 「单例全量初始化导致大应用启动慢、AOP 有自调用失效这类隐形坑、生态版本耦合强（Boot/Cloud/SCA 三方版本必须对齐），另外反射 + 代理带来一定启动期和运行期开销。」
- **改法（可直接替换进稿子的一段话）**：
  > 「我对 Spring 的理解分三层。**第一层是它解决了什么问题**：把对象创建、依赖组装、事务、生命周期这些重复劳动从业务代码里抽走，业务只声明"我要什么"。**第二层是它靠什么做到**：IOC 靠 `BeanDefinition` + 反射 + 三级缓存，AOP 靠运行时动态代理，两者都挂在容器的 `refresh()` 生命周期上——所有扩展点（BeanFactoryPostProcessor 改定义、BeanPostProcessor 改实例、Aware 给 Bean 反向拿容器）都是沿这条主线插进去的。**第三层是它的边界**：AOP 只对容器 Bean 的**外部调用**生效，自调用、private、final 都会失效；单例全量初始化让大应用启动变慢。所以我在项目里用构造器注入保证依赖不可变，用 AOP 收敛日志/幂等/异常，但会主动避开自调用和循环依赖。」

---

### 4-2 IOC 和 AOP 是通过什么机制实现的 —— 76 分（及格）

- **得分**：A32 / B19 / C14 / D8 / E3
- **必答点核对**：
  - 本质：工厂模式 + 反射（IOC）、动态代理（AOP）✅
  - **IOC 六步** ✅ 完整且与笔记一致（资源定位 → BeanDefinition 解析 → 注册 → 实例化 → 注入 → 生命周期管理）
  - 三种注入方式 + 四种作用域 ✅
  - AOP 术语：切面/切点/通知/连接点/织入 ✅
  - JDK 动态代理（接口）vs CGLIB（继承/子类）✅
  - **默认代理策略** ❌ 错（见硬伤 1）
  - **五种通知** ✅（前置/后置/返回/异常/环绕），但未落到注解名 `@Before/@After/@AfterReturning/@AfterThrowing/@Around`
  - Spring AOP vs AspectJ ❌ 定性错误（见硬伤 2）
  - AOP 织入时机（BPP 后置）、拦截器链、自调用失效 ❌ 都缺
- **硬伤**：
  1. 原文「Spring AOP 会自动选择代理方式，默认情况下，如果目标类实现了接口，就用 JDK 动态代理，否则用 CGLIB」→ **这是 Spring 4.x 及更早的默认行为，已经过时**。正确说法：「`proxyTargetClass` 的默认值取决于使用方式：手写 `@EnableAspectJAutoProxy` 时默认 false（有接口走 JDK 代理）；但 **Spring Boot 2.x 起 `AopAutoConfiguration` 里 `spring.aop.proxy-target-class` 默认 true，即一律走 CGLIB**，所以 Boot 项目里即使有接口也会生成 CGLIB 子类代理。这也是"注入接口能成功、`@Autowired` 实现类也能成功"但 `final` 类代理报错的原因。」→ 这是本章**最容易被一句话击穿的点**，面试官只要问"那 Boot 里为什么有接口还是 CGLIB"就崩了。
  2. 原文「AspectJ 是编译时织入的**静态代理**，功能更强大」→ AspectJ 不是"代理"，它不生成代理对象，而是**直接改字节码**；且时长不止编译期：编译期织入（ajc）、编译后织入、**加载期织入（LTW，-javaagent）**三种。正确说法：「Spring AOP 是运行期动态代理，只作用于容器 Bean 的方法调用；AspectJ 是字节码织入，可覆盖字段访问、构造器、private 方法、非 Spring 管理的对象，代价是要 ajc 或 LTW agent。」
  → 两处问题合并后 A 项扣 8 分（32/40）；按纪律本题**封顶 80 以下**。
- **扣分点**：
  - B（-6）：缺"代理在哪个阶段生成"（`AbstractAutoProxyCreator#postProcessAfterInitialization` → `wrapIfNecessary` → `createProxy`）、缺"拦截器链"（`ReflectiveMethodInvocation` 递归 `proceed()`），这两点是把"AOP 是动态代理"从结论变成原理的分水岭。
  - C（-6）：三级缓存那句「专门用来解决单例 Bean 的循环依赖…提前暴露半成品对象」是对的，但放错题了——这题问的是"IOC/AOP 机制"，你给的是"循环依赖"，且只有一句话、没有 `getEarlyBeanReference`，属于"提了就走的浅尝"。
  - D（-2）：开头"我从六个方面来回答"但实际讲了七块（多出"关键设计细节"和"实际开发应用"的边界模糊），且第五、六块内容互相重复（"避免循环依赖"出现两次）。
  - E（-2）：只有末尾半句「环绕通知：统一异常处理、Redis 故障抛 RRException、记录操作日志耗时【项目中】」，一句话塞三个点，等于没讲。
- **可加分但没说的**：
  - JDK 代理的硬约束：只能代理**接口方法**，`toString/equals/hashCode` 会被路由到 InvocationHandler，非接口方法调不到。
  - CGLIB 的硬约束：不能代理 `final` 类/final 方法/private 方法；Spring 4 起 CGLIB 已 repackage 到 `spring-core`（`org.springframework.cglib`），不需要额外依赖；**Objenesis 绕过构造器**创建代理实例（这也是为什么构造器里有副作用时不会执行两次）。
  - `@Aspect` 的 Bean 是靠 `AnnotationAwareAspectJAutoProxyCreator` 这个 BPP 生效的；`@EnableAspectJAutoProxy(exposeProxy=true)` + `AopContext.currentProxy()` 是自调用的解法之一。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"Boot 项目里目标类有接口，用的是 JDK 代理还是 CGLIB？"** → 「Boot 2.x 起默认 CGLIB，因为 `spring.aop.proxy-target-class` 默认 true；想回到 JDK 代理要显式配 false。判断标准不是"有没有接口"，而是 `proxyTargetClass`。」
  2. **"同一个类里 A 方法调 B 方法，B 上的 @Transactional 为什么不生效？怎么解？"** → 「自调用走的是 `this`，没经过代理对象的拦截器链。三种解：拆到另一个 Bean、注入自身代理（`@Lazy` 或 `AopContext.currentProxy()` 配 exposeProxy）、用 `TransactionTemplate` 显式包一层。」
  3. **"说说 AOP 一条调用链的拦截过程。"** → 「代理对象进入 `JdkDynamicAopProxy#invoke`，`AdvisorChainFactory` 取出匹配的 Advisor 组成拦截器链，`ReflectiveMethodInvocation#proceed()` 用索引递归推进，事务/日志/权限各占一环，最后反射调目标方法；任一环不调 proceed 就等于短路。」
- **改法（可直接替换的那句硬伤）**：
  > 「代理方式由 `proxyTargetClass` 决定，不是由"有没有接口"决定：Spring Framework 里手写 `@EnableAspectJAutoProxy` 默认 false，有接口走 JDK 代理、无接口走 CGLIB；但**Spring Boot 2.x 起 `spring.aop.proxy-target-class` 默认 true，统一走 CGLIB 子类代理**——好处是注入实现类也能被代理、不依赖接口，代价是 final 类/方法代理不了。Spring AOP 与 AspectJ 的区别也要说清：Spring AOP 是运行期动态代理，只管容器 Bean 的外部方法调用；AspectJ 是字节码织入（编译期/编译后/加载期 LTW 三种），能覆盖字段、构造器和非容器对象，但它**不是"静态代理"**。」

---

### 4-3 依赖注入了解吗、怎么实现依赖注入的 —— 70 分（及格）

- **得分**：A27 / B20 / C13 / D8 / E2
- **必答点核对**：
  - DI 是 IOC 的实现方式 ✅（"硬编码依赖转移到外部容器"表述准确）
  - 三种注入方式 + 优缺点 ✅（构造器为官方推荐、setter 用于可选依赖、字段注入不推荐，全部正确）
  - 注入实现四步（解析 → 查找 → 反射注入 → 循环依赖处理）✅ 骨架合理
  - `@Autowired` vs `@Resource` ✅ 有辨析（"先类型后名字 / 先名字后类型"口诀对）
  - `@Qualifier` / `@Primary` ✅
  - 注入时机（单例启动时、原型每次获取）✅
  - **注入发生的真实位置**（`populateBean` → `InstantiationAwareBeanPostProcessor#postProcessProperties` → `AutowiredAnnotationBeanPostProcessor`）❌
  - **构造器注入与循环依赖的真实关系** ❌ 说反（硬伤 1）
  - **XML `default-autowire` 默认值** ❌ 错（硬伤 2）
  - `@Resource` 的 JDK 归属 ❌ 过时（硬伤 3）
- **硬伤**：
  1. 原文「构造器注入…**能够有效避免循环依赖问题**」→ **说反了**。构造器注入**根本解决不了**循环依赖（对象还没 new 出来，无半成品可暴露），会直接抛 `BeanCurrentlyInCreationException`（`Is there an unresolvable circular reference?`）。正确说法：「构造器注入的价值不是"避免循环依赖"，而是**把循环依赖从"运行期才暴露的隐性问题"变成"启动即失败的显性问题"，逼你重构职责**；能靠三级缓存兜住的只有单例 + setter/字段注入。」
  2. 原文「Spring 提供了三种自动装配方式 byName / byType / constructor，**默认是 byType**」→ 错误。XML 的 `default-autowire` 默认值是 **`no`（不自动装配）**；说"默认 byType"混淆了"`@Autowired` 的解析语义是按类型"和"容器默认开启了 byType 自动装配"。正确说法：「`default-autowire` 默认 `no`，需要显式声明；`@Autowired` 本身是 byType 优先、多候选再按名称/`@Primary`/`@Priority` 收窄，最后抛 `NoUniqueBeanDefinitionException`。」
  3. 原文「`@Resource`（JSR-250 标准，**JDK 自带**）」→ JDK 6–8 自带，**JDK 11 起随 JEP 320 移除**，需引入 `jakarta.annotation-api`。正确说法：「JSR-250 规范注解，JDK 8 及以前在 `javax.annotation` 里自带，JDK 11+ 已从 JDK 移除，要额外引依赖；Spring 6 后包名迁到 `jakarta.annotation`。」
  → A 项扣 13（27/40）。
- **扣分点**：
  - C（-7）：四步流程是"教科书式抽象"，没有一个真实的类名/方法名。真正的原理只有两句话的距离：**`AbstractAutowireCapableBeanFactory#populateBean` 遍历 `InstantiationAwareBeanPostProcessor`，`AutowiredAnnotationBeanPostProcessor#postProcessProperties` 用 `InjectionMetadata` 反射 set 值**；以及**构造器注入走 `determineConstructorsFromBeanPostProcessors` → `AutowiredAnnotationBeanPostProcessor#determineCandidateConstructors`（`@Autowired` 构造器 / 单构造器免注解）**。写了这两句，这题就从"背概念"变"读源码"。
  - B（-5）：缺"为什么官方推荐构造器注入"的四条硬理由只给了 2 条（不可变、可测），漏了"依赖缺失在启动/编译期就暴露（NPE 前移）""字段可以 `final`""Spring 4.3 起单构造器可省略 `@Autowired`"；也漏了 `@Value` / `@Lazy`（解决循环依赖的实用手段）/ `ObjectProvider`（延迟获取）。
  - D（-2）：前半"核心本质/核心概念"两段其实是同一件事换词说（都在讲"硬编码→容器管理"），占了篇幅没涨信息量；面试里这两段会被压缩成一句。
  - E（-2）：通篇**没有一个项目锚点**。这题恰恰最好挂项目："我们订单服务的 XXX 用 `@Lazy` 断了循环依赖""某次 `@Resource` 按名称注错 Bean 导致线上 500，后来全量改构造器注入"。
- **可加分但没说的**：
  - `@Autowired(required=false)` 与 `Optional<T>` / `ObjectProvider` 的取舍。
  - 同类型多 Bean 的完整优先级链：`@Primary` → `@Priority` → 参数名/字段名匹配 → `NoUniqueBeanDefinitionException`。
  - 集合注入：`List<Handler>`、`Map<String, Handler>` 会被 Spring 自动装配成"策略表"——这是业务代码里最实用的 DI 技巧，也是责任链/策略模式的落地方式（和 4-8 提到的"责任链注册表"正好呼应）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"为什么官方推荐构造器注入？字段注入到底错在哪？"** → 「构造器注入能保证 Bean 创建完就是"可用状态"，依赖 `final` 不可变、单测不用起容器、缺依赖启动即报错；字段注入靠反射在 `populateBean` 阶段塞值，能创建出半成品对象、无法 `final`、脱离 Spring 就 NPE。」
  2. **"构造器注入遇到循环依赖会怎样？"** → 「启动直接失败，抛 `BeanCurrentlyInCreationException`——因为构造器要参数，参数要另一个 Bean，另一个 Bean 又要它，三级缓存里只有"实例化之后"的半成品，构造阶段没有东西可暴露。这是好事：它在启动期就把设计问题暴露了。」
  3. **"`@Autowired` 到底在哪一步把值注进去的？"** → 「在 `populateBean` 阶段，由 `AutowiredAnnotationBeanPostProcessor`（一个 `InstantiationAwareBeanPostProcessor`）的 `postProcessProperties` 完成：它先解析出 `InjectionMetadata`（构造器/字段/方法），再按类型调 `beanFactory.resolveDependency` 找候选，最后反射 set。」
- **改法（三处硬伤的最小修法）**：
  > 「三种注入方式里，官方推荐构造器注入，理由是依赖不可变、可 `final`、单测不需容器、**依赖缺失在启动期就暴露**；注意它**不能解决循环依赖**——构造阶段没有半成品可暴露，会直接抛 `BeanCurrentlyInCreationException`，这是它帮你提前暴露设计问题的价值。`@Autowired` 按类型匹配，多候选时依次走 `@Primary` → `@Priority` → 字段/参数名，最后抛 `NoUniqueBeanDefinitionException`；`@Resource` 是 JSR-250 的，先按名称再按类型，JDK 11 起已不在 JDK 内、要单独引依赖。注入发生在 `populateBean`，由 `AutowiredAnnotationBeanPostProcessor#postProcessProperties` 反射完成。」

---

### 4-4 Spring 是如何解决循环依赖的 —— 78 分（及格）

- **得分**：A31 / B18 / C15 / D9 / E5
- **必答点核对**：
  - 三级缓存三个 Map 的名称 ✅（`singletonObjects` / `earlySingletonObjects` / `singletonFactories`，**名字全对，很少见**）
  - 各级语义 ✅（成品 / 早期半成品 / ObjectFactory）
  - **为什么需要第三级** ✅ —— 讲出了"没有 AOP 两级就够，有 AOP 需要 ObjectFactory 按需生成代理"，方向完全正确，这是本章最有含金量的一段
  - `getEarlyBeanReference` ✅ 在"项目锚点"和收尾背诵链里都点名了
  - 三个死结 ✅ 构造器 / 多例 / @Async 都点了（但 @Transactional 归类错误，见硬伤 2）
  - 八步流程 ✅ 步骤顺序基本正确（实例化 → 放工厂 → 注入发现 B → 创建 B → B 从三级取 A → 二级 → B 成品入一级 → 回到 A 完成 → A 入一级）
  - 误区澄清两条 ✅ 都正确
  - **循环依赖失败的异常类型** ❌ 说错（硬伤 1）
  - **Boot 2.6 起默认禁止循环依赖** ❌ 完全没提（本题最该补的一句）
  - `addSingletonFactory` 的插入时机 / `earlySingletonExposure` 三个判断条件 / 二级缓存何时被 remove ❌
- **硬伤**：
  1. 原文「容器在创建 A 时需要 B，创建 B 时又需要 A，会导致无限递归创建对象，**最终抛出栈溢出异常**」→ 错。Spring 有防护：`DefaultSingletonBeanRegistry#beforeSingletonCreation` 把 beanName 记进 `singletonsCurrentlyInCreation`，二次进入即抛 **`BeanCurrentlyInCreationException`（Requested bean is currently in creation: Is there an unresolvable circular reference?）**。栈溢出是"自己手写 new 才会发生"的想象场景。
  2. 原文「第三是使用 `@Async`、`@Transactional` 等 AOP 注解导致的特殊循环依赖，可能会出现代理对象无法提前暴露的问题」→ **把 @Transactional 归错了**，且与本文自己后一段「@Transactional 的循环依赖能被三级缓存解决…但 @Async 不行」**自相矛盾**。正确说法：「`@Transactional` 的代理由 `AbstractAutoProxyCreator#getEarlyBeanReference` 提前暴露，所以**能被三级缓存解决**；`@Async` 的 `AsyncAnnotationBeanPostProcessor` 继承的是 `AbstractAdvisingBeanPostProcessor`，只在 `postProcessAfterInitialization` 织入、**不实现 `getEarlyBeanReference`**，所以注入方拿到的是原始对象 → 代理失效（不报错，静默降级，这才是它最坑的地方）。」→ 同一份稿子里前后打架，面试官听到第二段会回头问第一段。
  → A 项扣 9（31/40）。
- **扣分点**：
  - B（-7）：缺三块硬内容。①**Spring Boot 2.6 起 `spring.main.allow-circular-references` 默认 false，循环依赖默认直接启动失败**（这是 2021 年后所有面试官都会问的时代变更，答"三级缓存解决"却不提"现在默认禁了"，等于答了 5 年前的答案）；②`addSingletonFactory` 发生在 `doCreateBean` 里 **属性填充之前**，且受 `earlySingletonExposure = 单例 && allowCircularReferences && isSingletonCurrentlyInCreation` 三重条件控制；③A 完成初始化后若发现早期引用与最终对象不一致，会走 `getSingleton(beanName, false)` 复用早期引用（这就是"代理一致性"的收口）。
  - C（-5）：缺源码方法名（`doCreateBean` / `getSingleton(name, allowEarlyReference)` / `addSingletonFactory` / `addSingleton`），流程是"图文描述"而非"代码路径"；也缺"二级缓存存的是**早期引用**（可能已经是代理），不是"半成品对象"这一精确表述。
  - D（-1）：八步流程里第 5 步和第 8 步各塞了三个动作（取工厂/生成引用/放二级/注入），口播时会喘不上气，建议拆成两句。
  - E（满分 5）：券享购 `OrderService ↔ CouponService` 的真实环 + "@Async 是踩坑点" + "构造器注入会报错逼你拆职责"，这是**本批最好的项目锚点**，保持。
- **可加分但没说的**：
  - 为什么第三级不能省成"二级 + 实例化后立刻生成代理"：那样所有 Bean 都要提前代理，破坏生命周期的"按需"语义，也让"哪些 Bean 被 AOP 命中"从"用到时才算"变成"创建时全算"，代价是启动期多做无用代理 + 与 `@PostConstruct` 里的 `this` 语义冲突。
  - `@Lazy` 是生产上比三级缓存更"正确"的解法（延迟注入代理，打破环而不是容忍环）。
  - `spring.main.allow-circular-references=true` 只是回退开关，不是解法。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"只能解决 setter/字段注入，那构造器注入为什么不提前暴露？"** → 「因为构造器参数必须先拿到依赖才能 new，此时对象连内存都没分配、没有引用可暴露；三级缓存暴露的最小粒度就是"实例化之后"。」
  2. **"为什么一定要第三级？二级缓存放大对象不行吗？"** → 「不行。循环依赖的注入发生在**初始化之前**，正常代理却是在 `postProcessAfterInitialization` 才生成；如果二级直接放原始对象，注入方拿到的是 raw 对象、事务/日志全失效。放 `ObjectFactory` 是为了把"要不要代理"这个决策**推迟到"被引用那一刻"**，由 `getEarlyBeanReference` 现场生成并保证全局只生成一次——这就是 AOP 代理一致性。」
  3. **"现在 Spring Boot 里还能随便循环依赖吗？"** → 「Boot 2.6 起默认禁止，`allow-circular-references=false`，启动即抛 `BeanCurrentlyInCreationException` 的变体报错；官方态度是让你重构或 `@Lazy`，而不是回退开关。」
- **改法（可直接替换进稿子的开头段）**：
  > 「先纠正一个常见说法：循环依赖不会"栈溢出"，Spring 有 `singletonsCurrentlyInCreation` 这道防护，重复创建会抛 `BeanCurrentlyInCreationException`。它的解法是三级缓存：`singletonObjects` 存成品、`earlySingletonObjects` 存**早期引用**（可能已经是代理）、`singletonFactories` 存 `ObjectFactory`。之所以要第三级，是因为注入发生在初始化之前，而代理在 `postProcessAfterInitialization` 才生成——把工厂放进去，等到"被引用那一刻"再调 `getEarlyBeanReference` 现场决定是否代理、且保证只生成一次，才能让所有持有者拿到同一个代理。注意 **Spring Boot 2.6 起循环依赖默认被禁（`spring.main.allow-circular-references=false`）**，现在正确的做法是 `@Lazy` 或重构，而不是依赖三级缓存。」

---

### 4-5 MVC 分层介绍（含完整工作流程）—— 66 分（**不合格**）

- **得分**：A35 / B12 / C9 / D8 / E2
- **必答点核对**：
  - MVC 定义与"关注点分离" ✅
  - Model/View/Controller 三层职责 ✅（Model 细分 Service + Repository，符合工程惯例）
  - View 层的两种形态（前后端分离的 Vue/React vs 服务端渲染 JSP/Thymeleaf）✅ —— 这句不错
  - 一次请求的分层流向 ✅（Controller → Service → Repository → 回传 → ModelAndView / JSON）
  - MVC 不是 Spring MVC 独有 ✅ 误区澄清正确
  - **前端控制器 DispatcherServlet** ❌ 完全缺失
  - **九大组件**（HandlerMapping / HandlerAdapter / HandlerExceptionResolver / ViewResolver / RequestToViewNameTranslator / LocaleResolver / ThemeResolver / MultipartResolver / FlashMapManager）❌ 完全缺失
  - **`DispatcherServlet#doDispatch` 主流程**（getHandler → getHandlerAdapter → applyPreHandle → ha.handle → processDispatchResult → render）❌
  - **`@ResponseBody` 不走 ViewResolver 而走 `HttpMessageConverter`** ❌
  - **拦截器 vs 过滤器**（HandlerInterceptor vs Filter，切面位置/触发时机/AOP 关系）❌
  - **`@Controller`/`@RequestMapping` 到 `HandlerMethod` 的映射注册**（`RequestMappingHandlerMapping` 启动时扫描）❌
- **硬伤**：（无致命事实错误）但有 2 处不严谨：
  1. 原文「Controller 接收请求后，进行**参数解析和校验**」→ 参数解析不是 Controller 干的，是 `HandlerAdapter`（`RequestMappingHandlerAdapter`）+ `HandlerMethodArgumentResolver` 在调用 Controller 之前完成的；Controller 只接收"已绑定好的入参"。校验（`@Valid`）也是由 `MethodArgumentResolver` 链里的 `DataBinder` 触发。
  2. 原文「Controller 将结果封装成 `ModelAndView` 对象，传递给 View 层」→ 只在"有视图名返回值"时成立；`@ResponseBody`/`@RestController` 时 `RequestResponseBodyMethodProcessor` 直接把返回值交给 `HttpMessageConverter` 写响应，**`ModelAndView` 为 null、`render` 不执行**。这正是你项目里的真实情况（前后端分离），前后两句（"封装 ModelAndView" 与 "直接返回 JSON"）并列出现，逻辑上是互斥的。
  → A 项扣 5（35/40），未按硬伤重罚，因为整体是"简化描述"而非"说反"。
- **扣分点**：
  - B（-13）：**这是本章唯一一处"题目要求的必答点成块缺失"**。题干写的是"MVC 分层**（含完整工作流程）**"，在 Spring 语境下，"完整工作流程"= `DispatcherServlet` 接收请求 → 九大组件协同 → `doDispatch` 主链路。你答的是"JavaWeb 三层架构 + 一次请求按层往下走"，那是**业务分层流程**，不是 **Spring MVC 的请求处理流程**。缺失清单（补上才算完整）：
    1. `DispatcherServlet` 是前端控制器（Front Controller），继承 `HttpServlet`，随容器启动调 `initStrategies()` **初始化九大组件**；
    2. `doDispatch` 六步：`getHandler()`（`HandlerMapping` 按 URL + Method 找到 `HandlerExecutionChain`，含 handler 与拦截器列表）→ `getHandlerAdapter()`（按 handler 类型选 `RequestMappingHandlerAdapter`）→ `applyPreHandle()`（拦截器前置）→ `ha.handle()`（参数解析 → 反射调 Controller → 返回值处理）→ `processDispatchResult()`（异常走 `HandlerExceptionResolver`，正常走 `ModelAndView`）→ `render()`（`ViewResolver` 解析视图名 → `View.render` 输出）；
    3. 返回值处理双分支：`@ResponseBody` → `HttpMessageConverter`（Jackson）直接写流，不走视图；否则 `ViewResolver` + 视图渲染；
    4. 拦截器 vs 过滤器：Filter 在 Servlet 容器层（DispatcherServlet 之前，能改 request/response）、Interceptor 在 Spring MVC 层（能拿到 handler 和 `ModelAndView`），异常处理顺序也不同。
  - C（-11）：**这是全章深度最低的一题**。通篇没有一个 Spring MVC 的类名（`DispatcherServlet`、`HandlerMapping`、`HandlerAdapter`、`ViewResolver`、`HttpMessageConverter`），只有"Controller/Service/Repository"这种业务分层名词。面试官问"MVC 和三层架构什么区别"就已经在提示你跑偏了。
  - D（-2）：第三段"完整流程"和第四段"完整流程："把同一件事说了两遍（一段散文 + 一段箭头链），车轱辘话；且用"用戶/叶面"这类 PDF 错字虽不扣分，但箭头链里"Controller 封装（前后端分离直接返回 JSON…）"括号塞太长，口播断句困难。
  - E（-2）：**零项目锚点**。这题最容易挂项目："我们的 `@RestControllerAdvice` 全局异常、`HandlerInterceptor` 做 traceId 透传、自定义 `HttpMessageConverter` 处理 Long 精度丢失"——一个都没提。
- **可加分但没说的**：
  - `HandlerMapping` 的优先级：`RequestMappingHandlerMapping`（`@RequestMapping`）先于 `BeanNameUrlHandlerMapping`、`SimpleUrlHandlerMapping`（静态资源）。
  - 九大组件"三个必配 + 六个可空"：`HandlerMapping/HandlerAdapter/HandlerExceptionResolver` 必须，`ViewResolver` 在纯 REST 场景可以没有；没配时用 `DispatcherServlet.properties` 的默认值兜底。
  - Spring 5 的 `WebFlux` 对照：`DispatcherHandler` 是响应式版本的前端控制器，九大组件换成 `HandlerMapping/HandlerAdapter/HandlerResultHandler`。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"一个请求进来，DispatcherServlet 具体做了什么？"** → 「`doDispatch`：`getHandler` 用 `HandlerMapping` 拿到 `HandlerExecutionChain`（handler + 拦截器链）→ `getHandlerAdapter` 选到 `RequestMappingHandlerAdapter` → 执行 `applyPreHandle` 拦截器前置 → `ha.handle` 里参数解析、反射调用 Controller、处理返回值 → `processDispatchResult`（有异常交给 `HandlerExceptionResolver`）→ 有 `ModelAndView` 才 `render`，`@ResponseBody` 直接用 `HttpMessageConverter` 写流。」
  2. **"拦截器和过滤器有什么区别？"** → 「Filter 属于 Servlet 规范，在 DispatcherServlet 之前、能包装 request/response，对所有请求生效；Interceptor 属于 Spring MVC，在 handler 选定之后执行、能拿到 handler 对象和 `ModelAndView`，粒度更细、能参与异常处理流程。」
  3. **"MVC 和三层架构是一个东西吗？"** → 「不是。MVC 是**表现层内部的**职责划分（Model-View-Controller 解决"数据、展示、调度"分离）；三层架构是**整个应用的**横向分层（表现层/业务层/数据访问层）。Spring MVC 只覆盖表现层，Service/Repository 是三层架构的内容——两者常被混说，但维度不同。」
- **改法（把这一题整个重写的骨架）**：
  > 「MVC 是表现层内部的关注点分离，Spring 的实现是**前端控制器模式**：所有请求先进 `DispatcherServlet`，它在 `initStrategies()` 里初始化九大组件，`doDispatch` 走五步——① `HandlerMapping` 按 URL+Method 找到 `HandlerExecutionChain`（handler + 拦截器）；② `HandlerAdapter` 匹配到 `RequestMappingHandlerAdapter`；③ 执行拦截器 `preHandle`；④ `handle()` 里用 `HandlerMethodArgumentResolver` 解析参数、反射调用 Controller、用 `HandlerMethodReturnValueHandler` 处理返回值；⑤ `processDispatchResult` 处理异常（`HandlerExceptionResolver`）、有视图就交给 `ViewResolver` 解析再 `render`。**关键分叉**：`@ResponseBody` 时返回的 `ModelAndView` 是 null，直接由 `HttpMessageConverter`（Jackson）序列化写流，不走视图——前后端分离项目走的就是这条。往下才是业务分层：Controller 只做参数校验和调度，Service 承载业务与事务边界，Repository 负责持久化。」

---

### 4-6 了解 Spring Cloud Alibaba 吗、它和 Spring Boot 的区别 —— 82 分（良好）

- **得分**：A38 / B20 / C12 / D9 / E3
- **必答点核对**：
  - 定位：**不是竞争是依赖** ✅（"Boot 造轮子、SCA 用轮子组装汽车"这个比喻很好）
  - Spring Boot 五大能力（自动配置 / starter / 内嵌容器 / Actuator / 外部化配置）✅ 齐全
  - SCA 组件（Nacos / Sentinel / Seata / RocketMQ / Dubbo / Alibaba Cloud）✅ 齐全
  - **版本对应表** ✅ **核对无误**：SCA 2021.0.5.0 ↔ Spring Cloud 2021.0.5 ↔ Spring Boot 2.6.13；SCA 2022.0.0.0 ↔ Spring Cloud 2022.0.0 ↔ Spring Boot 3.0.2。这两条与官方 wiki 一致，**没有版本张冠李戴**，是本章 A 项最干净的一题。
  - 误区两条 ✅（"没有 Boot 就没有 SCA"、"SCA 兼容 Spring Cloud 标准，可混用 OpenFeign/Gateway"）—— 都对，且第二条打破了"只能用阿里组件"的误解
  - **SCA 与 Spring Cloud 的"实现 vs 规范"关系** ❌（只说了"依赖"，没说"SCA 是 Spring Cloud 的一套实现"）
  - **版本号为什么是四段**（2021.0.5.**0**）❌ 没解释
  - **JDK 17 门槛**（2022.0.x 起要求 JDK 17 / Boot 3）❌ 没提
  - **与 Netflix 系的替换关系**（Eureka/Hystrix/Zuul/Ribbon → Nacos/Sentinel/Gateway/LoadBalancer）❌ 没讲，而这正是"为什么国内都用 SCA"的答案
  - **Nacos AP/CP、Sentinel 原理、Seata AT 两阶段** ❌ 全在下一题罗列，本题未展开（两题内容高度重叠，见下）
- **硬伤**：（无）
- **扣分点**：
  - C（-8）：通篇是"组件清单 + 它们能干什么"，**没有一句"它怎么做到"**。这题天然能挂三个深度点：① Nacos 临时实例 AP（Distro 协议，最终一致、写本地+异步同步）/ 持久实例 CP（Raft，强一致），切换靠 `ephemeral`；② SCA 版本四段式的由来（前三段对齐 Spring Cloud 的 `2021.0.5`，第四位是 SCA 自己的 patch，所以才能"跟版但不改版"）；③ 为什么 2022.0.x 一刀切到 JDK 17（Spring Framework 6 基线）。
  - B（-5）：缺"SCA 是 Spring Cloud 规范的一种实现"这个定性；缺"Boot 与 Cloud 的版本兼容由 `spring-cloud-dependencies` BOM 统一管理"的工程做法；缺"2023.0.x ↔ Boot 3.2.x"这条更新的对应（稿子停在 2022，显得资料停在 2023 年）。
  - D（-1）：结尾"常用微服务组件（按功能分类）"1–8 条直接跨到下一题，**本题与 4-7 内容重叠约 40%**（Nacos/Sentinel/Seata/Gateway/SkyWalking 在 4-6 尾部列一遍、4-7 又逐条列一遍）。面试官会问"这不刚说过吗"，建议 4-6 只留"定位 + 版本"，组件细节全部让给 4-7。
  - E（-2）：有 `【项目中就是如此】` 的锚点，但只有标签没有故事（没说什么场景下混用了哪个非阿里组件、踩了什么版本坑）。
- **可加分但没说的**：
  - "版本不对齐的典型症状"——这是最实战的一条：`NoSuchMethodError: org.springframework.boot.context.properties.ConfigurationProperties` / `ClassNotFoundException: NacosConfigProperties` / Actuator 端点 404，本质都是三方版本错配。说出症状比说"会有兼容性问题"值钱十倍。
  - SCA 2021.0.x 对 Boot 2.4+ 的配置导入机制（`spring.config.import=nacos:`）替代了 `bootstrap.yml`，这是很多老项目升级 Nacos 配置中心时踩的坑。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"SCA 和 Spring Cloud 是什么关系？"** → 「Spring Cloud 是**规范/抽象**（`DiscoveryClient`、`LoadBalancerClient`、`@FeignClient`），SCA 是它在阿里技术栈上的**一套实现**（Nacos 实现注册发现与配置、Sentinel 实现熔断限流），所以能在同一个项目里混用 Nacos + OpenFeign + Gateway——只要接口一致。」
  2. **"版本号为什么是 2021.0.5.0 四段？"** → 「前三段对齐 Spring Cloud 的版本（2021.0.5），第四段是 SCA 自己的 patch 号，这样 SCA 可以独立发版而不动 Spring Cloud 的大版本。」
  3. **"版本不匹配会有什么现象？"** → 「多半是 `NoSuchMethodError` / `ClassNotFoundException`，或者配置不生效（`bootstrap.yml` 里 Nacos 配置没加载）、Actuator 端点 404；排查顺序是先看 `dependency:tree` 里 Boot/Cloud/SCA 三方版本，再对齐官方 wiki 的对应表，用 BOM 统一管。」
- **改法（补一句定性 + 一句时代变更，其余不动）**：
  > 「严格说：**Spring Cloud 是规范，Spring Cloud Alibaba 是这套规范在阿里技术栈上的实现**，而 Spring Boot 是它们共同的地基——每个微服务本身就是一个 Boot 应用。版本上 SCA 采用四段式（`2021.0.5.0`），前三段对齐 Spring Cloud、第四段是自己的 patch，所以能跟版不锁版；**2022.0.x 起基线切到 Spring Boot 3 / JDK 17**，升级时先对 `spring-cloud-dependencies` BOM，再看 SCA 的对应表。」

---

### 4-7 用过哪些微服务组件 —— 81 分（良好）

- **得分**：A37 / B19 / C12 / D9 / E4
- **必答点核对**：
  - 八大类分类法（服务治理 / 配置 / 限流熔断 / RPC / 网关 / MQ / 分布式事务 / 链路追踪）✅ 分类清晰、无遗漏，比"逐个报菜名"高一个层次
  - Nacos 注册发现 + 健康检查 + **AP/CP 可切换** ✅
  - Nacos 配置中心：热更新、命名空间/分组、版本回滚 ✅
  - Sentinel：限流 + 熔断降级 + 控制台 ✅
  - OpenFeign 声明式客户端 + 集成 Sentinel ✅
  - Gateway：路由 + 认证 + 日志 + 跨域 + 全局限流 ✅
  - RocketMQ：异步解耦 + 削峰 ✅
  - Seata AT ✅（表述有瑕疵，见下）
  - SkyWalking：链路 + 拓扑 ✅
  - **组件协同全链路**（Gateway → 服务 → Feign → Nacos 发现 → Sentinel → Seata → SkyWalking → RocketMQ）✅ 这段串得很好
  - **每个组件的核心机制**（Nacos Distro/Raft、Sentinel LeapArray 滑动窗口、Seata undo_log/全局锁/TC-TM-RM、Gateway 的 WebFlux 模型、SkyWalking 探针字节码增强）❌ 基本没有
  - **选型对比 / 为什么不用别的**（Eureka、Hystrix、Zuul、Zipkin）⚠️ 只有一句"Nacos 比 Eureka 性能更好、支持 AP/CP"
- **硬伤**：（无严格硬伤）1 处需在面试中主动澄清的表述：
  - 原文「Seata 的 AT 模式…**基于两阶段提交**，对业务无侵入」→ 字面不错，但**极易被追问翻车**。AT 的两阶段与 XA 的两阶段**语义完全不同**：一阶段就**提交本地事务**并写 `undo_log`（不是 XA 的 prepare 挂起），二阶段是异步删 `undo_log`（成功）或按 `undo_log` 反向补偿（失败），靠**全局锁**保证隔离。说"基于两阶段提交"必须紧跟"但它是**本地事务先提交 + undo_log 补偿**，和 XA 的 prepare/commit 两段式不是一回事"。
  → A 项扣 3（37/40），按"似是而非"处理（计入追问风险，不封顶判定）。
- **扣分点**：
  - C（-8）：**这是"组件吊唁名单"式回答的典型问题**——八个组件全是"我用它做了什么业务功能"，没有一个"它内部怎么实现"。本批最容易补上的三句：
    1. Nacos：1.x 客户端 **长轮询**（29.5s hold，配置变更立即响应）、2.x 改 **gRPC 长连接**；临时实例走 **Distro**（AP，各节点异步同步）、持久实例走 **Raft**（CP）。
    2. Sentinel：统计用**滑动窗口 `LeapArray`**（默认 1s 分 2 个窗口），熔断三种策略（慢调用比例 / 异常比例 / 异常数），规则默认存在**内存**，生产要接 **Nacos 数据源持久化**。
    3. Seata AT：三个角色 TC（seata-server）/ TM（`@GlobalTransactional` 发起方）/ RM（数据源代理），**一阶段本地提交 + undo_log，二阶段异步删或补偿 + 全局锁防脏写**。
  - B（-6）：缺"为什么是这套组合"的对比：Nacos vs Eureka（AP 为主、健康检查靠心跳 vs 客户端主动上报 + 临时/持久实例）、Sentinel vs Hystrix（信号量/滑动窗口 vs 线程池隔离，Hystrix 已停止维护）、Gateway vs Zuul（WebFlux 异步非阻塞 vs Servlet 阻塞）。缺"分布式事务四方案取舍"（2PC / TCC / 可靠消息 / 最大努力通知）——这一条在本章 4-1 提了 RocketMQ，此处没有形成呼应。
  - D 满分 9：分类清晰、有协同流程、有真实故障故事，口播友好（"我们曾经遇到一个下游服务响应变慢，导致上游线程池被占满"是很好的叙事）。
  - E（-1）：两个项目故事（雪崩 → Sentinel 熔断、配置分散 → Nacos 迁移）真实，但都停在"我做了什么"，没讲"效果/量化"（熔断后 P99 从多少降到多少、配置变更从发版 20 分钟变 10 秒）。
- **可加分但没说的**：
  - **链路追踪的落地细节**：traceId 怎么透传（`Sleuth/Micrometer Tracing` 的 MDC + Feign 拦截器 + RocketMQ 消息头），日志里怎么打——这是最容易被问"你真的用过吗"的点。
  - **网关层限流 + Sentinel 集群流控**、**Sentinel 规则持久化到 Nacos** 的配置形态。
  - **组件协同的失败路径**：Nacos 挂了服务还能不能调（本地缓存 + 推空保护）、Sentinel 控制台挂了规则是否生效（推模式 vs 拉模式）。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"Nacos 的 AP 和 CP 你怎么选？底层分别是什么？"** → 「默认临时实例走 AP，用 **Distro** 协议：每个节点管一部分数据、写本地后异步同步，网络分区时保证可用；持久实例（`ephemeral=false`）走 **CP**，用 **Raft** 保证强一致。注册发现场景要 AP（宁可短暂看到旧实例），配置元数据类可以 CP。」
  2. **"Sentinel 的限流是怎么统计的？规则重启会不会丢？"** → 「核心是**滑动窗口 `LeapArray`**，把 1 秒切成多个小窗口做计数，避免固定窗口的临界突刺；规则默认只在内存，重启就丢，生产要接 **Nacos 数据源**做持久化 + 推送。」
  3. **"Seata AT 的一阶段到底做了什么？和 XA 有什么区别？"** → 「AT 一阶段是**直接提交本地事务**并写 `undo_log`（用数据源代理自动生成前后镜像），同时向 TC 注册分支、拿**全局锁**；二阶段成功就异步删 `undo_log`，失败就按 `undo_log` 反向补偿。XA 是 prepare 阶段就锁住资源不提交，所以 AT 的吞吐远高于 XA，代价是隔离性只到"读已提交 + 全局锁防脏写"。」
- **改法（把"清单"升级成"清单 + 一句机制"）**：
  > 每个组件后面加一个"机制短语"即可，例：「Nacos 做注册发现，临时实例走 **Distro** 的 AP（写本地异步同步）、持久实例走 **Raft** 的 CP，1.x 配置推送靠 **29.5 秒长轮询**、2.x 改 **gRPC 长连接**；Sentinel 用**滑动窗口 LeapArray** 做实时统计、三种熔断策略 + **Nacos 持久化**规则；Seata AT 是**一阶段本地提交 + undo_log，二阶段异步删或补偿**，靠全局锁保证写隔离；Gateway 基于 **WebFlux/Netty** 非阻塞模型，所以不能混用 spring-web 的阻塞写法。」——同样的篇幅，从"用过"变成"懂过"。

---

### 4-8 Spring Bean 的生命周期 —— 83 分（良好）

- **得分**：A38 / B17 / C15 / D9 / E4
- **必答点核对**：
  - 八阶段划分 ✅ 顺序**完全正确**：实例化 → 属性填充 → Aware 回调 → BPP before → 初始化（`@PostConstruct` → `afterPropertiesSet` → `init-method`）→ BPP after → 就绪 → 销毁（`@PreDestroy` → `destroy` → `destroy-method`）
  - **三层初始化方法的先后顺序** ✅ 这是最容易背错的地方，原文一次没错（`@PostConstruct` 由 `CommonAnnotationBeanPostProcessor` 的 `postProcessBeforeInitialization` 触发 → `InitializingBean` → `init-method`）
  - **AOP 代理在 BPP 后置阶段生成** ✅ 且点明"代理在初始化完成后才生效"
  - **BPP（框架级、作用于所有 Bean）vs InitializingBean/init-method（业务级、只作用于当前 Bean）** ✅ 这个区分讲得很清楚
  - **"@PostConstruct 里 this 是原始对象，要代理能力得 `getBean`"** ✅ —— **本批最亮的一句**，说明真读过生命周期而不是背书
  - 项目锚点（缓存预热 / 线程池初始化 / `ApplicationRunner` 做责任链注册表）✅
  - **BeanFactoryPostProcessor / BeanDefinitionRegistryPostProcessor** ❌（"BPP 之前的那一层"整块缺失）
  - **完整 Aware 顺序**（`BeanNameAware` → `BeanClassLoaderAware` → `BeanFactoryAware` → `EnvironmentAware` → `EmbeddedValueResolverAware` → `ResourceLoaderAware` → `ApplicationEventPublisherAware` → `MessageSourceAware` → `ApplicationContextAware`）⚠️ 只列了 3 个
  - **`InstantiationAwareBeanPostProcessor`**（`postProcessBeforeInstantiation` / `postProcessAfterInstantiation` / `postProcessProperties`——`@Autowired` 注入就在这里）❌
  - **`SmartInitializingSingleton`**（所有单例创建完后回调，`@EventListener(ApplicationReadyEvent)` 的兄弟）❌
  - **prototype 的销毁不归容器管**（`@PreDestroy` 不生效）❌ 这是高频追问
- **硬伤**：（无）—— 八阶段顺序、初始化三方法顺序、AOP 织入时机、BPP 作用域这四处全部正确，A 项给到 38。
- **扣分点**：
  - B（-8）：缺四个必答点：① **BFPP vs BPP**（前者改 BeanDefinition、在所有 Bean 实例化之前执行，`PropertySourcesPlaceholderConfigurer`、`MapperScannerConfigurer` 都是它）；② 完整 Aware 顺序（至少说出 `BeanNameAware → BeanFactoryAware → ApplicationContextAware` 的由内到外）；③ `SmartInitializingSingleton`；④ **prototype Bean 容器不管理销毁**。
  - C（-5）：讲了"为什么要分这么多层"（分层解耦：基础职责 / 感知容器 / 框架扩展 / 业务扩展）——**这个动机解释是加分项**，但缺代码入口：`AbstractAutowireCapableBeanFactory#doCreateBean` → `populateBean` → `initializeBean`（`invokeAwareMethods` → `applyBeanPostProcessorsBeforeInitialization` → `invokeInitMethods` → `applyBeanPostProcessorsAfterInitialization`）。写出这条链，C 项能到 18+。
  - D（-1）：八阶段用一段话连续罗列，口播到第五阶段容易乱；建议"实例化—注入—初始化（Aware/BPP前/init/BPP后）—使用—销毁"报五个大词，再展开中间的小顺序。
  - E（-1）：项目锚点真实但不深（"缓存预热、线程池初始化"是通用场景），缺一个"踩坑"（比如 `@PostConstruct` 里调了被 `@Async` 代理的方法没生效、或 `@PostConstruct` 中注入的依赖还没就绪导致 NPE）。
- **可加分但没说的**：
  - **循环依赖的挂钩点就在生命周期里**：`addSingletonFactory`（提前暴露）发生在**属性填充之前**，这正是 4-4 那题与本题的连接点——把两题串起来讲，面试官会认为你有一张完整地图。
  - `ApplicationContext` 的 `refresh()` 与 Bean 生命周期的关系：`invokeBeanFactoryPostProcessors` → `registerBeanPostProcessors` → `finishBeanFactoryInitialization`（这里才真正开始 `getBean`）。
  - `BeanPostProcessor` 自身也会被提前实例化（`registerBeanPostProcessors` 阶段），所以 BPP 里不要注入业务 Bean（会提前触发初始化，导致"AOP 不生效"的经典坑）——这是**最值钱的一个坑**。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"BeanFactoryPostProcessor 和 BeanPostProcessor 区别？"** → 「BFPP 在**所有 Bean 实例化之前**执行，操作的是 `BeanDefinition`（改属性值、注册新定义），`PropertySourcesPlaceholderConfigurer` 就是它；BPP 在**每个 Bean 初始化前后**执行，操作的是 Bean 实例本身，AOP、`@Async`、`@PostConstruct` 全靠它。」
  2. **"prototype Bean 的销毁方法会被调用吗？"** → 「不会。容器只对单例做完整的销毁回调（`@PreDestroy` / `DisposableBean` / `destroy-method`），prototype 创建完就交给调用方，容器不再持有引用、也不管销毁，需要自己清理。」
  3. **"在 BeanPostProcessor 里注入业务 Bean 会有什么问题？"** → 「BPP 本身在 `registerBeanPostProcessors` 阶段就被实例化了，比普通 Bean 早；如果它依赖某个业务 Bean，会提前触发那个 Bean 的初始化，此时后面的 BPP 还没注册，**AOP 代理不会生效**——这是"日志切面在某个 Bean 上莫名失效"的常见原因。」
- **改法（把八阶段压成"五步 + 中间三小步"，并补 BFPP）**：
  > 「报五个大词：**实例化 → 属性注入 → 初始化 → 使用 → 销毁**。中间最密的"初始化"拆四小步：`Aware` 回调（`BeanName` → `BeanFactory` → `ApplicationContext`，由内到外）→ BPP `postProcessBeforeInitialization`（`@PostConstruct` 在这里触发）→ `afterPropertiesSet` → `init-method` → BPP `postProcessAfterInitialization`（**AOP 代理在这一步生成**）。销毁对称：`@PreDestroy` → `destroy` → `destroy-method`。**别忘了在最前面补一层 BFPP**：`invokeBeanFactoryPostProcessors` 在所有 Bean 实例化之前改 `BeanDefinition`，所以"改定义"和"改实例"是两条不同的扩展线。还有两个高频细节：prototype 不归容器销毁；在 BPP 里注入业务 Bean 会让它提前初始化、导致 AOP 失效。」

---

### 4-9 Spring 事务的传播行为有哪些 —— 82 分（良好）

- **得分**：A38 / B17 / C14 / D9 / E4
- **必答点核对**：
  - 七种传播行为**语义全部正确** ✅✅：REQUIRED（有则加入、无则新建）/ REQUIRES_NEW（挂起外层、独立新事务）/ NESTED（有则建保存点、无则等同 REQUIRED）/ SUPPORTS（有则加入、无则非事务）/ NOT_SUPPORTED（挂起当前、非事务执行）/ MANDATORY（无事务抛异常）/ NEVER（有事务抛异常）—— **一处没错，这是本章 A 项最干净的一题**
  - REQUIRES_NEW vs NESTED 对比 ✅（"兄弟 vs 父子"的比喻好；"内层回滚只到保存点、外层回滚带走内层"方向正确）
  - 自调用失效 ✅（"不走代理，必须注入自身代理或拆到不同 Bean"）
  - 场景判断 ✅（日志/埋点/审计用 REQUIRES_NEW，批处理部分成功用 NESTED）—— 这是**真正理解而非背诵**的标志
  - **`rollbackFor` 默认规则**（只对 `RuntimeException` 和 `Error` 回滚，受检异常不回滚）❌ **本题未提**（笔记第 94–96 行有，答案丢了）
  - **挂起机制的实现**（`TransactionSynchronizationManager` 把资源 unbind/bind，`SuspendedResourcesHolder`）❌
  - **NESTED 的硬约束**（依赖 JDBC `Savepoint`，`JtaTransactionManager` 直接抛 `NestedTransactionNotSupportedException`；同一连接、外层锁不释放 → 死锁风险）❌
  - **其余事务失效场景**（非 public 方法、异常被 try-catch 吞掉、类未被 Spring 管理、多线程/`@Async`、数据库引擎不支持事务如 MyISAM、`final`/`static` 方法）❌ 只提了自调用
  - **连接池消耗风险**（REQUIRES_NEW 需要第二条连接，嵌套两层 = 2 条连接，高并发下可能打满）❌ 没提
  - `readOnly` / `timeout` / `isolation` 三个属性 ❌
- **硬伤**：（无）—— 七种语义、REQUIRES_NEW/NESTED 差异、自调用的结论全部正确。
- **扣分点**：
  - B（-8）：**这题的必答点其实是"传播七种 + 默认回滚规则 + 失效场景"三联**，你只答了第一联。缺 `rollbackFor`（最经典追问："抛了 IOException 为什么没回滚？"）是**结构性缺失**；缺 NESTED 不支持 JTA / 需要 Savepoint 这一条，会让"父子关系"变成空心结论。
  - C（-6）：没有落到实现入口。真正的一句话是：**`AbstractPlatformTransactionManager#getTransaction` → `handleExistingTransaction`，按传播级别分派：REQUIRED 复用 `TransactionStatus`、REQUIRES_NEW 走 `suspend()` + `startTransaction` + `resume()`、NESTED 走 `createAndHoldSavepoint`**。缺这句，七种传播就只是七个名字 + 七个定义。
  - D（-1）：七种用"第一/第二/第三…其余四种"混排，**主次分层的边界不干净**（前三种讲得很细、后四种一句话带过，听众会以为后四种不重要——其实 MANDATORY/NEVER 恰是考察点）；口诀"REQUIRED 复用连接同生共死、REQUIRES_NEW 换连接兄弟分家、NESTED 不换连接只打保存点"很好，但和正文重复。
  - E（-1）：有场景判断但无真实事故（"曾经因为日志表写入失败把主业务一起回滚，加了 REQUIRES_NEW 后解决"——这种一句话故事能把 E 打满，现在只是判断没有故事）。
- **可加分但没说的**：
  - **`@Transactional` 的生效条件由 `AbstractFallbackTransactionAttributeSource` 决定**：`public` + 非 `final` + 同类外部调用。
  - **`rollbackFor = Exception.class` 是团队规范级建议**：受检异常不回滚是 EJB 时代的约定（当时把受检异常当"可恢复"），Spring 沿用了它，但业务上几乎总要显式 `rollbackFor`。
  - **`TransactionSynchronization`** 的 `afterCommit` 钩子——"事务提交后发 MQ / 清缓存"的正确姿势（`@TransactionalEventListener(phase = AFTER_COMMIT)`），这条能把事务题和 MQ 题串起来，是很强的亮点。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"方法里抛了 IOException，为什么没回滚？"** → 「Spring 默认只对 `RuntimeException` 和 `Error` 回滚（沿用 EJB 约定，受检异常被视为"可恢复"），要回滚必须 `@Transactional(rollbackFor = Exception.class)`——我们团队规范里是强制显式声明的。」
  2. **"REQUIRES_NEW 有什么坑？"** → 「它要**第二条数据库连接**，嵌套几层就占几条连接，高并发下会把连接池打满；另外外层事务的锁还没释放，内层又去更新同一行会**自死锁**。还有挂起/恢复的开销，能不用就不用。」
  3. **"NESTED 什么时候真正有用？"** → 「需要对"部分失败"做局部回滚时，比如批量导入每条记录独立回滚到保存点、外层还能继续提交；但前提是走 JDBC `Savepoint`（`JtaTransactionManager` 不支持，会抛 `NestedTransactionNotSupportedException`），而且内层异常必须在外层被处理掉、外层事务不能标记 `rollbackOnly`。」
- **改法（补上"第二联"，一句话进稿）**：
  > 「七种里最常用三种：REQUIRED 默认、有则加入；REQUIRES_NEW 挂起外层、独立提交（注意多占一条连接，高并发有耗尽风险）；NESTED 建 JDBC 保存点、内层回滚只到保存点（父子关系，JTA 不支持）。剩下四种里 SUPPORTS/NOT_SUPPORTED 是声明非事务语义，MANDATORY/NEVER 用于"必须/必须没有事务"的契约校验。必须搭配说的还有两点：**默认只对 `RuntimeException` 和 `Error` 回滚，受检异常要显式 `rollbackFor = Exception.class`**；以及**自调用不走代理，事务注解会失效**，解法是拆 Bean、注入自身代理或用 `TransactionTemplate`。」

---

### 4-10 Spring Boot 自动配置原理 —— 83 分（良好）

- **得分**：A38 / B19 / C14 / D9 / E3
- **必答点核对**：
  - `@SpringBootApplication` **三合一** ✅（`@SpringBootConfiguration`（本质 `@Configuration`）+ `@ComponentScan` + `@EnableAutoConfiguration`）
  - `@EnableAutoConfiguration` = `@Import(AutoConfigurationImportSelector.class)` ✅
  - **`DeferredImportSelector`** ✅ 且解释了"延迟到用户配置之后处理，保证用户配置优先"—— 这个动机解释正确且到位
  - **文件名版本差异** ✅ ✅：Boot 2.7 之前 `META-INF/spring.factories`（key = `EnableAutoConfiguration`）；2.7 起 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`，一行一个全限定名 —— **这条是本批最容易写错的，原文两处都写对了**
  - `@Conditional` 家族 ✅（`@ConditionalOnClass` / `@ConditionalOnMissingBean` / `@ConditionalOnProperty` 举例准确）
  - `@ConfigurationProperties` 绑定 + `@EnableConfigurationProperties` + `@ConditionalOnMissingBean` 兜底 ✅
  - 自定义 starter 的做法 ✅（"按同样约定注册到 `AutoConfiguration.imports`"）
  - **名单的"过滤 + 排序"两步**（`spring.autoconfigure.exclude` 排除、`AutoConfigurationSorter` 按 `@AutoConfigureBefore/After/Order` 排序）❌ 说成"逐一加载"
  - **`@AutoConfiguration` 注解**（2.7+ 新增，`proxyBeanMethods=false`）❌
  - **`DeferredImportSelector.Group` 的分组机制**（`AutoConfigurationGroup` 把自动配置聚成一组、最后统一处理）❌ 只讲了动机没讲实现
  - **条件评估报告**（`--debug` / Actuator `/actuator/conditions` / `ConditionEvaluationReport`）❌ 只说"看源码"
  - **2.7 的过渡态**（`spring.factories` 里的自动配置 key 在 2.7 被 deprecated、3.0 移除）⚠️ 只说"起"，没说"兼容期"
  - `spring.factories` 的**其他 key**（`EnvironmentPostProcessor`、`ApplicationContextInitializer`、`FailureAnalyzer`）❌
- **硬伤**：（无）—— 三合一、Selector、DeferredImportSelector、文件名版本差异、条件注解、`@ConfigurationProperties` 六处全部正确，A 项 38。
- **扣分点**：
  - B（-6）：缺"过滤+排序"（自动配置不是"逐一加载"，是先剔除 exclude、去重、按 `@AutoConfigureOrder` 排序，再由 `ConfigurationClassParser` 当配置类解析）、缺 `@AutoConfiguration`、缺条件评估报告的排查手段、缺 `spring.factories` 其他 key 的说明。
  - C（-6）：**这是本题最可惜的地方**——"为什么用 DeferredImportSelector"讲对了动机（用户优先），但没讲**怎么实现**。正解：`DeferredImportSelector` 的 `selectImports` 不立即执行，而是把结果包成 `DeferredImportSelector.Group`（这里是 `AutoConfigurationImportSelector.AutoConfigurationGroup`），等 `ConfigurationClassParser` 把用户配置全部 `processConfigurationClass` 完之后，才在 `processDeferredImportSelectors()` 里处理——所以"用户优先"是**解析阶段顺序**保证的，不是靠条件注解。补这一句，C 能到 17+。
  - D（-1）：前半"五步走"图示很好（带版本差异标注，是本章最清晰的一页），但**与后半口语版正文重复约 60%**（三合一讲了两遍、文件名讲了两遍、条件注解讲了两遍）——作为稿子可以留，作为口播要选一个，否则 3 分钟里有一半在自我重复。
  - E（-2）：说"我会利用这个机制排查问题"，但没给具体案例（比如"某某自动配置没生效，最后发现是 `@ConditionalOnMissingBean` 被我们自己的 Bean 顶掉了"或"自定义 starter 里 `spring-configuration-metadata.json` 没写导致 IDE 无提示"）。自定义 starter 也只说"按同样约定"，缺**两个模块分层**（`xxx-spring-boot-starter` 只做依赖聚合 + `xxx-spring-boot-autoconfigure` 放实现）这个实战细节。
- **可加分但没说的**：
  - **`spring-boot-configuration-processor`** + `spring-configuration-metadata.json`：自定义 starter 的 IDE 自动补全靠它，这是"真写过 starter"的分水岭。
  - **`@ConditionalOnClass` 的 class 值不要直接引用类**（要用 `name` 字符串或把自动配置类放在独立内部类），否则 classpath 没有该类时加载配置类本身就会 `NoClassDefFoundError`——这是写 starter 最容易踩的坑。
  - **Boot 2.7 的双读兼容**：`ImportCandidates` 同时读新旧两种文件，所以 2.7 上老 starter 还能用，3.0 就彻底断了。
- **面试官追问（3 个，附一句话标准答法）**：
  1. **"为什么必须是 DeferredImportSelector，普通 ImportSelector 行不行？"** → 「普通 `ImportSelector` 在解析到注解时立刻导入，用户自己的 `@Configuration` 可能还没处理，`@ConditionalOnMissingBean` 判断时容器里还没那个 Bean，会误判。`DeferredImportSelector` 会把自己的导入项包成 `Group`，等所有用户配置解析完，在 `processDeferredImportSelectors()` 阶段最后统一处理——"用户优先"是**顺序**保证的。」
  2. **"自动配置类这么多，怎么定位某个为什么没生效？"** → 「开 `--debug` 或调 `/actuator/conditions` 拿 `ConditionEvaluationReport`，直接看那个自动配置类上哪个 `@Conditional` 的 `matched=false` 及原因（最常是 `@ConditionalOnClass` 缺依赖、`@ConditionalOnMissingBean` 被自己定义的 Bean 顶掉、`@ConditionalOnProperty` 拼错）。」
  3. **"自定义 starter 怎么做？"** → 「拆两个模块：`xxx-spring-boot-starter` 只做依赖聚合，`xxx-spring-boot-autoconfigure` 放 `@AutoConfiguration` 类和 `@ConfigurationProperties`；把类名写进 `AutoConfiguration.imports`；条件注解用 `@ConditionalOnClass` + `@ConditionalOnMissingBean` 保证可覆盖；再引 `configuration-processor` 生成元数据让 IDE 有提示。」
- **改法（把"逐一加载"改成"三步走"，并补 Group）**：
  > 「Selector 拿到名单后不是直接全部加载，中间还有两步：**先过滤**（去掉 `spring.autoconfigure.exclude` 里的、去重）、**再排序**（`AutoConfigurationSorter` 按 `@AutoConfigureBefore/After/Order` 算顺序），最后才作为配置类交给 `ConfigurationClassParser`，逐类评估 `@Conditional`。而"用户配置优先"是靠 `DeferredImportSelector.Group` 实现的：自动配置被包成一个 Group，等用户所有 `@Configuration` 解析完之后，在 `processDeferredImportSelectors()` 阶段最后处理——所以 `@ConditionalOnMissingBean` 才能看到用户已经注册的 Bean。」

---

## 三、本章小结

### 1. 分数概况

- **平均 78.4 分**（10 题合计 784），**最高 83**（4-1 / 4-8 / 4-10 并列），**最低 66**（4-5 MVC，唯一不合格）。
- 分布：良好 6 题（80–89）、及格 3 题（70–79）、不合格 1 题（66）、**满分/准满分 0 题**。
- 一句话诊断：**"框架级结论"覆盖率高（这 10 题都能开口讲 3 分钟不冷场），"源码级入口"覆盖率接近零**（全章出现的类名屈指可数：`BeanDefinition`、`ObjectFactory`、`getEarlyBeanReference`、`AutoConfigurationImportSelector`、`ModelAndView`），且 4-2 / 4-3 / 4-4 三题各存在"一句话被推翻"的版本/语义错误。想上 90，缺的不是篇幅，是**每题的"最后一公里"**：一个类名 + 一个方法名 + 一条版本变更。

### 2. 最容易被面试官击穿的点（按严重度排序）

1. **4-5 缺 DispatcherServlet 整条链路**（最严重，B 项结构性缺失）。题干明确要求"完整工作流程"，答成了"业务三层 + 按层往下走"。面试官问一句"请求先到哪个类"就直接穿帮——这是本章唯一一处"必答点成块缺失"，必须补 `doDispatch` 六步 + 九大组件 + `@ResponseBody` 走 `HttpMessageConverter` 的分叉。
2. **4-2 的 AOP 默认代理策略停在 Spring 4 时代**（硬伤）。"有接口用 JDK、没接口用 CGLIB"在 Boot 2.x 已不成立（`proxy-target-class` 默认 true，一律 CGLIB）。这是全章**被追问概率最高**的硬伤，且它会连带击穿 4-8（你讲了"AOP 在 BPP 后置生成"，却不知道生成的是 CGLIB 子类）。
3. **4-3 把构造器注入与循环依赖的关系说反**（硬伤）。"构造器注入能有效避免循环依赖"——实际它是**唯一会把循环依赖变成启动失败**的注入方式（`BeanCurrentlyInCreationException`）。这条错误会直接反噬 4-4 的可信度（同一份稿子里两题互相矛盾）。
4. **4-4 的循环依赖答案有三处时代/语义错位**：说"栈溢出"（实为 `BeanCurrentlyInCreationException`）、把 `@Transactional` 列进"无法解决"（同稿后文自我否定）、完全没提 **Boot 2.6 起 `allow-circular-references` 默认 false**。第三点最致命：现在（2022 年后）面试官问循环依赖，标准答案是"默认已经禁了，正确做法是 `@Lazy` 或重构"。
5. **4-6 / 4-7 的组件题只有"能干什么"，没有"怎么做到的"**。Nacos 的 Distro/Raft、Sentinel 的 `LeapArray`、Seata AT 的 `undo_log`/全局锁、Gateway 的 WebFlux 模型——四个组件四句话，全章 C 项就能整体抬 3 分以上；现在一追问"原理"就只剩名词。

> 补充一条"基线对照"提醒（不计入本题扣分）：**笔记第 94–96 行**把"受检异常不回滚"解释为"Spring 认为业务可恢复"，这是作者自己的通俗化解释，严格说 Spring 是**沿用 EJB 的历史约定**（受检异常＝预期内、调用方可处理）。而 **4-9 的问答部分把这段回滚规则整段丢了**——笔记里有、答案里没有，属于"作者自己写过的必答点没带进答案"，建议补回。

### 3. 最值得保留的亮点（别在改稿时改掉）

1. **4-4 的"为什么需要第三级"**：讲出了"没有 AOP 两级就够 → 有 AOP 必须靠 `ObjectFactory` 在**被引用那一刻**按需生成代理 → 保证所有人拿到同一个代理"，还配了"三个死结"和 `getEarlyBeanReference` 的精确术语。这是全章**唯一一段达到源码级理解**的内容，也是唯一 E 项满分（5/5）的题。
2. **4-8 的生命周期顺序 + 那句"`@PostConstruct` 里 `this` 是原始对象，要代理能力得 `getBean`"**：八阶段顺序、初始化三方法的先后、AOP 织入时机全部正确，"原始对象 vs 代理对象"这个观察点很多工作五年的人都说不出来。
3. **4-9 的七种传播语义 + "兄弟 vs 父子"比喻 + 日志/审计用 REQUIRES_NEW 的场景判断**：语义零错误，且有"为什么这么选"的业务推理（日志写失败不该回滚主业务），这是"理解"而非"背诵"的证据。
4. **4-6 的版本对应表 + "Boot 造轮子、SCA 组装汽车"的定位比喻**：两条版本对应（2021.0.5.0 ↔ Boot 2.6.13 / 2022.0.0.0 ↔ Boot 3.0.2）**核对无误**，这个细节很多人会写错；定位比喻一句话就讲清了"依赖而非竞争"。
5. **4-7 的"八大类 + 一次请求的组件协同链路"**：从 Gateway → 服务 → Feign → Nacos → Sentinel → Seata → SkyWalking → RocketMQ 一条线串下来，加上"下游变慢打满上游线程池 → Sentinel 熔断"的真实故障，是本批最有画面感的项目叙述。

### 4. 一句话行动建议

**优先修 4-5（补 DispatcherServlet 九大组件与 `doDispatch`，这一题不修就是不及格）→ 再修 4-2 / 4-3 / 4-4 的三处硬伤（各只需改 1–3 句）→ 最后给 4-6 / 4-7 / 4-10 每个组件各补一句"底层怎么实现的"**。前一小时能把平均分从 78.4 拉到 84+，再补每题的"一个类名 + 一个方法名"，才有机会摸到 90。
