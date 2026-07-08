import { ClassContentType } from '../entities/ClassContentType';
import { AIModelCapability } from '../entities/AIModelCapability';
import { AIModelPort } from './AIModelPort';
import { AIProvider } from '../entities/AIProvider';

export interface AIModelRouterPort {
  selectModel(contentType: ClassContentType, provider?: AIProvider): AIModelPort;
  getCapability(contentType: ClassContentType, provider?: AIProvider): AIModelCapability;
}
