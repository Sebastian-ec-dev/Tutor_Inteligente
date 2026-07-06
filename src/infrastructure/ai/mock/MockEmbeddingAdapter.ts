import { EmbeddingPort } from '../../../domain/ports/EmbeddingPort';

export class MockEmbeddingAdapter implements EmbeddingPort {
  async generateEmbedding(text: string): Promise<number[]> {
    const vectorSize = 768;
    const seed = Array.from(text).reduce((acc, char) => acc + char.charCodeAt(0), 0);

    return Array.from({ length: vectorSize }, (_, index) => {
      const value = Math.sin(seed + index) * 10000;
      return Number((value - Math.floor(value)).toFixed(6));
    });
  }
}
