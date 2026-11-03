import type { APIRoute } from 'astro';
import { allProjectQuestions } from '../../lib/project';

/**
 * /project/find 的「正文分片」。
 *
 * 之前这 355 题的正文（要点 / 坑 / 代码锚点 / 指标）直接内联进 find 页面的 JSON，
 * 页面 gzip 到 190KB，首屏只为搜索准备数据。现在拆成静态 JSON：
 * 首包只留标题 + 一句话 + 关键词，用户第一次输入才拉这个文件。
 */
export const GET: APIRoute = () => {
  const body: Record<string, string> = {};
  for (const q of allProjectQuestions) {
    body[q.id] = [
      q.points.map((p) => p.point).join(' '),
      (q.pitfalls ?? []).join(' '),
      (q.codeAnchors ?? []).map((a) => `${a.file} ${a.symbol}`).join(' '),
      (q.metrics ?? []).map((m) => `${m.k} ${m.v}`).join(' ')
    ].join(' ');
  }
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
};
