import { AudioEmbedding, AudioEmbeddingMatch, AudioNote, NewAudioNote } from '../entities/AudioNote';

export interface AudioNoteRepositoryPort {
  listBySubject(subjectId: string, userId: string): Promise<AudioNote[]>;
  saveAudioNote(note: NewAudioNote): Promise<AudioNote>;
  saveEmbedding(embedding: AudioEmbedding): Promise<void>;
  searchSimilar(input: {
    userId: string;
    subjectId: string;
    embedding: number[];
    threshold: number;
    count: number;
  }): Promise<AudioEmbeddingMatch[]>;
}
