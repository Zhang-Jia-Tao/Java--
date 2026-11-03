import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuth } from './stores/auth';
import './style.css';

const app = createApp(App);
app.use(createPinia());

// 先尝试用 refresh Cookie 静默换一次 access，再挂载路由：
// 否则硬刷新会被守卫误判成未登录，直接踢到登录页。
useAuth()
  .bootstrap()
  .finally(() => {
    app.use(router).mount('#app');
  });
