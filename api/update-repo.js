export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, message, password } = req.body;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!token || !repo || !adminPass) {
    return res.status(500).json({ error: 'Server configuration error: Missing env vars' });
  }

  if (password !== adminPass) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
  }

  try {
    // 1. Get current file SHA (required for update)
    const filePath = 'src/data/initialData.json';
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    
    const getRes = await fetch(apiUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Boxy-Admin'
      }
    });

    if (!getRes.ok) {
        throw new Error(`Failed to fetch file info: ${getRes.statusText}`);
    }

    const fileData = await getRes.json();
    const sha = fileData.sha;

    // 2. Update file
    // Content must be base64 encoded
    const contentBase64 = Buffer.from(content).toString('base64');

    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Boxy-Admin'
      },
      body: JSON.stringify({
        message: message || 'chore: update initial data via admin panel',
        content: contentBase64,
        sha: sha
      })
    });

    if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(`GitHub API Error: ${err.message || updateRes.statusText}`);
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Update Repo Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
