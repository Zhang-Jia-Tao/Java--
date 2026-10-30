import alias from '../data/intern/_alias.json';

export type InternDecision = { chose: string; whyNot: string; cost: string };
export type InternDefect = {
  title: string;
  symptom: string;
  trace: string;
  rootCause: string;
  fix: string;
  prevent: string;
  commits?: string[];
};
export type InternCommit = {
  repo: string;
  hash: string;
  date: string;
  subject: string;
  add?: number;
  del?: number;
};
export type InternTask = {
  id: string;
  seq: number;
  company: 'A' | 'B';
  project: 'spr' | 'menu' | 'export' | 'mail';
  title: string;
  branch?: string;
  dateRange: [string, string];
  nature: string;
  difficulty: number;
  oneLiner: string;
  requirement: { raw: string; why: string; acceptance: string[] };
  implementation: {
    services: { alias: string; repo: string; role: string }[];
    keyClasses: string[];
    flow: string[];
    decisions: InternDecision[];
  };
  defects: InternDefect[];
  metrics: { label: string; value: string }[];
  commits: InternCommit[];
  speak: { s60: string; s180: string; s600: string };
  followUps: { q: string; a: string }[];
  evidence?: string[];
};

const mods = import.meta.glob('/src/data/intern/tasks/*.json', { eager: true }) as Record<
  string,
  { default?: InternTask } & InternTask
>;

export const internTasks: InternTask[] = Object.values(mods)
  .map((m) => (m as any).default ?? m)
  .filter((t): t is InternTask => !!t && typeof t.id === 'string')
  .sort((a, b) => a.seq - b.seq);

export const companies = alias.companies as Record<
  'A' | 'B',
  { alias: string; full: string; role: string; period: string }
>;
export const projects = alias.projects as Record<
  string,
  { company: 'A' | 'B'; alias: string; desc: string }
>;
export const services = alias.services as Record<string, { alias: string; repo: string }>;

export const taskById = (id: string) => internTasks.find((t) => t.id === id);

export const tasksByProject = (project: string) => internTasks.filter((t) => t.project === project);

export const projectsOfCompany = (c: 'A' | 'B') =>
  Object.entries(projects)
    .filter(([, p]) => p.company === c)
    .map(([key, p]) => ({ key, ...p }));

/** 全部缺陷，附带来源任务，用于 /intern/defects 聚合 */
export const allDefects = internTasks.flatMap((t) =>
  t.defects.map((d, i) => ({ ...d, taskId: t.id, taskTitle: t.title, project: t.project, company: t.company, idx: i }))
);

/** 缺陷根因分类：按关键词归类，页面上按类讲「怎么识别这类问题」 */
export const defectKinds: { key: string; label: string; match: RegExp; hint: string }[] = [
  {
    key: 'contract',
    label: '格式契约类',
    match: /契约|协议|格式|兼容|解析|结构/,
    hint: '凡是跨越版本边界的数据结构（包格式、接口报文、缓存 value），先问「老解析器认不认识我新加的东西」；只增不改，新增内容必须能被安全忽略。'
  },
  {
    key: 'boundary',
    label: '边界语义类',
    match: /边界|段节点|叶子|非叶子|过滤|范围/,
    hint: '分类、过滤、权限这类逻辑，先问「这个维度对哪些对象无意义」。对无意义的那一类必须显式放行，否则修一处崩一处。'
  },
  {
    key: 'legacy',
    label: '存量数据类',
    match: /存量|null|历史|迁移|填充|兼容老数据/,
    hint: '加新字段一定伴随存量 null。要么读取时兜底，要么一次性回填；回填要拿权威来源，不能靠本地规则猜。'
  },
  {
    key: 'discipline',
    label: '工程纪律类',
    match: /漏提交|遗漏|全限定|规范|提交|遗漏文件/,
    hint: '上线前对一遍「编译产物 / 提交清单 / 打包内容」三份清单，别信脑子里的"就改了这几个文件"。'
  },
  {
    key: 'robust',
    label: '解析健壮性类',
    match: /表头|解析|空列|错位|编码|截断/,
    hint: '所有外部输入（Excel、CSV、第三方报文）都按「可能缺列、多列、乱序」设计，按名称映射而不是按下标。'
  },
  {
    key: 'perf',
    label: '性能与资源类',
    match: /超时|堆积|OOM|慢|阻塞|池|线程|内存/,
    hint: '先分清是能力不足还是等太久：能力看利用率，等太久看下游 RT 与排队长度，两者的处方完全相反。'
  }
];

export const defectKindOf = (d: { title: string; symptom: string; rootCause: string }) => {
  const text = `${d.title} ${d.symptom} ${d.rootCause}`;
  return defectKinds.find((k) => k.match.test(text)) ?? defectKinds[0];
};

/** 口播时长：汉字 4.3 字/秒 + 英文标识符 12 字符/秒 + 每段 0.6 秒停顿 */
export const speakStat = (text: string) => {
  const s = text || '';
  const cjk = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (s.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).join('').length;
  const paras = s.split(/\n+/).filter((x) => x.trim()).length;
  return { cjk, sec: Math.round(cjk / 4.3 + en / 12 + paras * 0.6), paras };
};

export const mmss = (sec: number) =>
  sec >= 60 ? `${Math.floor(sec / 60)} 分 ${String(sec % 60).padStart(2, '0')} 秒` : `${sec} 秒`;

export const stats = (() => {
  const totalCommits = internTasks.reduce((a, t) => a + t.commits.length, 0);
  const add = internTasks.reduce((a, t) => a + t.commits.reduce((x, c) => x + (c.add ?? 0), 0), 0);
  const del = internTasks.reduce((a, t) => a + t.commits.reduce((x, c) => x + (c.del ?? 0), 0), 0);
  const defectCount = allDefects.length;
  const repoSet = new Set(
    internTasks.flatMap((t) => t.commits.map((c) => c.repo)).filter((r) => r !== 'spr')
  );
  return {
    companies: 2,
    projects: Object.keys(projects).length,
    tasks: internTasks.length,
    commits: totalCommits,
    add,
    del,
    defects: defectCount,
    repos: repoSet.size
  };
})();
