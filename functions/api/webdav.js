// functions/api/webdav.js
export async function onRequest(context) {
  const { request } = context;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const { endpoint, username, password, method = 'GET', data } = await request.json();

    if (!endpoint || !username || !password) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    // Cloudflare Edge 环境使用 btoa
    const auth = btoa(username + ':' + password);
    
    const headers = {
      'Authorization': 'Basic ' + auth,
      'Content-Type': 'application/json',
      'User-Agent': 'Boxy-Proxy/1.0'
    };

    const upstreamResponse = await fetch(endpoint, {
      method,
      headers,
      body: method === 'PUT' ? JSON.stringify(data) : undefined,
    });

    if (!upstreamResponse.ok) {
        return new Response(JSON.stringify({ error: upstreamResponse.statusText }), { status: upstreamResponse.status });
    }

    const body = method === 'GET' ? await upstreamResponse.text() : JSON.stringify({ success: true });
    
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}