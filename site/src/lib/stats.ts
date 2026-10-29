/**
 * 全站评分口径：把 Java 58 题、项目 70 题、AI 38 题合成一份统计。
 * 只做聚合，不改任何单题分数（单题分在各自 JSON 里）。
 */
import { loadQuestions } from './questions';
import { aiModules, aiQuestions, dbModules, dbQuestions, mwModules, mwQuestions, projectModules, projectOnlyQuestions } from './project';
import chaptersData from '../data/chapters.json';

export type Band = { key: string; label: string; hint: string; min: number; max: number; count: number };
export type ModuleRow = {
  key: string;
  name: string;
  group: 'java' | 'project' | 'db' | 'mw' | 'ai';
  href: string;
  count: number;
  avg: number;
  min: number;
  max: number;
};

type Item = {
  id: string;
  title: string;
  group: 'java' | 'project' | 'db' | 'mw' | 'ai';
  moduleKey: string;
  moduleName: string;
  href: string;
  total: number;
  hardErrors: { level: number; wrong: string; right: string; note?: string }[];
};

const bandDefs = [
  { key: 'great', label: '90+', hint: '可直接拿去面', min: 90, max: 100 },
  { key: 'good', label: '85–89', hint: '小改就能上台', min: 85, max: 89 },
  { key: 'pass', label: '78–84', hint: '要补一两块', min: 78, max: 84 },
  { key: 'weak', label: '<78', hint: '先别背，先补', min: 0, max: 77 }
];

function javaHref(q: any) {
  return `/notes/${q.chapter}/${q.id}`;
}
function projHref(q: any) {
  return `/${q.module === 'foundation' || q.module === 'ragent' || q.module === 'eval' ? 'ai' : 'project'}/${projectModules.find((m) => m.key === q.module)?.en ?? q.module}/${q.id}`;
}

const items: Item[] = [];
for (const q of loadQuestions()) {
  items.push({
    id: q.id,
    title: q.title,
    group: 'java',
    moduleKey: q.chapter,
    moduleName: q.chapterName,
    href: javaHref(q),
    total: q.score?.total ?? 0,
    hardErrors: q.hardErrors ?? []
  });
}
const aiKeys = new Set(aiModules.map((m) => m.key));
const mwKeys = new Set(mwModules.map((m) => m.key));
const dbKeys = new Set(dbModules.map((m) => m.key));
for (const q of [...projectOnlyQuestions, ...aiQuestions, ...dbQuestions, ...mwQuestions]) {
  const mod = projectModules.find((m) => m.key === q.module);
  items.push({
    id: q.id,
    title: q.title,
    group: dbKeys.has(q.module) ? 'db' : mwKeys.has(q.module) ? 'mw' : aiKeys.has(q.module) ? 'ai' : 'project',
    moduleKey: q.module,
    moduleName: mod?.cn ?? q.module,
    href: projHref(q),
    total: q.review?.total ?? 0,
    hardErrors: q.review?.hardErrors ?? []
  });
}

const scored = items.filter((x) => x.total > 0);
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
const avg = (arr: number[]) => (arr.length ? Math.round((sum(arr) / arr.length) * 10) / 10 : 0);

export const bands: Band[] = bandDefs.map((b) => ({
  ...b,
  count: scored.filter((x) => x.total >= b.min && x.total <= b.max).length
}));

const javaItems = items.filter((x) => x.group === 'java');
const mwItems = items.filter((x) => x.group === 'mw');
const dbItems = items.filter((x) => x.group === 'db');
const projectItems = items.filter((x) => x.group === 'project');
const aiItems = items.filter((x) => x.group === 'ai');

const javaModules: ModuleRow[] = (chaptersData as any[]).map((c: any) => {
  const arr = javaItems.filter((x) => x.moduleKey === c.key);
  return {
    key: c.key,
    name: c.name,
    group: 'java',
    href: `/notes/${c.key}`,
    count: arr.length,
    avg: avg(arr.map((x) => x.total)),
    min: Math.min(...arr.map((x) => x.total)),
    max: Math.max(...arr.map((x) => x.total))
  };
});
const projModules: ModuleRow[] = projectModules
  .filter((m) => !aiKeys.has(m.key))
  .map((m) => {
    const arr = projectItems.filter((x) => x.moduleKey === m.key);
    return {
      key: m.key,
      name: m.cn,
      group: 'project' as const,
      href: `/project/${m.en}`,
      count: arr.length,
      avg: avg(arr.map((x) => x.total)),
      min: Math.min(...arr.map((x) => x.total)),
      max: Math.max(...arr.map((x) => x.total))
    };
  });
const aiModuleRows: ModuleRow[] = aiModules.map((m) => {
  const arr = aiItems.filter((x) => x.moduleKey === m.key);
  return {
    key: m.key,
    name: m.cn,
    group: 'ai' as const,
    href: `/ai/${m.en}`,
    count: arr.length,
    avg: avg(arr.map((x) => x.total)),
    min: Math.min(...arr.map((x) => x.total)),
    max: Math.max(...arr.map((x) => x.total))
  };
});

const mwModuleRows: ModuleRow[] = mwModules.map((m) => {
  const arr = mwItems.filter((x) => x.moduleKey === m.key);
  const sc = arr.filter((x) => x.total > 0);
  return {
    key: m.key,
    name: m.name,
    group: 'mw' as const,
    href: `/mw/${m.en}`,
    count: arr.length,
    avg: avg(sc.map((x) => x.total)),
    min: sc.length ? Math.min(...sc.map((x) => x.total)) : 0,
    max: sc.length ? Math.max(...sc.map((x) => x.total)) : 0
  };
});

const dbModuleRows: ModuleRow[] = dbModules.map((m) => {
  const arr = dbItems.filter((x) => x.moduleKey === m.key);
  const sc = arr.filter((x) => x.total > 0);
  return {
    key: m.key,
    name: m.name,
    group: 'db' as const,
    href: '/mysql',
    count: arr.length,
    avg: avg(sc.map((x) => x.total)),
    min: sc.length ? Math.min(...sc.map((x) => x.total)) : 0,
    max: sc.length ? Math.max(...sc.map((x) => x.total)) : 0
  };
});

export const moduleRows = [...javaModules, ...projModules, ...dbModuleRows, ...aiModuleRows, ...mwModuleRows];

const hardErrors = items.flatMap((x) =>
  x.hardErrors.map((e) => ({ ...e, id: x.id, title: x.title, group: x.group, moduleName: x.moduleName, href: x.href }))
);

const worst = [...scored].sort((a, b) => a.total - b.total).slice(0, 6);

export const stats = {
  total: items.length,
  scored: scored.length,
  avg: avg(scored.map((x) => x.total)),
  bands,
  hardErrors: hardErrors.length,
  hardByLevel: [1, 2, 3].map((lv) => hardErrors.filter((e) => e.level === lv).length),
  java: { count: javaItems.length, avg: avg(javaItems.map((x) => x.total)) },
  project: { count: projectItems.length, avg: avg(projectItems.map((x) => x.total)) },
  db: { count: dbItems.length, avg: avg(dbItems.map((x) => x.total)), scored: dbItems.filter((x) => x.total > 0).length },
  ai: { count: aiItems.length, avg: avg(aiItems.map((x) => x.total)) },
  mw: { count: mwItems.length, avg: avg(mwItems.map((x) => x.total)), scored: mwItems.filter((x) => x.total > 0).length },
  moduleRows,
  items,
  hardErrorsAll: hardErrors,
  worst,
  best: [...scored].sort((a, b) => b.total - a.total).slice(0, 6)
};
