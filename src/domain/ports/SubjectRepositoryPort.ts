import { NewSubject, Subject, UpdateSubject } from '../entities/Subject';

export interface SubjectRepositoryPort {
  listByUser(userId: string): Promise<Subject[]>;
  create(input: NewSubject): Promise<Subject>;
  update(input: UpdateSubject): Promise<Subject>;
  delete(subjectId: string): Promise<void>;
}
