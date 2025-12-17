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
          const response = await fetch(endpoint, {
            method,
            headers: {
              'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
              'Content-Type': 'application/json'
            },
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
})