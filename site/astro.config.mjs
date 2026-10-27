import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'http://localhost:4321',
  server: { port: 4321, host: true },
  vite: {
    plugins: [tailwindcss()]
  }
});
