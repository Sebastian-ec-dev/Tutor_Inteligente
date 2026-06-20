import { GoogleGenAI } from "@google/genai";

// Extraemos los url del .env
const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

export const ai = new GoogleGenAI({ apiKey });

// Colocamos para que tenga una dimension de 768 que permite supabase
export const getEmbedding = async (text: string) => {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: text,
    config: { outputDimensionality: 768 },
  });

  return response.embeddings?.[0]?.values || [];
};

// Función de ayuda para la generación de texto adaptada al nuevo SDK
export const generateText = async (
  prompt: string,
  mimeType?: string,
  base64Data?: string,
) => {
  let contents: any[] = [prompt];

  if (mimeType && base64Data) {
    contents = [
      prompt,
      { inlineData: { mimeType: mimeType, data: base64Data } },
    ];
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
  });

  return response.text;
};
