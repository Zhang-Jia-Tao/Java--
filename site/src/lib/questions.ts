import chaptersData from '../data/chapters.json';

const modules = import.meta.glob('../data/questions/*.json', { eager: true }) as Record<string, any>;

export function loadQuestions(): any[] {
  return Object.values(modules)
    .map((m: any) => (m && m.default ? m.default : m))
    .sort((a: any, b: any) => (a.id > b.id ? 1 : -1));
}

export function findChapter(key: string) {
  return (chaptersData as any[]).find((c: any) => c.key === key) ?? null;
}
