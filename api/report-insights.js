module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

  const { currentMonth, previousMonth, currentData, previousData } = req.body;

  const fmtCats = (cats) =>
    Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `  - ${cat}: ₹${Number(amt).toLocaleString('en-IN')}`)
      .join('\n');

  const prompt = `You are a personal finance advisor analyzing monthly expense data for an Indian household. All amounts are in Indian Rupees (₹).

Current Month: ${currentMonth}
Total Spent: ₹${Number(currentData.total).toLocaleString('en-IN')}
Transactions: ${currentData.count}
Category breakdown:
${fmtCats(currentData.byCategory)}

Previous Month: ${previousMonth}
Total Spent: ₹${Number(previousData.total).toLocaleString('en-IN')}
Transactions: ${previousData.count}
Category breakdown:
${fmtCats(previousData.byCategory)}

Respond with a JSON object using exactly these keys:
{
  "summary": "2-3 sentence executive summary of this month's spending compared to last month",
  "highlights": ["3-4 specific observations about spending changes or patterns, referencing actual rupee amounts"],
  "marketContext": ["2-3 brief points about current market/price trends in India relevant to the categories spent on"],
  "suggestions": ["3-4 specific, actionable tips to reduce or optimize spending based on the actual data"],
  "positiveNote": "One encouraging sentence about something positive in this month's spending habits"
}`;

  try {
    // Auto-discover available models for this API key
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Cannot list models (${listRes.status}): ${err}`);
    }
    const listData = await listRes.json();
    const available = (listData.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace('models/', ''));

    const preferred = [
      'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro',
      'gemini-1.0-pro', 'gemini-pro',
    ];
    const model =
      preferred.find(p => available.some(a => a === p || a.startsWith(p + '-'))) ||
      available[0];

    if (!model) throw new Error(`No usable Gemini models found. Available: ${available.join(', ')}`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse Gemini response as JSON');

    const insights = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ success: true, insights, model });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
