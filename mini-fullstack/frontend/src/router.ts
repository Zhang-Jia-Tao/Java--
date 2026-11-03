import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/tasks' },
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('./views/TaskListView.vue')
    },
    // SPA 兜底：Nginx 会把未知路径回落到 index.html，前端这里再兜一次
    { path: '/:pathMatch(.*)*', redirect: '/tasks' }
  ]
});

// 守卫只看内存里的 accessToken。
// main.ts 会在 mount 之前先跑一次 bootstrap()（用 refresh Cookie 换 access），
// 所以这里判断时 token 已经是最新状态：能换到就放行，换不到就带 redirect 去登录。
router.beforeEach((to) => {
  const auth = useAuth();
  if (!to.meta.public && !auth.accessToken) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  return true;
});
