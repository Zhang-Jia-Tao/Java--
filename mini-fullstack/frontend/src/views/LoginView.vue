<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';
import { errorText } from '../api/http';

const auth = useAuth();
const router = useRouter();
const route = useRoute();

const username = ref('demo');
const password = ref('123456');
const loading = ref(false);
const err = ref('');

async function submit() {
  if (!username.value || !password.value) {
    err.value = '账号和密码都要填';
    return;
  }
  loading.value = true;
  err.value = '';
  try {
    await auth.login(username.value.trim(), password.value);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/tasks';
    router.replace(redirect);
  } catch (e) {
    err.value = errorText(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="card" style="max-width: 360px; margin: 48px auto">
    <h1 style="font-size: 16px; margin: 0 0 4px">登录</h1>
    <p class="tip" style="margin: 0 0 16px">演示账号 demo / 123456</p>

    <form @submit.prevent="submit">
      <div class="field">
        <label for="u">账号</label>
        <input id="u" v-model="username" type="text" autocomplete="username" />
      </div>
      <div class="field">
        <label for="p">密码</label>
        <input id="p" v-model="password" type="password" autocomplete="current-password" />
      </div>
      <p v-if="err" class="err">{{ err }}</p>
      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? '登录中…' : '登录' }}
      </button>
    </form>

    <p class="tip" style="margin-top: 14px">
      密码错误会返回 40103；账号不存在也走同一套耗时，避免被用来试探账号。
    </p>
  </div>
</template>
