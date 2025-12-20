export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, description } = req.body;
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return res.status(500).json({ error: 'Missing GITHUB_TOKEN' });
  }

  try {
    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Boxy-App'
      },
      body: JSON.stringify({
        description: description || 'Boxy Share',
        public: false, // 默认创建私有 Gist (只有链接能访问)
        files: {
          'boxy_data.json': {
            content: content
          }
        }
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message);
    }

    const data = await response.json();
    return res.status(200).json({ id: data.id, url: data.html_url });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
