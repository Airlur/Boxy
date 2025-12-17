export default async function handler(req, res) {
  const { domain } = req.query;

  if (!domain) {
    return res.status(400).json({ error: 'Missing domain parameter' });
  }

  const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  try {
    const response = await fetch(googleUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch favicon from Google' });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 透传 Content-Type，设置缓存
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); 
    
    return res.send(buffer);

  } catch (error) {
    console.error('Favicon Proxy Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
