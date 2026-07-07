export type ConversationMessage = {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
};
