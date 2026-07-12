import { GeminiAIModelAdapter } from '../infrastructure/ai/GeminiAIModelAdapter';

const textModel = new GeminiAIModelAdapter();

export const generateText = (prompt: string, mimeType?: string, base64Data?: string) =>
  textModel.generateText(prompt, mimeType && base64Data ? { mimeType, base64Data } : undefined);
