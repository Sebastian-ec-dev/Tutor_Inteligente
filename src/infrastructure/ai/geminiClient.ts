import { GoogleGenAI } from '@google/genai';
import { env, requireEnv } from '../../shared/config/env';

let client: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (!client) {
    client = new GoogleGenAI({
      apiKey: requireEnv(env.geminiApiKey, 'EXPO_PUBLIC_GEMINI_API_KEY'),
    });
  }

  return client;
}
