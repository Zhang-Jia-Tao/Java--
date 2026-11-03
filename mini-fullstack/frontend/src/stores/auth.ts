import { defineStore } from 'pinia';
import { ref } from 'vue';
import { http, refreshAccessToken, setSessionLostHandler, tokenStore } from '../api/http';
import type { ApiResponse, TokenRes } from '../types/api';

export const useAuth = defineStore('auth', () => {
  const name = ref<string>('');
  const accessToken = ref<string | null>(null);
  const bootstrapped = ref(false);

  function apply(token: string | null, username?: string) {
    tokenStore.set(token);
    accessToken.value = token;
    if (username) {
      name.value = username;
    }
  }

  /** 登录：拿到 access（内存）+ 后端设置的 refresh Cookie */
  async function login(username: string, password: string) {
    const res = await http.post<ApiResponse<TokenRes>>('/auth/login', { username, password });
    const data = res.data.data;
    apply(data.accessToken, data.name);
    return data;
  }

  /** 硬刷新页面后调用：用 Cookie 里的 refresh 换一次 access，失败就当未登录 */
  async function bootstrap() {
    if (bootstrapped.value) {
      return;
    }
    bootstrapped.value = true;
    const token = await refreshAccessToken();
    if (token) {
      accessToken.value = token;
    }
  }

  async function logout() {
    try {
      await http.post('/auth/logout');
    } catch {
      // 网络挂了也要把本地状态清掉
    }
    apply(null);
    name.value = '';
  }

  // 请求层刷新失败时回调：清状态，路由层再决定跳哪
  setSessionLostHandler(() => {
    apply(null);
    name.value = '';
  });

  return { name, accessToken, bootstrapped, login, bootstrap, logout };
});
