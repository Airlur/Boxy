export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { content, message, password } = await request.json();
    const token = env.GITHUB_TOKEN;
    const repo = env.GITHUB_REPO;
    const adminPass = env.ADMIN_PASSWORD;

    if (!token || !repo || !adminPass) {
        return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
    }

    if (password !== adminPass) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const filePath = 'src/data/initialData.json';
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Boxy-Admin'
    };

    // 1. Get SHA
    const getRes = await fetch(apiUrl, { headers });
    if (!getRes.ok) throw new Error(`Failed to fetch file info: ${getRes.statusText}`);
    
    const fileData = await getRes.json();
    
    // 2. Update
    // Edge Runtime btoa for base64 (handle unicode)
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    let binary = '';
    const len = data.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(data[i]);
    }
    const contentBase64 = btoa(binary);

    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: message || 'chore: update initial data via admin panel',
        content: contentBase64,
        sha: fileData.sha
      })
    });

    if (!updateRes.ok) {
        const err = await updateRes.json();
        throw new Error(`GitHub API Error: ${err.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
