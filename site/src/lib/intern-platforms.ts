import hipeiRaw from '../data/intern/platforms/hipei.json';
import hidoRaw from '../data/intern/platforms/hido.json';

export interface PlatformScale {
  label: string;
  value: string;
}

export interface PlatformDomain {
  name: string;
  desc: string;
  items: string[];
}

export interface PlatformRepo {
  alias: string;
  role: string;
  commits: string;
}

export interface PlatformModule {
  name: string;
  role: string;
}

export interface PlatformFeature {
  title: string;
  kind: string;
  period: string;
  service: string;
  taskId?: string;
  what: string;
  delivered: string;
  classes: string[];
  tables: string[];
  commits: string[];
}

/** 连接池条目有两种写法：配单平台按「键 = 值」列，平台按「服务 = 说明」列 */
export type PoolEntry = { k: string; v: string; note: string } | { service: string; detail: string };

export const isKeyedPool = (e: PoolEntry): e is { k: string; v: string; note: string } => 'k' in e;

export interface MiddlewareEntry {
  name: string;
  detail: string;
}

export interface ThreadPoolEntry {
  name: string;
  type: string;
  core: string;
  max: string;
  queue: string;
  keepAlive?: string;
  reject?: string;
  prefix?: string;
  note: string;
}

/** 连接池在各环境的实测值（来自配置中心，逐条读出而非推断） */
export interface DbPoolEnv {
  env: string;
  scope: string;
  max: string;
  min: string;
  idle: string;
  maxLifetime: string;
  connTimeout: string;
  note: string;
}

export interface RedisPoolEntry {
  service: string;
  total: string;
  maxIdle: string;
  minIdle: string;
  maxWait: string;
  source: string;
}

export interface PlatformConfig {
  /** 这套配置到底是「只有仓库一处真值」还是「仓库 + 配置中心两层」 */
  center?: string;
  intro: string;
  dbPool: {
    impl: string;
    where?: string;
    entries: PoolEntry[];
    /** 各环境实际生效值；没有配置中心的平台不给这块 */
    envs?: DbPoolEnv[];
    effective?: string;
  };
  redisPool?: {
    note: string;
    entries: RedisPoolEntry[];
  };
  middleware: MiddlewareEntry[];
  threadPools: ThreadPoolEntry[];
  traps: string[];
}

export interface Platform {
  key: string;
  company: string;
  alias: string;
  code: string;
  codeNote: string;
  tagline: string;
  period: string;
  oneLiner: string;
  purpose: string[];
  users: string[];
  scale: PlatformScale[];
  repos?: PlatformRepo[];
  modules?: PlatformModule[];
  domains: PlatformDomain[];
  chain: string[];
  features: PlatformFeature[];
  config: PlatformConfig;
}

export const platforms = [hipeiRaw, hidoRaw] as unknown as Platform[];

export const platformByKey = (key: string) => platforms.find((p) => p.key === key);

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const platformStats = {
  platforms: platforms.length,
  features: sum(platforms.map((p) => p.features.length)),
  requirements: sum(platforms.map((p) => p.features.filter((f) => f.kind.startsWith('需求')).length)),
  defects: sum(platforms.map((p) => p.features.filter((f) => f.kind.includes('缺陷')).length)),
  /** kind 可以同时标「需求 + 缺陷」，统计时要扣掉重复计的条数 */
  both: sum(platforms.map((p) => p.features.filter((f) => f.kind.startsWith('需求') && f.kind.includes('缺陷')).length)),
  repos: sum(platforms.map((p) => p.repos?.length ?? p.modules?.length ?? 1)),
  middleware: sum(platforms.map((p) => p.config.middleware.length)),
  threadPools: sum(platforms.map((p) => p.config.threadPools.length)),
  traps: sum(platforms.map((p) => p.config.traps.length)),
  commits: sum(
    platforms.map((p) => p.features.reduce((a, f) => a + f.commits.length, 0))
  )
};
