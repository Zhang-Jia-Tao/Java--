import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 开发期用代理把 /api 与 /uploads 转到后端：浏览器眼里只有一个源，CORS 问题从根上消失。
export default defineConfig({
  plugins: [vue()],
  server: {
    // 固定 IPv4：Windows 上默认可能只绑 ::1，脚本用 127.0.0.1 探活会误判'没起来'
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: false // 同域转发，Cookie 的 Domain/Path 保持不变
      }
    }
  },
  build: {
    // 把第三方依赖单独拆出来：业务代码改动时用户不用重下 vue/axios
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', 'axios']
        }
      }
    }
  }
});
