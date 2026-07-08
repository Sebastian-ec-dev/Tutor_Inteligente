import { AudioNote, NewAudioNote, UpdateAudioNote } from '../../domain/entities/AudioNote';
import { AudioNoteRepositoryPort } from '../../domain/ports/AudioNoteRepositoryPort';
import { supabase } from './supabaseClient';

const AUDIOS_TABLE = 'audios';
const AUDIO_SELECT = 'id, user_id, subject_id, title, transcript, summary, content_type, created_at';

function mapAudioNote(row: any): AudioNote {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    title: row.title,
    transcript: row.transcript || row.transcription || null,
    summary: row.summary || '',
    contentType: row.content_type || 'general',
    createdAt: row.created_at,
  };
}

export class SupabaseAudioNoteRepository implements AudioNoteRepositoryPort {
  async listBySubject(subjectId: string, _userId: string): Promise<AudioNote[]> {
    // El acceso lo controla RLS: el usuario puede ver apuntes/clases de materias propias o compartidas.
    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .select(AUDIO_SELECT)
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapAudioNote);
  }

  async getById(audioNoteId: string): Promise<AudioNote | null> {
    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .select(AUDIO_SELECT)
      .eq('id', audioNoteId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? mapAudioNote(data) : null;
  }

  async saveAudioNote(note: NewAudioNote): Promise<AudioNote> {
    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .insert([
        {
          subject_id: note.subjectId,
          title: note.title,
          transcript: note.transcript,
          transcription: note.transcript,
          summary: note.summary,
          content_type: note.contentType,
          status: 'processed',
        },
      ])
      .select(AUDIO_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return mapAudioNote(data);
  }

  async updateAudioNote(note: UpdateAudioNote): Promise<AudioNote> {
    const payload: Record<string, unknown> = {};

    if (note.title !== undefined) payload.title = note.title;
    if (note.transcript !== undefined) {
      payload.transcript = note.transcript;
      payload.transcription = note.transcript;
    }
    if (note.summary !== undefined) payload.summary = note.summary;
    if (note.contentType !== undefined) payload.content_type = note.contentType;

    const { data, error } = await supabase
      .from(AUDIOS_TABLE)
      .update(payload)
      .eq('id', note.id)
      .select(AUDIO_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return mapAudioNote(data);
  }

  async deleteAudioNote(audioNoteId: string): Promise<void> {
    const { error } = await supabase
      .from(AUDIOS_TABLE)
      .delete()
      .eq('id', audioNoteId);

    if (error) throw new Error(error.message);
  }
}
