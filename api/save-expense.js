module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const scriptUrl = process.env.SHEETS_SCRIPT_URL;
  if (!scriptUrl) {
    return res.status(500).json({ error: 'SHEETS_SCRIPT_URL environment variable is not set' });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      redirect: 'follow',
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { success: false, error: text }; }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
