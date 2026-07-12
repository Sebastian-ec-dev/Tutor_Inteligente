import { ClassContentType } from '../entities/ClassContentType';
import { AIProvider } from '../entities/AIProvider';
import { AIModelCapability } from '../entities/AIModelCapability';
import { AIModelPort } from './AIModelPort';

export interface AIModelRouterPort {
  selectModel(contentType: ClassContentType): AIModelPort;
  selectModelByProvider(provider: AIProvider, contentType?: ClassContentType): AIModelPort;
  getCapability(contentType: ClassContentType): AIModelCapability;
}
