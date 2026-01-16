import { GoogleGenAI } from '@google/genai';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
  }
  return new GoogleGenAI({ apiKey });
};

const callWithRetry = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    const isRateLimit = 
      error.status === 429 || 
      error.code === 429 || 
      (error.message && (error.message.includes('429') || error.message.includes('Quota exceeded') || error.message.includes('RESOURCE_EXHAUSTED')));

    if (retries > 0 && isRateLimit) {
      console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { baseImage } = req.body;
    
    if (!baseImage) {
      return res.status(400).json({ error: 'baseImage is required' });
    }

    const ai = getGeminiClient();
    const base64Data = baseImage.split(',')[1] || baseImage;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Classify the single accessory in this image as exactly one of these three types: 'WATCH', 'BRACELET', or 'RING'. Return only the word." }
        ]
      }
    }));

    const text = response.text?.trim().toUpperCase();
    let accessoryType = 'WATCH';
    
    if (text?.includes('WATCH')) accessoryType = 'WATCH';
    else if (text?.includes('RING')) accessoryType = 'RING';
    else if (text?.includes('BRACELET')) accessoryType = 'BRACELET';

    res.status(200).json({ accessoryType });
  } catch (error) {
    console.error('Error in detect-accessory-type:', error);
    res.status(500).json({ error: error.message || 'Failed to detect accessory type' });
  }
}
