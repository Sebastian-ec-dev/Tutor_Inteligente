import { AIProvider } from './AIProvider';
import { ClassContentType } from './ClassContentType';
import { ConversationMessage } from './ConversationMessage';

export type ChatSession = {
  id: string;
  subjectId: string;
  classId: string;
  classTitle?: string;
  title: string;
  messages: ConversationMessage[];
  contentType: ClassContentType;
  aiProvider: AIProvider;
  createdAt: string;
  updatedAt: string;
};
