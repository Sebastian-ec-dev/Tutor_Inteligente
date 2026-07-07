import { AudioNote, NewAudioNote, UpdateAudioNote } from '../entities/AudioNote';

export interface AudioNoteRepositoryPort {
  listBySubject(subjectId: string, userId: string): Promise<AudioNote[]>;
  getById(audioNoteId: string): Promise<AudioNote | null>;
  saveAudioNote(note: NewAudioNote): Promise<AudioNote>;
  updateAudioNote(note: UpdateAudioNote): Promise<AudioNote>;
  deleteAudioNote(audioNoteId: string): Promise<void>;
}
