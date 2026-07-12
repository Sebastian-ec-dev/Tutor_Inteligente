function numberFromEnv(value: string | undefined, fallback: number, min = 0, max = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
  openAIApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  openAIMathModel: process.env.EXPO_PUBLIC_OPENAI_MATH_MODEL || 'gpt-4.1-mini',
  openAITranscriptionModel:
    process.env.EXPO_PUBLIC_OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe',
  aiChatTemperature: numberFromEnv(
    process.env.EXPO_PUBLIC_AI_CHAT_TEMPERATURE,
    0.3,
  ),
  aiSummaryTemperature: numberFromEnv(
    process.env.EXPO_PUBLIC_AI_SUMMARY_TEMPERATURE,
    0.15,
  ),
  enableTutorWebSearch: process.env.EXPO_PUBLIC_ENABLE_TUTOR_WEB_SEARCH !== 'false',
  enableTranscriptionFallback:
    process.env.EXPO_PUBLIC_ENABLE_TRANSCRIPTION_FALLBACK === 'true',
  useMockAI: process.env.EXPO_PUBLIC_USE_MOCK_AI === 'true',
};

export function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Falta configurar ${name} en el archivo .env`);
  }
  return value;
}
