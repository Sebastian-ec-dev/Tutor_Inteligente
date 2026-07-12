import { ClassContentType } from '../entities/ClassContentType';

export type AITextPart = {
  mimeType?: string;
  base64Data?: string;
};

export type AIRequestOptions = {
  temperature?: number;
  enableWebSearch?: boolean;
};

export interface AIModelPort {
  readonly name: string;
  generateText(
    prompt: string,
    attachment?: AITextPart,
    options?: AIRequestOptions,
  ): Promise<string>;
  analyzeClass(input: { content: string; contentType: ClassContentType }): Promise<string>;
}
