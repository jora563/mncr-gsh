import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

// Получаем абсолютный путь к директории, где лежит vite.config.js
// Это стандартный и надежный способ замены __dirname в ESM модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  // Загружаем переменные окружения из .env файлов в директории проекта
  // Пустая строка '' в качестве третьего аргумента означает, что мы хотим 
  // загрузить ВСЕ переменные, а не только те, что начинаются с VITE_
  const env = loadEnv(mode, __dirname, '');
  
  const target = env.VITE_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/v1': { target, changeOrigin: true },
        '/health': { target, changeOrigin: true },
      },
    },
  };
});
