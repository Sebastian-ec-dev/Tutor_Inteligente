import { ClassContentType } from '../../domain/entities/ClassContentType';
import { AIModelPort } from '../../domain/ports/AIModelPort';
import { AIModelRouterPort } from '../../domain/ports/AIModelRouterPort';
import { AIModelCapability, getModelCapabilityByContentType } from '../../domain/entities/AIModelCapability';

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

  getCapability(contentType: ClassContentType): AIModelCapability {
    return getModelCapabilityByContentType(contentType);
  }
}
