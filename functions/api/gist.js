export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { content, description, token: turnstileToken } = await request.json();
    const githubToken = env.GITHUB_TOKEN;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;

    if (!githubToken || !turnstileSecret) {
        return new Response(JSON.stringify({ error: 'Server config error' }), { status: 500 });
    }

    // Verify Turnstile
    if (!turnstileToken) {
        return new Response(JSON.stringify({ error: 'Missing captcha token' }), { status: 403 });
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            secret: turnstileSecret,
            response: turnstileToken
        })
    });
    
    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
        return new Response(JSON.stringify({ error: 'Captcha verification failed' }), { status: 403 });
    }

    const response = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
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
