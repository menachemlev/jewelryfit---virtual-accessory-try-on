import { GoogleGenAI } from '@google/genai';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
  }
  return new GoogleGenAI({ apiKey });
};

export default async function handler(req, res) {
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
    const { handImage, fingerType } = req.body;
    
    if (!handImage || !fingerType) {
      return res.status(400).json({ error: 'handImage and fingerType are required' });
    }

    const ai = getGeminiClient();
    
    const fingerNames = {
      THUMB: 'thumb',
      INDEX: 'index finger',
      MIDDLE: 'middle finger',
      RING: 'ring finger',
      PINKY: 'pinky finger'
    };

    const prompt = `Analyze this hand image and estimate the ring size for the ${fingerNames[fingerType]}.

Consider the following:
1. Finger width and thickness
2. Hand proportions
3. Gender indicators (male hands typically need sizes 59-65, female hands 53-58)
4. Knuckle size

Ring sizes available: 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66
- Sizes 53-55: Very thin fingers (typically female, petite)
- Sizes 56-58: Average female/thin male fingers
- Sizes 59-61: Average male/thick female fingers
- Sizes 62-64: Thick male fingers
- Sizes 65-66: Very thick male fingers

Respond ONLY with a JSON object in this exact format (no markdown, no extra text):
{
  "recommendedSize": "one of the available sizes",
  "fingerWidth": "one of: very thin, thin, average, thick, very thick",
  "confidence": a number between 0 and 1,
  "reasoning": "brief explanation"
}`;

    const imageData = handImage.split(',')[1] || handImage;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/jpeg', data: imageData } }
        ]
      }
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const analysis = JSON.parse(jsonText);
    
    const validSizes = ['53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66'];
    if (!validSizes.includes(analysis.recommendedSize)) {
      throw new Error('Invalid ring size returned');
    }
    
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Error detecting ring size:', error);
    
    const defaultSizes = {
      THUMB: '61',
      INDEX: '58',
      MIDDLE: '59',
      RING: '57',
      PINKY: '54'
    };
    
    res.status(200).json({
      recommendedSize: defaultSizes[req.body.fingerType] || '58',
      fingerWidth: 'average',
      confidence: 0.5,
      reasoning: 'Using default size due to analysis error'
    });
  }
}
