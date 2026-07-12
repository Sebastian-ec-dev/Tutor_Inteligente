import { ClassTask, NewClassTask } from '../entities/ClassTask';

export interface ClassTaskRepositoryPort {
  listByUser(userId: string): Promise<ClassTask[]>;
  mergeForAudio(userId: string, tasks: NewClassTask[]): Promise<ClassTask[]>;
  update(userId: string, taskId: string, patch: Partial<Pick<ClassTask, 'text' | 'details' | 'dueAt' | 'completed'>>): Promise<ClassTask>;
  delete(userId: string, taskId: string): Promise<void>;
  deleteByAudio(userId: string, audioNoteId: string): Promise<void>;
}
