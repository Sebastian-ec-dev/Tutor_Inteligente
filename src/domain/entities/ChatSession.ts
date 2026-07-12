import { ClassContentType } from './ClassContentType';
import { ConversationMessage } from './ConversationMessage';
import { AIProvider } from './AIProvider';

export type ChatSession = {
  id: string;
  subjectId: string;
  classId: string;
  classTitle?: string;
  title: string;
  messages: ConversationMessage[];
  contentType: ClassContentType;
  aiProvider: AIProvider;
  webSearchEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};
