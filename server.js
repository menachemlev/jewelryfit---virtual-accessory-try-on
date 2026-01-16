import 'dotenv/config'; // טוען את משתני הסביבה מקובץ .env
import express from 'express';
import cors from 'cors';
import Replicate from 'replicate';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3001; // השרת ירוץ על פורט 3001

// אפשר CORS לכל הדומיינים (או תגביל לדומיין של הקליינט שלך)
app.use(cors());
app.use(express.json({ limit: '50mb' })); // חשוב! מאפשר קבלת תמונות גדולות

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function streamToBuffer(stream) {
  const chunks = [];
  // לולאה שממתינה לכל החלקים של המידע שמגיעים
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

app.post('/api/try-on', async (req, res) => {
  try {
    const { baseImage, accessoryImage, type } = req.body;

    if (!baseImage || !accessoryImage) {
      return res.status(400).json({ error: "Missing images" });
    }

    // --- שלב 1: Gemini Vision ---
    console.log("Analyzing with Gemini...");
    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const cleanBase = baseImage.replace(/^data:image\/\w+;base64,/, "");
    const cleanAccessory = accessoryImage.replace(/^data:image\/\w+;base64,/, "");

    const analysisPrompt = `
      You are a technical assistant for image inpainting.
      Task: Create a prompt for Flux-Dev to overlay a product onto a specific person's photo.
      
      Input A: User's photo (Body part: ${type}).
      Input B: Product photo (Accessory: ${type}).

      Write a prompt that describes the scene exactly as it is in Input A, but with the product from Input B wearing it.
      
      CRITICAL INSTRUCTIONS:
      - Start with: "A high-quality photo of [describe the exact hand/body from Input A including pose, skin tone, veins, background]..."
      - Then add: "...wearing a [describe the product from Input B exactly]."
      - End with: "The item creates realistic shadows on the skin. The hand pose and background remain exactly unchanged. 8k resolution, photorealistic."
    `;

    // ... (קוד הקריאה לג'מיני נשאר אותו דבר) ...

    // --- שלב 2: Replicate Flux - כיול מחדש ---
    console.log("Generating with Flux...");
    
    const output = await replicate.run("black-forest-labs/flux-dev", {
      input: {
        // הוספנו בסוף הפרומפט הוראות חידוד
        prompt: fluxPrompt + " seamless integration, maintain original anatomy, photorealistic.",
        image: baseImage, 
        go_fast: true,
        
        // --- השינוי הגדול נמצא כאן ---
        guidance_scale: 2.5,  // הורדנו מ-3.5. ערך נמוך יותר ב-Flux נותן תוצאה ריאליסטית יותר ופחות "ציורית".
        prompt_strength: 0.65, // הורדנו מ-0.85. 
        // הסבר: 0.65 אומר "תשמור על 35% מהתמונה המקורית בדיוק כמו שהיא".
        // אם היד עדיין מתעוותת, תוריד ל-0.55-0.60. אם השעון בקושי נראה, תעלה ל-0.70.
        
        num_inference_steps: 30, // העלינו קצת לאיכות טובה יותר
        output_format: "jpg"
      }
    });
    console.log("Image generated", output);

    console.log("Raw Output Type:", output); // ליתר ביטחון

    let finalImageBase64 = "";

    // קודם נבודד את האיבר הראשון (במקרה וזה מערך)
    const rawOutput = Array.isArray(output) ? output[0] : output;

    // בדיקה: האם זה Stream? (מה שקרה לך)
    if (rawOutput && (typeof rawOutput.getReader === 'function' || rawOutput.readable)) {
      console.log("Output is a Stream. Converting to Base64...");
      const imageBuffer = await streamToBuffer(rawOutput);
      finalImageBase64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    } 
    // בדיקה: האם זו סתם מחרוזת URL? (מה שקורה בדרך כלל)
    else if (typeof rawOutput === 'string') {
      console.log("Output is a URL string.");
      // אופציה א: להחזיר URL
      // return res.json({ imageUrl: rawOutput });
      
      // אופציה ב (מומלצת): להוריד ולהמיר ל-Base64 כדי לא להסתמך על לינק חיצוני
      const response = await fetch(rawOutput);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      finalImageBase64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    res.json({ imageUrl: finalImageBase64 });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});