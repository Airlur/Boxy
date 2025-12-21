// functions/api/webdav.js
export async function onRequest(context) {
  const { request } = context;
  
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const bodyText = await request.text();
    const { endpoint, username, password, method = 'GET', data, destination } = JSON.parse(bodyText);

    if (!endpoint || !username || !password) {
        return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    const auth = btoa(username + ':' + password);
    
    const headers = {
      'Authorization': 'Basic ' + auth,
      'User-Agent': 'Boxy-Proxy/1.0'
    };

    if (destination) {
      headers['Destination'] = destination;
      headers['Overwrite'] = 'T';
    }

    let fetchBody;
    if (method === 'PUT') {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(data);
    } else if (method === 'PROPFIND') {
      headers['Depth'] = '1';
    }

    const upstreamResponse = await fetch(endpoint, {
      method,
      headers,
      body: fetchBody,
    });

    const responseText = await upstreamResponse.text();
    
    if (!upstreamResponse.ok) {
        return new Response(JSON.stringify({ error: upstreamResponse.statusText, details: responseText }), { 
            status: upstreamResponse.status,
            headers: { "Content-Type": "application/json" }
        });
    }

    const contentType = upstreamResponse.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    return new Response(responseText, {
      headers: { "Content-Type": isJson ? "application/json" : "application/xml" },
      status: 200
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}