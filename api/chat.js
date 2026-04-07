// AI Chat Handler - Uses Groq API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, history } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is not configured');
    return res.status(500).json({ error: 'AI service not configured' });
  }

  // Keep at most the last 20 messages (10 turns) to stay within token limits
  const MAX_HISTORY = 20;
  const priorMessages = Array.isArray(history) ? history.slice(-MAX_HISTORY) : [];

  // Build the full conversation: system + prior turns + new user message
  const messages = [
    {
      role: 'system',
      content: 'You are JambGenius AI Tutor, an expert JAMB exam preparation assistant. Help students understand concepts clearly and thoroughly. You can remember what was discussed earlier in this conversation. Be educational, encouraging, and detailed in your explanations.'
    },
    ...priorMessages,
    { role: 'user', content: question }
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        temperature: 0.5,
        messages
      })
    });

    const data = await response.json();
    if (data.error) {
      console.error('Groq API error:', data.error);
      return res.status(500).json({ error: 'AI service error: ' + (data.error.message || 'Unknown error') });
    }

    const answer = data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

    // Return the updated history so the client can maintain conversation context
    const updatedHistory = [
      ...priorMessages,
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    ];

    return res.status(200).json({ answer, history: updatedHistory });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ error: 'Failed to get AI response' });
  }
};
