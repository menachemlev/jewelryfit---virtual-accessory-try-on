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
    const { image, language = 'en', accessoryType = 'WATCH' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'image is required' });
    }

    const ai = getGeminiClient();
    
    const imageData = image.split(',')[1] || image;

    // Create prompts based on language
    const prompts = {
      en: {
        WATCH: "Analyze this image where a watch has been digitally placed on a wrist. Provide a brief, friendly review (2-3 sentences) about how well the watch fits and looks. Comment on size proportion, positioning, and overall aesthetic. Be encouraging but honest.",
        BRACELET: "Analyze this image where a bracelet has been digitally placed on a wrist. Provide a brief, friendly review (2-3 sentences) about how well the bracelet fits and looks. Comment on size proportion, positioning, and overall aesthetic. Be encouraging but honest.",
        RING: "Analyze this image where a ring has been digitally placed on a finger. Provide a brief, friendly review (2-3 sentences) about how well the ring fits and looks. Comment on size proportion, positioning, and overall aesthetic. Be encouraging but honest."
      },
      he: {
        WATCH: "נתח את התמונה שבה שעון הוצב דיגיטלית על פרק יד. תן ביקורת קצרה וידידותית (2-3 משפטים) על כמה טוב השעון מתאים ונראה. התייחס לפרופורציות הגודל, המיקום, והמראה הכללי. היה מעודד אך כן.",
        BRACELET: "נתח את התמונה שבה צמיד הוצב דיגיטלית על פרק יד. תן ביקורת קצרה וידידותית (2-3 משפטים) על כמה טוב הצמיד מתאים ונראה. התייחס לפרופורציות הגודל, המיקום, והמראה הכללי. היה מעודד אך כן.",
        RING: "נתח את התמונה שבה טבעת הוצבה דיגיטלית על אצבע. תן ביקורת קצרה וידידותית (2-3 משפטים) על כמה טוב הטבעת מתאימה ונראית. התייחס לפרופורציות הגודל, המיקום, והמראה הכללי. היה מעודד אך כן."
      }
    };

    const prompt = prompts[language]?.[accessoryType] || prompts.en[accessoryType];

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageData } }
        ]
      }
    }));

    const review = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate review.';
    
    res.status(200).json({ review });
  } catch (error) {
    console.error('Error analyzing fit:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze fit' });
  }
}
