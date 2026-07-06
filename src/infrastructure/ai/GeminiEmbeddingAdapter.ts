import { EmbeddingPort } from '../../domain/ports/EmbeddingPort';
import { getGeminiClient } from './geminiClient';

export class GeminiEmbeddingAdapter implements EmbeddingPort {
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await getGeminiClient().models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
      config: { outputDimensionality: 768 },
    });

    return response.embeddings?.[0]?.values || [];
  }
}
