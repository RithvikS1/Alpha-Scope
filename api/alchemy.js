export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { method, params } = req.body;

  if (!method) {
    return res.status(400).json({ error: 'Method is required' });
  }

  const ALCHEMY_KEY = process.env.ALCHEMY_KEY;
  if (!ALCHEMY_KEY) {
    return res.status(500).json({ error: 'ALCHEMY_KEY environment variable is not set' });
  }

  const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

  try {
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: method,
        params: params || [],
      }),
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Alchemy API error:', error);
    return res.status(500).json({ error: 'Failed to fetch from Alchemy API', details: error.message });
  }
}

