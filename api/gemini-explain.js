// AI Answer Explanation Handler - Uses Groq API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { question, options, correctAnswer, userAnswer } = req.body;
  if (!question || !correctAnswer) return res.status(400).json({ error: 'question and correctAnswer are required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ success: false, error: 'AI service not configured' });

  try {
    const prompt = `You are a JAMB exam tutor. A student is practicing for the JAMB UTME exam.

Question: ${question}

Options:
${options ? Object.entries(options).map(([k, v]) => `${k}: ${v}`).join('\n') : 'No options provided'}

Correct Answer: ${correctAnswer}
${userAnswer ? `Student's Answer: ${userAnswer}` : ''}

Please provide a clear, concise explanation in 2-3 sentences:
1. ${userAnswer ? `Explain why "${userAnswer}" is incorrect and` : ''} why "${correctAnswer}" is the correct answer
2. Give a study tip to remember this concept

Keep it educational and encouraging.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ success: false, error: 'AI service error: ' + (data.error.message || 'Unknown') });
    const explanation = data?.choices?.[0]?.message?.content;
    if (explanation) return res.status(200).json({ success: true, explanation });
    return res.status(200).json({ success: false, error: 'No explanation generated' });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
