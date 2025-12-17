import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 本地 WebDAV 代理插件：拦截 /api/webdav 请求，用 Node.js 转发，绕过浏览器 CORS
const localWebDavProxy = () => ({
  name: 'local-webdav-proxy',
  configureServer(server) {
    server.middlewares.use('/api/webdav', async (req, res, next) => {
      if (req.method !== 'POST') return next();

      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { endpoint, username, password, method = 'GET', data } = JSON.parse(body);
          
          // 在 Node 环境下发起请求
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
  plugins: [react(), localWebDavProxy()],
  server: {
    port: 3137
  }
})