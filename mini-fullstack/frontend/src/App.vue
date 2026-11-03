<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from './stores/auth';

const auth = useAuth();
const route = useRoute();
const router = useRouter();

const isLogin = computed(() => route.path === '/login');

// access 被清空（refresh 也失效）时统一跳登录并带回跳地址：
// 否则用户会停在一个「看起来正常、但所有请求都 401」的页面上。
watch(
  () => auth.accessToken,
  (token) => {
    if (!token && !route.meta.public && route.path !== '/login') {
      router.replace({ path: '/login', query: { redirect: route.fullPath } });
    }
  }
);

async function onLogout() {
  await auth.logout();
  router.push({ path: '/login', query: { redirect: route.fullPath } });
}
</script>

<template>
  <header class="topbar">
    <div class="brand">mini-fullstack<span class="dot">·</span>登录 / 分页 / 上传</div>
    <div class="right">
      <span v-if="auth.name" class="who">{{ auth.name }}</span>
      <RouterLink to="/tasks" class="link">任务</RouterLink>
      <button v-if="!isLogin" class="btn ghost" @click="onLogout">退出</button>
    </div>
  </header>

  <main class="page">
    <RouterView />
  </main>
</template>