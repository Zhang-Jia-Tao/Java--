# 文档 ↔ 源码 一致性核验清单（第一轮）

> 核验对象：`_review/项目经历.md`（12,272 行）
> 核验基准：`E:\Project\onecoupon`（319 个文件、213 个 Java 类、94.5 万字符）
> 方法：全量建索引 → 抓文档中反引号标识符 → 三态判定（命中 / 近似 / 缺失）→ 人工看源码确认

## 一、总体命中情况

| 指标 | 数值 |
|---|---|
| 文档反引号标识符 | 306 个 |
| 其中 CamelCase | 100 个 |
| 疑似「项目类」（带 Filter/Handler/Consumer/Service/Algorithm 等后缀，或 Coupon/Merchant 等前缀） | 39 个 |
| 命中源码 | 22 个（56%） |
| 未命中 | 17 个，其中**确属硬伤 9 个**，其余为 JDK/框架通用类（不算错） |

> 说明：全量 100 个 CamelCase 里 72 个「未命中」绝大多数是 `CompletableFuture`、`CopyOnWriteArrayList`、`ThreadPoolExecutor`、`InvocationHandler` 这类 JDK/框架类，属正常引用。**只有项目特有类名的缺失才是硬伤。**

## 二、确属硬伤 / 需修正（9 条）

| # | 文档写法 | 位置 | 源码实际 | 判定 | 修法 |
|---|---|---|---|---|---|
| 1 | `OrderCreateChainHandler` / `OrderCreateChainContext` / `OrderCreateChainFilter` | L10110 / L10176 / L10258 | 仓库中不存在（属券享购/其他项目示例） | **H3** 混用他项目 | 删除该示例，换成 onecoupon 的 `MerchantAdminAbstractChainHandler` + `MerchantAdminChainContext` |
| 2 | `RefreshCouponTaskDelayQueueRunner` | L1977 | 无此类。`RefreshCouponTaskDelayQueue` 是 `CouponTaskServiceImpl` 里的 **Redis key 常量**（L196/L208），兜底由消费者/定时任务完成 | **H1** 编造类名 | 改为「Redis 延迟队列 key + 消费者轮询兜底」，并指向 `CouponTaskServiceImpl#refreshCouponTaskSendNum`（已确认存在，L135/176/192/232） |
| 3 | `SnowflakeIdGenerator` | 雪花算法章节 | 无自定义生成器；代码用 hutool `IdUtil`（`CouponTaskServiceImpl:38`、`CouponExecuteDistributionConsumer:41`） | **H1** | 要么改写成「用 hutool `IdUtil.getSnowflakeNextId()`」，要么明确标注「此处是扩展设计，当前用 hutool 默认实现」 |
| 4 | `CouponTemplateCreateParamBizVerifyChainFilter` | L8669 | `CouponTemplateCreateParamVerifyChainFilter` | **H1** 近似（多写了 Biz） | 全局替换 |
| 5 | `CouponRemindDelayEvent` | L2682 | `CouponTemplateRemindDelayEvent` | **H1** 近似（少了 Template） | 全局替换 |
| 6 | `RedisKeyConstant` | 多处 | `MerchantAdminRedisConstant` / `EngineRedisConstant` / `DistributionRedisConstant` | **H1** 近似 | 按模块换成实际常量类 |
| 7 | `SeckillFeignService` | L9107 | 仓库中不存在（券享购） | **H3** | 删除，或标注「参照另一项目」 |
| 8 | `MyCacheConfig` | L9171 | 仓库中不存在 | **H3** | 删除 |
| 9 | `volatile-lfu`（Redis 淘汰策略） | 缓存章节 | 仓库中 0 处配置（属部署侧 Redis 配置） | **H4** 无出处 | 标注「部署配置，不在代码库」，并提供 `redis.conf`/Nacos 配置截图或说明 |

## 三、需人工复核（8 条，疑为简写或他项目）

| 文档写法 | 疑点 |
|---|---|
| `NotNullChainFilter` | 应为 `CouponTemplateCreateParamNotNullChainFilter` 的简写，需统一 |
| `SendMessageStrategy` | 源码无此类；相关是 `AbstractCommonSendProduceTemplate` + `DistributionStrategyChoose` |
| `IHandler` | 教学通用示例，需标注「示意」 |
| `SupportRejectedExecutionHandler` | 疑为 MyBatis 的 `RejectedExecutionHandler` 教学示例 |
| `RequestInterceptor` | OpenFeign 内置接口，属通用类，不算错 |
| `NacosNamingService` | Nacos SDK 类，属通用类 |
| `CommandLineRunner` | Spring 接口，属通用类 |
| `ThreadPoolExecutor` / `InvocationHandler` | JDK 类，属通用类 |

## 四、已确认存在（22 个，可放心写进讲解）

`CanalBinlogEvent`、`ChainBizMarkEnum`、`CouponExecuteDistributionConsumer`、`CouponExecuteSendMessageConsumer`、`CouponRemindTypeEnum`、`CouponSettlementDO`、`CouponTaskExecuteConsumer`、`CouponTaskExecuteEvent`、`CouponTaskJobHandler`、`CouponTemplateCreateParamBaseVerifyChainFilter`、`CouponTemplateCreateParamNotNullChainFilter`、`CouponTemplateDistributionEvent`、`CouponTemplateQueryRespDTO`、`DBShardingUtil`、`DistributionExecuteStrategy`、`MerchantAdminAbstractChainHandler`、`MerchantAdminChainContext`、`CouponTaskActualExecuteProducer`、`ReadExcelDistributionListener`、`CouponTemplateServiceImpl`、`CouponTaskServiceImpl`、`MerchantAdminApplication`

## 五、复核方式（可重复执行）

```bash
# 1. 建源码索引（缓存到 DHS_test/src-index.json）
python build-index.py

# 2. 抽取文档标识符并三态判定
python mismatch-scan.py     # 输出 命中 / 近似 / 缺失 + 章节 + 行号

# 3. 对「缺失」逐条 grep 源码确认，人工判 H1/H3
```

**判定原则**：以**源码为准**改文档，不以文档为准改源码；源码里没有的能力不写进满分表述，只写「评估过/没做/原因」。
