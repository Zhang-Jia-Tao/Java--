/**
 * 规范路径（canonical）
 *
 * 站里同一道题/同一篇原文存在两条 URL：
 *   /mysql/mysql-02   ←→  /project/mysql/mysql-02
 *   /train/javax/jx-01 ←→  /project/javax/jx-01
 *   /ai/foundation/ai-01 ←→ /project/foundation/ai-01
 * HTML 内容只差面包屑，但批注是按键路径存的，不归一就会「在这条 URL 标的注，换条 URL 看不见」。
 *
 * 规则：模块专区（/mysql /mw /ai /train）是规范地址，/project 下的是镜像。
 */
const docFiles = import.meta.glob<{ id: string; module: string }>('../data/doc/*.json', { eager: true, import: 'default' });
import { AI_MODULE_KEYS, MW_MODULE_KEYS, TRAIN_MODULE_KEYS, projectModules } from './project';

const enByKey = new Map(projectModules.map((m) => [m.key, m.en] as const));
const keyByEn = new Map(projectModules.map((m) => [m.en, m.key] as const));

const isMw = (k: string) => (MW_MODULE_KEYS as readonly string[]).includes(k);
const isAi = (k: string) => (AI_MODULE_KEYS as readonly string[]).includes(k);
const isTrain = (k: string) => (TRAIN_MODULE_KEYS as readonly string[]).includes(k);

/** 题目规范路径 */
export function canonicalQuestionPath(moduleKey: string, id: string): string {
  const en = enByKey.get(moduleKey) ?? moduleKey;
  if (moduleKey === 'mysql') return `/mysql/${id}`;
  if (isMw(moduleKey)) return `/mw/${en}/${id}`;
  if (isAi(moduleKey)) return `/ai/${en}/${id}`;
  if (isTrain(moduleKey)) return `/train/${en}/${id}`;
  return `/project/${en}/${id}`;
}

/** 原文（阅读页）规范路径 */
export function canonicalDocPath(moduleKey: string, id: string): string {
  if (moduleKey === 'mysql') return `/mysql/read/${id}`;
  if (isMw(moduleKey)) return `/mw/read/${id}`;
  if (isAi(moduleKey)) return `/ai/read/${id}`;
  return `/project/read/${id}`;
}

/** 文档 id → 模块（用于把镜像文档页映射回去） */
const docModuleById = new Map<string, string>();
for (const d of Object.values(docFiles) as { id: string; module: string }[]) {
  if (d?.id) docModuleById.set(d.id, d.module);
}

/** 任意站内路径 → 规范路径；不认识的路径原样返回 */
export function canonicalPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  const m = path.match(/^\/project\/([^/]+)\/([^/]+)$/);
  if (m) {
    const [, en, id] = m;
    if (en === 'read') {
      const mod = docModuleById.get(id);
      return mod ? canonicalDocPath(mod, id) : path;
    }
    const key = keyByEn.get(en);
    return key ? canonicalQuestionPath(key, id) : path;
  }
  return path;
}

/** 同一内容的其它路径（用于批注读旧数据） */
export function aliasPaths(pathname: string): string[] {
  const canon = canonicalPath(pathname);
  const raw = pathname.replace(/\/+$/, '') || '/';
  const out = new Set<string>();
  if (canon !== raw) out.add(raw);

  // 题目镜像：/mysql/{id} ↔ /project/mysql/{id}；/mw|ai|train/{en}/{id} ↔ /project/{en}/{id}
  const db = canon.match(/^\/mysql\/([^/]+)$/);
  if (db) out.add(`/project/mysql/${db[1]}`);
  const mod = canon.match(/^\/(?:mw|ai|train)\/([^/]+)\/([^/]+)$/);
  if (mod) out.add(`/project/${mod[1]}/${mod[2]}`);

  // 文档镜像：/{mysql|mw|ai}/read/{id} ↔ /project/read/{id}
  const doc = canon.match(/^\/(?:mysql|mw|ai)\/read\/([^/]+)$/);
  if (doc) out.add(`/project/read/${doc[1]}`);

  return [...out].filter((p) => p && p !== canon);
}
