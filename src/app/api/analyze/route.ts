import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Ensure the API key is available
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in your environment variables." },
        { status: 500 }
      );
    }

    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Prepare the image part for Gemini
    // base64 format from FileReader usually comes as: "data:image/jpeg;base64,/9j/4AAQ..."
    const base64Data = imageBase64.split(",")[1];
    const mimeType = imageBase64.split(";")[0].split(":")[1];

    if (!base64Data || !mimeType) {
       return NextResponse.json(
        { error: "Invalid image format" },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });

    const prompt = `Analyze this food image and estimate the nutritional macros. 
Return ONLY a raw JSON object (do not use markdown blocks like \`\`\`json) with the following structure:
{
  "foodName": "Name of the food (e.g. Grilled Chicken Salad)",
  "calories": 450,
  "protein": 30,
  "carbs": 15,
  "fats": 20,
  "confidence": "high|medium|low"
}`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting just in case
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedMacros = JSON.parse(cleanedText);

    return NextResponse.json(parsedMacros);
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "Failed to analyze image", details: error.message },
      { status: 500 }
    );
  }
}
