import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, TokenRes } from '../types/api';

/**
 * 请求层：整个项目关于 token 的逻辑都在这个文件里。
 *
 * 两个关键点：
 * 1) access 只放内存（变量里），不落 localStorage —— XSS 拿不到；
 * 2) 401 时并发单飞刷新：refreshing 未完成前所有请求共用一个 Promise，
 *    否则 5 个并发 401 会触发 5 次 refresh，在轮换机制下前 4 次立刻失效，用户被踢。
 */

export const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true // refresh 在 httpOnly Cookie 里，同域请求要带上
});

let accessToken: string | null = null;

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  }
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshing: Promise<string | null> | null = null;
let onSessionLost: () => void = () => {};

/** 刷新失败时由 store 注册回调，用来跳登录页并记住回跳地址 */
export function setSessionLostHandler(fn: () => void) {
  onSessionLost = fn;
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = axios
      .post<ApiResponse<TokenRes>>('/api/auth/refresh', null, { withCredentials: true })
      .then((res) => {
        const token = res.data?.data?.accessToken ?? null;
        tokenStore.set(token);
        return token;
      })
      .catch(() => {
        tokenStore.set(null);
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = config?.url ?? '';

    // 登录/刷新接口自身 401 不重试，否则会无限递归
    if (status === 401 && config && !config._retry && !url.includes('/auth/')) {
      config._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return http.request(config);
      }
      onSessionLost();
    }
    return Promise.reject(error);
  }
);

/** 统一把后端 {code,msg} 或网络错误转成人能读的一句话 */
export function errorText(error: unknown): string {
  const e = error as AxiosError<ApiResponse<unknown>>;
  if (e?.response?.data?.msg) {
    return e.response.data.msg;
  }
  if (e?.code === 'ECONNABORTED') {
    return '请求超时，检查后端是否在跑';
  }
  if (e?.message === 'Network Error') {
    return '连不上后端（8080），确认服务已启动';
  }
  return '请求失败，请重试';
}
