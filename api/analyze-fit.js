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
        WATCH: "Analyze this image where a watch has been placed on a wrist. Provide a brief, honest review (2-3 sentences) about how well the watch fits and looks. Be objective and critical - point out specific issues with size proportion, positioning, style match, or overall aesthetic if you see any. If it looks good, say so, but don't hesitate to mention what could be improved or if something doesn't look well.",
        BRACELET: "Analyze this image where a bracelet has been placed on a wrist. Provide a brief, honest review (2-3 sentences) about how well the bracelet fits and looks. Be objective and critical - point out specific issues with size proportion, positioning, style match, or overall aesthetic if you see any. If it looks good, say so, but don't hesitate to mention what could be improved or if something doesn't look well.",
        RING: "Analyze this image where a ring has been placed on a finger. Provide a brief, honest review (2-3 sentences) about how well the ring fits and looks. Be objective and critical - point out specific issues with size proportion, positioning, style match, or overall aesthetic if you see any. If it looks good, say so, but don't hesitate to mention what could be improved or if something doesn't look well."
      },
      he: {
        WATCH: "נתח את התמונה שבה שעון הוצב על פרק יד. תן ביקורת קצרה וכנה (2-3 משפטים) על כמה טוב השעון מתאים ונראה. היה אובייקטיבי וביקורתי - ציין בעיות ספציפיות בפרופורציות הגודל, המיקום, התאמת הסגנון, או המראה הכללי אם אתה רואה כאלה. אם זה נראה טוב, אמור זאת, אך אל תהסס להזכיר מה אפשר לשפר או אם משהו לא נראה טוב.",
        BRACELET: "נתח את התמונה שבה צמיד הוצב על פרק יד. תן ביקורת קצרה וכנה (2-3 משפטים) על כמה טוב הצמיד מתאים ונראה. היה אובייקטיבי וביקורתי - ציין בעיות ספציפיות בפרופורציות הגודל, המיקום, התאמת הסגנון, או המראה הכללי אם אתה רואה כאלה. אם זה נראה טוב, אמור זאת, אך אל תהסס להזכיר מה אפשר לשפר או אם משהו לא נראה טוב.",
        RING: "נתח את התמונה שבה טבעת הוצבה על אצבע. תן ביקורת קצרה וכנה (2-3 משפטים) על כמה טוב הטבעת מתאימה ונראית. היה אובייקטיבי וביקורתי - ציין בעיות ספציפיות בפרופורציות הגודל, המיקום, התאמת הסגנון, או המראה הכללי אם אתה רואה כאלה. אם זה נראה טוב, אמור זאת, אך אל תהסס להזכיר מה אפשר לשפר או אם משהו לא נראה טוב."
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
