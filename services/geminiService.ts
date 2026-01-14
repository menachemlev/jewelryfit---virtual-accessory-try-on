import { GoogleGenAI } from "@google/genai";
import { AccessoryType } from "../types";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables");
  }
  return new GoogleGenAI({ apiKey });
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
    const response = await ai.models.generateContent({
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
    });

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