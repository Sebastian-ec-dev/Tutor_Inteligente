import { ClassContentType } from './ClassContentType';

export type AudioNote = {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  transcript?: string | null;
  summary: string;
  contentType?: ClassContentType;
  createdAt?: string;
};

export type NewAudioNote = {
  userId: string;
  subjectId: string;
  title: string;
  transcript: string;
  summary: string;
  contentType: ClassContentType;
};

export type AudioEmbedding = {
  userId: string;
  audioId: string;
  content: string;
  embedding: number[];
};

export type AudioEmbeddingMatch = {
  id: string;
  audioId: string;
  content: string;
  similarity: number;
};
