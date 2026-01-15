import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AccessoryType, Language, FingerType } from "../types";
import { detectHandLandmarks, drawRectangleAroundFinger } from "./handDetectionService";
import { generateRingWithFlux } from "./fluxService";

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper function to detect finger coordinates using Gemini vision
const detectFingerCoordinates = async (
  imageBase64: string,
  fingerName: string
): Promise<{ x: number; y: number; width: number; height: number } | null> => {
  const ai = getGeminiClient();
  const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  const prompt = `Analyze this hand image and locate ONLY the ${fingerName} finger (not the entire hand).

  Focus on the visible portion of the ${fingerName} finger only. Return precise bounding box coordinates:
  - x: left edge of the finger (0-1, as percentage of image width)
  - y: top edge of the finger (0-1, as percentage of image height)  
  - width: finger width (0-1, as percentage of image width) - should be narrow, only the finger
  - height: finger length (0-1, as percentage of image height)

  Be very precise and tight around JUST the finger, with minimal padding.
  
  If the ${fingerName} finger is not clearly visible, return null.
  
  Example: {"x": 0.35, "y": 0.15, "width": 0.08, "height": 0.35}`;

  try {
    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
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

    const jsonStr = response.text || "null";
    const result = JSON.parse(jsonStr);
    
    if (result && result.x !== undefined && result.y !== undefined && result.width && result.height) {
      return result;
    }
    return null;
  } catch (error) {
    console.warn("Finger coordinate detection failed:", error);
    return null;
  }
};

// Helper function to draw a red square on canvas for a specific finger
export const drawRedSquareOnFinger = async (
  imageBase64: string,
  finger: string
): Promise<string> => {
  return new Promise(async (resolve) => {
    const img = new Image();
    img.onload = async () => {
      // Use Gemini to detect the exact finger coordinates
      const coords = await detectFingerCoordinates(imageBase64, finger);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      let x, y, squareSize;
      
      if (coords) {
        // Use Gemini-detected coordinates - tight around the finger
        const fingerLeft = coords.x * img.width;
        const fingerTop = coords.y * img.height;
        const fingerWidth = coords.width * img.width;
        const fingerHeight = coords.height * img.height;
        
        // Create a tight square around the finger with minimal padding
        squareSize = Math.max(fingerWidth, fingerHeight) * 0.75; // Smaller square, 75% of finger size
        
        // Center the square on the finger
        x = fingerLeft + (fingerWidth - squareSize) / 2;
        y = fingerTop + (fingerHeight - squareSize) / 2;
        
        console.log(`Gemini detected ${finger}: x=${coords.x.toFixed(3)}, y=${coords.y.toFixed(3)}, width=${coords.width.toFixed(3)}, height=${coords.height.toFixed(3)}, squareSize=${squareSize.toFixed(0)}`);
      } else {
        // Fallback to approximate positioning if detection fails
        console.warn('Finger detection failed, using approximate positioning');
        squareSize = Math.min(img.width, img.height) * 0.15;
        x = img.width / 2 - squareSize / 2;
        y = img.height / 2 - squareSize / 2;
        
        // Adjust position based on finger (simplified positioning)
        if (finger.toLowerCase().includes('thumb')) {
          x = img.width * 0.25;
          y = img.height * 0.35;
        } else if (finger.toLowerCase().includes('index')) {
          x = img.width * 0.35;
          y = img.height * 0.25;
        } else if (finger.toLowerCase().includes('middle')) {
          x = img.width * 0.5;
          y = img.height * 0.2;
        } else if (finger.toLowerCase().includes('ring')) {
          x = img.width * 0.65;
          y = img.height * 0.25;
        } else if (finger.toLowerCase().includes('pinky')) {
          x = img.width * 0.75;
          y = img.height * 0.35;
        }
      }
      
      // Draw red square with border
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, squareSize, squareSize);
      
      // Convert canvas to base64
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.replace(/^data:image\/[^;]+;base64,/, ''));
        };
        reader.onerror = () => {
          console.error('FileReader error');
          resolve(imageBase64);
        };
        reader.readAsDataURL(blob!);
      }, 'image/jpeg', 0.95);
    };
    img.onerror = () => {
      console.error('Image loading error');
      resolve(imageBase64);
    };
    img.src = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  });
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
  type: AccessoryType,
  selectedFinger?: FingerType
): Promise<string> => {
  const ai = getGeminiClient();

  // Clean base64 strings if they contain metadata headers
  const cleanBase = baseImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
  const cleanAccessory = accessoryImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

  let promptContext = "";
  let placementInstruction = "";
  let wrappingInstruction = "";
  let baseImageForRequest = cleanBase;

  const fingerLabels: Record<FingerType, string> = {
    'thumb': 'thumb',
    'index': 'index finger',
    'middle': 'middle finger',
    'ring': 'ring finger',
    'pinky': 'pinky finger'
  };

  switch (type) {
    case 'RING':
      promptContext = "hand/fingers";
      placementInstruction = `Position the ring naturally on the ${selectedFinger ? fingerLabels[selectedFinger] : 'ring finger'} of the hand. There is a RED SQUARE marked on the target finger - place the ring there.`;
      wrappingInstruction = "Ensure the ring wraps realistically around the finger, respecting the curvature and skin displacement. The red square marks where the ring should be positioned.";
      // Send full image to Gemini Pro with red square marking
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
    let resultImageBase64 = "";

    if (type === 'RING' && selectedFinger) {
      // For rings: draw red square on selected finger, then send to Gemini Pro
      console.log(`Drawing red square on ${selectedFinger} finger...`);
      try {
        const markedImage = await drawRedSquareOnFinger(baseImageForRequest, selectedFinger);
        baseImageForRequest = markedImage;
        console.log('Red square applied, sending to Gemini Pro for ring generation...');
      } catch (drawError) {
        console.warn('Failed to draw red square, proceeding with unmarked image:', drawError);
      }
    }

    // Use Gemini Pro for rings (with red square guidance), and Gemini Flash for watches/bracelets
    //const model = type === 'RING' ? 'gemini-2.5-pro' : 'gemini-2.5-flash-image';
    const model = 'gemini-2.5-flash-image';

    const response = await callWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: baseImageForRequest
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
          let resultImageBase64 = part.inlineData.data;
          
          // The annotated image with the red rectangle was used for generation
          if (type === 'RING' && baseImageForRequest !== cleanBase) {
            console.log('Generated ring on the annotated finger area');
          }
          
          return `data:image/jpeg;base64,${resultImageBase64}`;
        }
      }
    }
    
    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};