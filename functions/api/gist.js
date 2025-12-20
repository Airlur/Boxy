export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { content, description } = await request.json();
    const token = env.GITHUB_TOKEN;

    if (!token) {
        return new Response(JSON.stringify({ error: 'Missing GITHUB_TOKEN' }), { status: 500 });
    }

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Boxy-App'
      },
      body: JSON.stringify({
        description: description || 'Boxy Share',
        public: false,
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
    
    return new Response(JSON.stringify({ id: data.id, url: data.html_url }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
