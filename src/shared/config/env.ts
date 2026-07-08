export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  openAIApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  openAIMathModel: process.env.EXPO_PUBLIC_OPENAI_MATH_MODEL || process.env.EXPO_PUBLIC_OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
  openAIChatModel: process.env.EXPO_PUBLIC_OPENAI_CHAT_MODEL || 'gpt-4.1-mini',
  openAISummaryModel: process.env.EXPO_PUBLIC_OPENAI_SUMMARY_MODEL || 'gpt-4.1-mini',
  openAIVisionModel: process.env.EXPO_PUBLIC_OPENAI_VISION_MODEL || 'gpt-4.1-mini',
  openAITranscriptionModel: process.env.EXPO_PUBLIC_OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
  useMockAI: process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true',
};

export function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Falta configurar ${name} en el archivo .env`);
  }
  return value;
}
