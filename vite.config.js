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
        // ws: true — без этого Vite не проксирует WebSocket-апгрейды.
        // Браузер не может послать Authorization при WS-handshake, поэтому
        // фронтенд шлёт токен в ?token=, а прокси перекладывает его в заголовок.
        '/v1': {
          target,
          changeOrigin: true,
          ws: true,
          configure: (proxy) => {
            proxy.on('proxyReqWs', (proxyReq, req) => {
              const token = new URL(req.url, 'http://localhost').searchParams.get('token');
              if (token) {
                proxyReq.setHeader('Authorization', `Bearer ${token}`);
              }
            });
          },
        },
        '/health': { target, changeOrigin: true },
      },
    },
  };
});
