import { GoogleGenAI, Type } from '@google/genai';

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
    const { baseImage, type } = req.body;
    
    if (!baseImage || !type) {
      return res.status(400).json({ error: 'baseImage and type are required' });
    }

    const ai = getGeminiClient();
    const base64Data = baseImage.split(',')[1] || baseImage;

    const instruction = type === 'RING' 
      ? "Check if this image clearly shows a hand where a ring could be placed. The hand should be visible, relatively flat or in a natural pose, and not too blurry. Return JSON: { \"suitable\": boolean, \"issue\": string | null }. Issue should be short string if not suitable."
      : "Check if this image clearly shows a wrist or arm where a watch/bracelet could be placed. The wrist area should be visible (not covered by long sleeves) and not too blurry. Return JSON: { \"suitable\": boolean, \"issue\": string | null }. Issue should be short string if not suitable.";

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: instruction }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suitable: { type: Type.BOOLEAN },
            issue: { type: Type.STRING, nullable: true }
          },
          required: ['suitable']
        }
      }
    }));

    const json = JSON.parse(response.text || '{}');
    res.status(200).json({
      suitable: json.suitable,
      issue: json.issue
    });
  } catch (error) {
    console.error('Error in validate-image-suitability:', error);
    res.status(500).json({ error: error.message || 'Failed to validate image' });
  }
}
