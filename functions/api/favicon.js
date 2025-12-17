export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const domain = url.searchParams.get('domain');

  if (!domain) {
    return new Response(JSON.stringify({ error: 'Missing domain parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  try {
    const response = await fetch(googleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Boxy/1.0)'
      }
    });

    if (!response.ok) {
        return new Response(JSON.stringify({ error: 'Upstream error' }), { status: response.status });
    }

    // 透传响应
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=604800, immutable'
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
