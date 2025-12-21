import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地 API 模拟插件
const localApiMock = () => ({
  name: 'local-api-mock',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      // 只拦截 /api 开头的 POST 请求
      if (!req.url.startsWith('/api/') || req.method !== 'POST') {
        return next();
      }

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          // --- 1. WebDAV Proxy ---
          if (req.url.startsWith('/api/webdav')) {
            const { endpoint, username, password, method = 'GET', data } = JSON.parse(body);
            
            // 伪装成 Chrome 浏览器
            const cleanHeaders = {
              'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*'
            };

            const response = await fetch(endpoint, {
              method,
              headers: cleanHeaders,
              body: method === 'PUT' ? JSON.stringify(data) : undefined
            });

            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            
            if (!response.ok) {
              res.end(JSON.stringify({ error: response.statusText }));
              return;
            }

            if (method === 'GET') {
              const json = await response.json();
              res.end(JSON.stringify(json));
            } else {
              res.end(JSON.stringify({ success: true }));
            }
            return;
          }

          // --- 2. Mock Gist API ---
          if (req.url.startsWith('/api/gist')) {
            console.log('[Mock API] /api/gist called');
            res.setHeader('Content-Type', 'application/json');
            // 返回一个假的 Gist ID 用于测试
            res.end(JSON.stringify({ id: 'mock-gist-id-12345', url: 'https://gist.github.com/mock' }));
            return;
          }

          // --- 3. Mock Update Repo API ---
          if (req.url.startsWith('/api/update-repo')) {
            console.log('[Mock API] /api/update-repo called');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
            return;
          }

          next();

        } catch (e) {
          console.error('Local Proxy Error:', e);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    });
  }
});

export default defineConfig({
  plugins: [react(), localApiMock()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3137
  }
})
