import { GeminiAIModelAdapter } from '../infrastructure/ai/GeminiAIModelAdapter';
import { GeminiEmbeddingAdapter } from '../infrastructure/ai/GeminiEmbeddingAdapter';

const textModel = new GeminiAIModelAdapter();
const embeddingModel = new GeminiEmbeddingAdapter();

export const generateText = (prompt: string, mimeType?: string, base64Data?: string) =>
  textModel.generateText(prompt, mimeType && base64Data ? { mimeType, base64Data } : undefined);

export const getEmbedding = (text: string) => embeddingModel.generateEmbedding(text);
