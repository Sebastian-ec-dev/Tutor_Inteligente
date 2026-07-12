export type ClassTask = {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  subjectColor?: string | null;
  audioNoteId: string;
  classTitle: string;
  text: string;
  details?: string | null;
  confidence?: number | null;
  dueAt?: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NewClassTask = Omit<ClassTask, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
