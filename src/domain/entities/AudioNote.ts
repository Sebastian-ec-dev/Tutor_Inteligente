import { ClassContentType } from "./ClassContentType";

export type AudioNote = {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  transcript?: string | null;
  deberes?: string | null;
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
  deberes?: string;
  contentType: ClassContentType;
};

export type UpdateAudioNote = {
  id: string;
  title?: string;
  transcript?: string;
  summary?: string;
  deberes?: string;
  contentType?: ClassContentType;
};
