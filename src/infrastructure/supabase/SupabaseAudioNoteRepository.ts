import { AudioEmbedding, AudioEmbeddingMatch, AudioNote, NewAudioNote } from '../../domain/entities/AudioNote';
import { AudioNoteRepositoryPort } from '../../domain/ports/AudioNoteRepositoryPort';
import { supabase } from './supabaseClient';

const AUDIOS_TABLE = 'audios';
const AUDIO_EMBEDDINGS_TABLE = 'audio_embeddings';
const MATCH_AUDIO_EMBEDDINGS_RPC = 'match_audio_embeddings';

function mapAudioNote(row: any): AudioNote {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    title: row.title,
    transcript: row.transcript,
    summary: row.summary,
    contentType: row.content_type || 'general',
    createdAt: row.created_at,
  };
}

function toPgVector(values: number[]) {
  if (!values.length) {
    throw new Error('No se generó el embedding. Revisa la API de embeddings.');
  }

  // Supabase pgvector recibe el vector como string: "[0.1,0.2,...]".
  // Debe coincidir con la dimensión declarada en supabase/sql/001_setup_rag_embeddings.sql.
  return `[${values.join(',')}]`;
}

export class SupabaseAudioNoteRepository implements AudioNoteRepositoryPort {
  async listBySubject(subjectId: string, userId: string): Promise<AudioNote[]> {
    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .select('id, user_id, subject_id, title, transcript, summary, content_type, created_at')
      .eq('subject_id', subjectId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapAudioNote);
  }

  async saveAudioNote(note: NewAudioNote): Promise<AudioNote> {
    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .insert([
        {
          user_id: note.userId,
          subject_id: note.subjectId,
          title: note.title,
          transcript: note.transcript,
          summary: note.summary,
          content_type: note.contentType,
        },
      ])
      .select('id, user_id, subject_id, title, transcript, summary, content_type, created_at')
      .single();

    if (error) throw new Error(error.message);
    return mapAudioNote(data);
  }

  async saveEmbedding(embedding: AudioEmbedding): Promise<void> {
    const { error } = await supabase.from(AUDIO_EMBEDDINGS_TABLE).insert([
      {
        user_id: embedding.userId,
        audio_id: embedding.audioId,
        content: embedding.content,
        embedding: toPgVector(embedding.embedding),
      },
    ]);

    if (error) throw new Error(error.message);
  }

  async searchSimilar(input: {
    userId: string;
    subjectId: string;
    embedding: number[];
    threshold: number;
    count: number;
  }): Promise<AudioEmbeddingMatch[]> {
    // Este RPC ejecuta internamente el FROM correcto:
    // from public.audio_embeddings e
    // join public.audios a on e.audio_id = a.id
    // Así el RAG busca en embeddings, pero filtra por materia desde audios.subject_id.
    const { data, error } = await supabase.rpc(MATCH_AUDIO_EMBEDDINGS_RPC, {
      query_embedding: toPgVector(input.embedding),
      match_threshold: input.threshold,
      match_count: input.count,
      p_user_id: input.userId,
      p_subject_id: input.subjectId,
    });

    if (error) throw new Error(error.message);

    return (data || []).map((row: any) => ({
      id: row.id,
      audioId: row.audio_id,
      content: row.content,
      similarity: row.similarity,
    }));
  }
}
