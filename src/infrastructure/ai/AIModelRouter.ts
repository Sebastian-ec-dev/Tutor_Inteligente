import { ClassContentType } from '../../domain/entities/ClassContentType';
import { AIModelPort } from '../../domain/ports/AIModelPort';
import { AIModelRouterPort } from '../../domain/ports/AIModelRouterPort';
import { AIModelCapability, getModelCapabilityByContentType } from '../../domain/entities/AIModelCapability';
import { AIProvider } from '../../domain/entities/AIProvider';

export class AIModelRouter implements AIModelRouterPort {
  constructor(
    private readonly geminiModel: AIModelPort,
    private readonly openAIModel: AIModelPort,
  ) {}

  selectModel(contentType: ClassContentType, provider?: AIProvider): AIModelPort {
    if (provider === 'openai') return this.openAIModel;
    if (provider === 'gemini') return this.geminiModel;

    if (contentType === 'math' || contentType === 'image') {
      return this.openAIModel;
    }

    return this.geminiModel;
  }

  getCapability(contentType: ClassContentType, provider?: AIProvider): AIModelCapability {
    return getModelCapabilityByContentType(contentType, provider);
  }
}
