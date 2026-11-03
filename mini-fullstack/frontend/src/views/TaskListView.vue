<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { http, errorText } from '../api/http';
import type { ApiResponse, PageRes, TaskDto, TaskStatus } from '../types/api';
import UploadButton from '../components/UploadButton.vue';

/**
 * 列表页：查询条件放在 URL 里（page / kw），所以刷新、复制链接、后退全都能复现同一屏。
 * 每次请求带 AbortController，新请求发出时取消旧的，避免慢响应覆盖新结果。
 */

const route = useRoute();
const router = useRouter();

const list = ref<TaskDto[]>([]);
const total = ref(0);
const loading = ref(false);
const err = ref('');
const newTitle = ref('');
const kwInput = ref('');

let controller: AbortController | null = null;
let debounceTimer: number | undefined;

const page = computed(() => {
  const p = Number(route.query.page ?? 1);
  return Number.isFinite(p) && p >= 1 ? Math.floor(p) : 1;
});
const kw = computed(() => (typeof route.query.kw === 'string' ? route.query.kw : ''));
const size = 10;
const totalPages = computed(() => Math.max(Math.ceil(total.value / size), 1));

async function load() {
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  err.value = '';
  try {
    const res = await http.get<ApiResponse<PageRes<TaskDto>>>('/tasks', {
      params: { page: page.value, size, kw: kw.value || undefined },
      signal: controller.signal
    });
    list.value = res.data.data.list;
    total.value = res.data.data.total;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === 'CanceledError' || name === 'AbortError') {
      return; // 被新请求取消，不是错误
    }
    err.value = errorText(e);
  } finally {
    loading.value = false;
  }
}

function syncQuery(patch: Record<string, string | number | undefined>) {
  const next: Record<string, string> = {};
  const merged = { page: page.value, kw: kw.value, ...patch };
  if (Number(merged.page) > 1) {
    next.page = String(merged.page);
  }
  if (merged.kw) {
    next.kw = String(merged.kw);
  }
  router.replace({ path: '/tasks', query: next });
}

function onSearch() {
  window.clearTimeout(debounceTimer);
  // 300ms 防抖：输入过程中不发请求，停下才发
  debounceTimer = window.setTimeout(() => syncQuery({ page: 1, kw: kwInput.value.trim() }), 300);
}

function goto(p: number) {
  syncQuery({ page: Math.min(Math.max(p, 1), totalPages.value) });
}

async function createTask() {
  const title = newTitle.value.trim();
  if (!title) {
    return;
  }
  try {
    await http.post('/tasks', { title });
    newTitle.value = '';
    syncQuery({ page: 1 });
    await load();
  } catch (e) {
    err.value = errorText(e);
  }
}

async function cycleStatus(t: TaskDto) {
  const next: Record<TaskDto['status'], TaskStatus> = { TODO: 'DOING', DOING: 'DONE', DONE: 'TODO' };
  const target = next[t.status];
  try {
    await http.put(`/tasks/${t.id}/status`, { status: target });
    t.status = target;
  } catch (e) {
    err.value = errorText(e);
  }
}

async function remove(t: TaskDto) {
  if (!window.confirm(`删除「${t.title}」？`)) {
    return;
  }
  try {
    await http.delete(`/tasks/${t.id}`);
    await load();
  } catch (e) {
    err.value = errorText(e);
  }
}

watch(
  () => [route.query.page, route.query.kw],
  () => {
    load();
  },
  { immediate: true }
);

watch(
  kw,
  (v) => {
    kwInput.value = v;
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.clearTimeout(debounceTimer);
  controller?.abort();
});
</script>

<template>
  <div class="card">
    <div class="row" style="margin-bottom: 12px">
      <input
        v-model="kwInput"
        type="text"
        placeholder="按标题搜索（输入即过滤，条件会写进 URL）"
        style="flex: 1; min-width: 200px"
        @input="onSearch"
      />
      <UploadButton />
    </div>

    <div class="row" style="margin-bottom: 12px">
      <input v-model="newTitle" type="text" placeholder="新任务标题" style="flex: 1" @keyup.enter="createTask" />
      <button class="btn" @click="createTask">添加</button>
    </div>

    <p v-if="err" class="err">{{ err }}</p>

    <table>
      <thead>
        <tr>
          <th style="width: 52px">#</th>
          <th>标题</th>
          <th style="width: 80px">状态</th>
          <th style="width: 130px">创建时间</th>
          <th style="width: 60px"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in list" :key="t.id">
          <td>{{ t.id }}</td>
          <td>{{ t.title }}</td>
          <td>
            <button class="tag" :class="t.status" style="cursor: pointer" @click="cycleStatus(t)">
              {{ t.status }}
            </button>
          </td>
          <td>{{ t.createdAt.slice(0, 16).replace('T', ' ') }}</td>
          <td>
            <button class="tag" style="cursor: pointer" @click="remove(t)">删</button>
          </td>
        </tr>
        <tr v-if="!list.length && !loading">
          <td colspan="5" class="tip" style="text-align: center; padding: 24px">
            没有数据{{ kw ? `（关键词：${kw}）` : '' }}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pager">
      <button class="btn ghost" :disabled="page <= 1 || loading" @click="goto(page - 1)">上一页</button>
      <span>{{ page }} / {{ totalPages }} · 共 {{ total }} 条</span>
      <button class="btn ghost" :disabled="page >= totalPages || loading" @click="goto(page + 1)">下一页</button>
      <span class="spacer"></span>
      <span v-if="loading" class="tip">加载中…</span>
    </div>
  </div>
</template>
