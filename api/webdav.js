// api/webdav.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, username, password, method = 'GET', data, destination } = req.body;

  if (!endpoint || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const headers = {
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      // 关键修复：添加 User-Agent，防止被 TeraCloud 等防火墙拦截
      'User-Agent': 'Boxy-WebDAV-Client/1.0',
    };

    // COPY 方法必须包含 Destination 头
    if (destination) {
      headers['Destination'] = destination;
      headers['Overwrite'] = 'T';
    }

    let body;
    if (method === 'PUT') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    } else if (method === 'PROPFIND') {
      headers['Depth'] = '1';
      // 注意：PROPFIND 不发送 Content-Type，除非有 body
    }
    // COPY, GET, DELETE, MKCOL 通常不需要 Content-Type 和 Body

    const options = { method, headers, body };
    
    // 调试日志 (服务端控制台可见)
    // console.log(`[Proxy] ${method} ${endpoint}`, destination ? `-> ${destination}` : '');

    const response = await fetch(endpoint, options);
    const responseText = await response.text();
    
    if (!response.ok) {
      // 尝试返回更详细的上游错误信息
      try {
        const errorJson = JSON.parse(responseText);
        return res.status(response.status).json(errorJson);
      } catch (e) {
        return res.status(response.status).json({ 
          error: response.statusText, 
          details: responseText.substring(0, 200) // 截取部分错误详情
        });
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        return res.status(200).json(JSON.parse(responseText));
      } catch (e) {
        return res.status(200).json({});
      }
    } else {
      return res.status(200).send(responseText);
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
