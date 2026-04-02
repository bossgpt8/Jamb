// AI Chat Handler - Uses Groq API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 150,
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'You are JambGenius Boss, a helpful JAMB exam tutor assistant in a student chatroom. Provide helpful, concise answers (1-2 sentences max) that are relevant to JAMB exam preparation. Be friendly and encouraging!' },
          { role: 'user', content: question }
        ]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('Groq API error:', data.error);
      return res.status(500).json({ error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
};
