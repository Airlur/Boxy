// api/webdav.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, username, password, method = 'GET', data } = req.body;

  if (!endpoint || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const headers = {
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64'),
      'Content-Type': 'application/json'
    };

    const options = {
      method,
      headers,
      body: method === 'PUT' ? JSON.stringify(data) : undefined,
    };

    const response = await fetch(endpoint, options);

    if (!response.ok) {
      // 透传上游 WebDAV 的错误状态码
      return res.status(response.status).json({ error: response.statusText });
    }

    if (method === 'GET') {
      const json = await response.json();
      return res.status(200).json(json);
    } else {
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}