export type AIProvider = 'gemini' | 'openai';

export const AI_PROVIDER_LABELS: Record<AIProvider, string> = {
  gemini: 'Google Gemini 2.5 Flash',
  openai: 'OpenAI GPT-4.1 mini',
};
