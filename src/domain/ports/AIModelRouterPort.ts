import { ClassContentType } from '../entities/ClassContentType';
import { AIModelCapability } from '../entities/AIModelCapability';
import { AIModelPort } from './AIModelPort';

export interface AIModelRouterPort {
  selectModel(contentType: ClassContentType): AIModelPort;
  getCapability(contentType: ClassContentType): AIModelCapability;
}
