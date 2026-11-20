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
export type InternCode = {
  /** 这段代码解决的问题，一句话 */
  title: string;
  /** 仓库相对路径或类名.方法，作为出处 */
  ref: string;
  /** 语言标识，仅用于展示 */
  lang?: string;
  /** 源码可追溯性说明：真实提交原文 / 按设计重写，渲染在 ref 下方 */
  disclosure?: string;
  /** 核心代码原文（脱敏后），逐行保留缩进 */
  code: string;
  /** 逐行/逐块注释：为什么这么写，而不是另一种写法 */
  notes: { at: string; text: string }[];
  /** 这段代码容易被追问的点，答在代码旁边 */
  quiz: { q: string; a: string }[];
};
export type InternTask = {
  id: string;
  seq: number;
  company: 'A' | 'B';
  project: 'spr' | 'menu' | 'export' | 'mail' | 'hicoo';
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
  /** 核心代码讲解：一张卡 2–3 段，替代原先的三层口述稿 */
  code: InternCode[];
  followUps: { q: string; a: string }[];
  evidence?: string[];
  /** 缺陷为 0 的卡必须写明为什么没有典型坑（lint 强制） */
  noDefectNote?: string;
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

/** 口播时长：汉字 4.3 字/秒 + 英文标识符 12 字符/秒 + 每段 0.6 秒停顿
 * 口述稿下线后功能模块不再用它，但项目/题库侧仍按同一口径折算，留在这里当公共口径说明。 */
export const speakStat = (text: string) => {
  const s = text || '';
  const cjk = (s.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (s.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || []).join('').length;
  const paras = s.split(/\n+/).filter((x) => x.trim()).length;
  return { cjk, sec: Math.round(cjk / 4.3 + en / 12 + paras * 0.6), paras };
};

export const mmss = (sec: number) =>
  sec >= 60 ? `${Math.floor(sec / 60)} 分 ${String(sec % 60).padStart(2, '0')} 秒` : `${sec} 秒`;

/** 最小化的 Java/JS 关键字与类型着色：先转义再套标签，避免高亮把 HTML 结构破坏掉 */
const KW =
  /\b(public|private|protected|static|final|abstract|synchronized|volatile|transient|class|interface|enum|extends|implements|return|if|else|for|while|switch|case|default|break|continue|try|catch|finally|throw|throws|new|this|super|void|int|long|double|float|boolean|char|byte|short|null|true|false|const|let|var|await|async|function|import|package|override|Override|Autowired|Override)\b/g;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * 代码高亮：注释、字符串、关键字三类就够。
 * 顺序很重要——先把注释和字符串整段抽出来换成占位符，再处理关键字，
 * 否则字符串里的 public 也会被当成关键字染色。
 */
export const highlight = (code: string) => {
  const store: string[] = [];
  const keep = (html: string) => `\u0000${store.push(html) - 1}\u0000`;
  let s = esc(code || '');
  // 行注释与块注释
  s = s.replace(/\/\*[\s\S]*?\*\//g, (m) => keep(`<span class="tok-cmt">${m}</span>`));
  s = s.replace(/\/\/[^\n]*/g, (m) => keep(`<span class="tok-cmt">${m}</span>`));
  // 字符串（含双引号、单引号、@ 注解名）
  s = s.replace(/&quot;[^&\n]*?&quot;/g, (m) => keep(`<span class="tok-str">${m}</span>`));
  s = s.replace(/'[^'\n]*'/g, (m) => keep(`<span class="tok-str">${m}</span>`));
  // 关键字
  s = s.replace(KW, (m) => `<span class="tok-kw">${m}</span>`);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => store[Number(i)]);
};

/** 代码卡片的行数统计，用于页面显示「多少行核心代码」 */
export const codeLines = (c: InternCode) => (c.code || '').split('\n').length;

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
