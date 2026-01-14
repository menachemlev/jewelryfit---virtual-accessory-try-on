import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AccessoryType, Language } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for exponential backoff
const callWithRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
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

export const detectAccessoryType = async (imageBase64: string): Promise<AccessoryType> => {
  const ai = getGeminiClient();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = "Analyze this image and classify the main jewelry/accessory item. Is it a WATCH, BRACELET, or RING? Return ONLY one of these words. If it is unclear, default to WATCH.";

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }
    }));

    const text = response.text?.toUpperCase() || '';
    if (text.includes('RING')) return 'RING';
    if (text.includes('BRACELET')) return 'BRACELET';
    return 'WATCH';
  } catch (error) {
    console.warn("Auto-detection failed, defaulting to WATCH", error);
    return 'WATCH';
  }
};

export interface SuitabilityResult {
  suitable: boolean;
  message: string;
}

export const validateImageSuitability = async (
  imageBase64: string,
  type: AccessoryType,
  lang: Language
): Promise<SuitabilityResult> => {
  const ai = getGeminiClient();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  const langName = lang === 'he' ? 'Hebrew' : 'English';

  const prompt = `
    Analyze this photo of a person's body part to see if it is suitable for virtually trying on a ${type}.
    
    Criteria:
    1. For WATCH/BRACELET: The wrist/arm must be clearly visible and not covered by long sleeves.
    2. For RING: The fingers must be visible, not blurred, and not forming a tight fist where a ring cannot be placed.
    3. Lighting should be sufficient to see skin details.
    
    Return a JSON object with:
    - suitable (boolean): true if good, false if bad.
    - message (string): A very short (max 10 words) explanation for the user in ${langName}. e.g. "Sleeve is covering wrist", "Hand is too blurry", "Good photo".
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suitable: { type: Type.BOOLEAN },
            message: { type: Type.STRING }
          }
        }
      }
    }));

    const jsonStr = response.text || "{}";
    const result = JSON.parse(jsonStr);
    
    return {
      suitable: result.suitable ?? true,
      message: result.message || (result.suitable ? "Good photo" : "Photo unclear")
    };
  } catch (error) {
    console.warn("Suitability check failed", error);
    // Fail open (allow user to proceed) if check fails, but log it
    return { suitable: true, message: "" };
  }
};

export const generateTryOnImage = async (
  baseImageBase64: string,
  accessoryImageBase64: string,
  type: AccessoryType
): Promise<string> => {
  const ai = getGeminiClient();

  // Clean base64 strings if they contain metadata headers
  const cleanBase = baseImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  const cleanAccessory = accessoryImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  let promptContext = "";
  let placementInstruction = "";
  let wrappingInstruction = "";

  switch (type) {
    case 'RING':
      promptContext = "hand/fingers";
      placementInstruction = "Position the ring naturally on a suitable finger (e.g., ring finger, index finger, or middle finger) of the hand.";
      wrappingInstruction = "Ensure the ring wraps realistically around the finger, respecting the curvature and skin displacement.";
      break;
    case 'BRACELET':
      promptContext = "wrist/arm";
      placementInstruction = "Position the bracelet naturally around the wrist.";
      wrappingInstruction = "Ensure the bracelet wraps realistically around the curvature of the wrist/arm, showing proper slack or fit.";
      break;
    case 'WATCH':
    default:
      promptContext = "wrist/arm";
      placementInstruction = "Position the watch naturally on the wrist bone or slightly above, as people typically wear watches.";
      wrappingInstruction = "If the watch strap is a metal bracelet or leather band, ensure it wraps realistically around the curvature of the arm.";
      break;
  }

  const prompt = `
    I have two images. 
    The first image is a photo of a person's ${promptContext}. 
    The second image is a product shot of a ${type.toLowerCase()}.
    
    Task: Create a highly realistic image where the ${type.toLowerCase()} from the second image is worn on the body part in the first image.
    
    Requirements:
    1. ${placementInstruction}
    2. Adjust the perspective and rotation of the ${type.toLowerCase()} to match the angle of the body part.
    3. Generate realistic shadows cast by the item onto the skin.
    4. Match the lighting of the item to the lighting environment of the photo.
    5. ${wrappingInstruction}
    6. Maintain high resolution and clarity for the product details.
    7. Output ONLY the resulting image.
  `;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase
            }
          },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanAccessory
            }
          }
        ]
      }
    }), 2, 2000);

    // Check for inlineData (image) in response
    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};