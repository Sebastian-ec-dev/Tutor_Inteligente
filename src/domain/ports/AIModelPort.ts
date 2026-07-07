import { ClassContentType } from '../entities/ClassContentType';

export type AITextPart = {
  mimeType?: string;
  base64Data?: string;
};

export interface AIModelPort {
  readonly name: string;
  generateText(prompt: string, attachment?: AITextPart): Promise<string>;
  analyzeClass(input: { content: string; contentType: ClassContentType }): Promise<string>;
}
