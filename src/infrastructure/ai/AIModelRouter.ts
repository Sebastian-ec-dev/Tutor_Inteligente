import { ClassContentType } from '../../domain/entities/ClassContentType';
import { AIProvider } from '../../domain/entities/AIProvider';
import { AIModelPort } from '../../domain/ports/AIModelPort';
import { AIModelRouterPort } from '../../domain/ports/AIModelRouterPort';
import {
  AIModelCapability,
  getModelCapabilityByContentType,
} from '../../domain/entities/AIModelCapability';

export class AIModelRouter implements AIModelRouterPort {
  constructor(
    private readonly theoryModel: AIModelPort,
    private readonly mathAndImageModel: AIModelPort,
  ) {}

  selectModel(contentType: ClassContentType): AIModelPort {
    if (contentType === 'math' || contentType === 'image') {
      return this.mathAndImageModel;
    }
    return this.theoryModel;
  }

  selectModelByProvider(provider: AIProvider, contentType: ClassContentType = 'general'): AIModelPort {
    if (provider === 'openai') return this.mathAndImageModel;
    if (provider === 'gemini') return this.theoryModel;
    return this.selectModel(contentType);
  }

  getCapability(contentType: ClassContentType): AIModelCapability {
    return getModelCapabilityByContentType(contentType);
  }
}
