import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AccessoryType, Language } from "../types";
import { Content, GenerativeModel, Part, GoogleGenerativeAI } from "@google/generative-ai";

import Replicate from "replicate";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const getGeminiClient2 = () => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini API Key");
  
  // מחזיר את המופע הראשי
  return new GoogleGenerativeAI(apiKey);
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

// וודא שיש לך את המשתנה הזה ב-.env
// REPLICATE_API_TOKEN=r8_...
// utils/ai-service.ts

export const generateTryOnImage = async (
  baseImageBase64: string,
  accessoryImageBase64: string,
  type: AccessoryType
): Promise<string> => {
  
  // פונה לשרת ה-Node.js שיצרנו למעלה
  const response = await fetch('http://localhost:3001/api/try-on', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      baseImage: baseImageBase64,
      accessoryImage: accessoryImageBase64,
      type: type
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate image via server");
  }

  const data = await response.json();
  return data.imageUrl;
};