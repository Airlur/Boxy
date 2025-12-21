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
            const { endpoint, username, password, method = 'GET', data, destination } = JSON.parse(body);
            
            const headers = {
              'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
              'User-Agent': 'Boxy-WebDAV-Client/1.0', // Align with production
            };

            // Forward critical WebDAV headers
            if (method === 'PROPFIND') headers['Depth'] = '1';
            if (destination) {
              headers['Destination'] = destination;
              headers['Overwrite'] = 'T';
            }
            if (method === 'PUT') headers['Content-Type'] = 'application/json';

            const response = await fetch(endpoint, {
              method,
              headers,
              body: method === 'PUT' ? JSON.stringify(data) : undefined
            });

            res.statusCode = response.status;
            
            // Handle content type
            const contentType = response.headers.get('content-type') || '';
            res.setHeader('Content-Type', contentType.includes('application/json') ? 'application/json' : 'text/plain');

            if (!response.ok) {
              // Try to read error body
              const errText = await response.text();
              let errJson;
              try { errJson = JSON.parse(errText); } catch(e) {}
              
              res.end(JSON.stringify(errJson || { error: response.statusText, details: errText }));
              return;
            }

            // Return body based on content type
            const text = await response.text();
            if (contentType.includes('application/json')) {
              res.end(text);
            } else {
              // For PROPFIND (XML) or others, return raw text but wrapped in JSON if client expects it?
              // The client (useWebDAV) expects: result.json OR result.text
              // So we just send raw body, and client fetch handles it?
              // No, the client calls fetch('/api/webdav'). 
              // If we send raw XML, client res.json() will fail if it expects JSON wrapper.
              // useWebDAV.js: const contentType = res.headers.get('content-type'); if (json) ... else result.text = await res.text();
              // So we can just send the raw text from upstream.
              res.end(text);
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
