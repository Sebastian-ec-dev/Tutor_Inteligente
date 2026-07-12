import { ClassTask, NewClassTask } from '../../domain/entities/ClassTask';
import { ClassTaskRepositoryPort } from '../../domain/ports/ClassTaskRepositoryPort';
import { supabase } from './supabaseClient';

const TABLE = 'class_tasks';

function mapRow(row: any): ClassTask {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    subjectColor: row.subject_color ?? null,
    audioNoteId: row.audio_note_id,
    classTitle: row.class_title,
    text: row.title,
    details: row.details ?? null,
    confidence: row.confidence == null ? null : Number(row.confidence),
    dueAt: row.due_at ?? null,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export class SupabaseClassTaskRepository implements ClassTaskRepositoryPort {
  async listByUser(userId: string): Promise<ClassTask[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('completed', { ascending: true })
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(mapRow);
  }

  async mergeForAudio(userId: string, incoming: NewClassTask[]): Promise<ClassTask[]> {
    if (incoming.length === 0) return [];

    const audioNoteId = incoming[0].audioNoteId;
    const { data: current, error: readError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('audio_note_id', audioNoteId);
    if (readError) throw new Error(readError.message);

    const existingRows = current || [];
    const now = new Date().toISOString();
    const payloads = incoming.map((item) => {
      const existing = existingRows.find(
        (row: any) => normalizeText(row.title) === normalizeText(item.text),
      );
      return {
        id: existing?.id || `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
        user_id: userId,
        subject_id: item.subjectId,
        subject_name: item.subjectName,
        subject_color: item.subjectColor ?? null,
        audio_note_id: item.audioNoteId,
        class_title: item.classTitle,
        title: item.text.trim(),
        details: item.details ?? null,
        confidence: item.confidence ?? null,
        due_at: item.dueAt ?? null,
        completed: item.completed,
        created_at: existing?.created_at || now,
        updated_at: now,
      };
    });

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(payloads, { onConflict: 'id' })
      .select('*');
    if (error) throw new Error(error.message);
    return (data || []).map(mapRow);
  }

  async update(
    userId: string,
    taskId: string,
    patch: Partial<Pick<ClassTask, 'text' | 'details' | 'dueAt' | 'completed'>>,
  ): Promise<ClassTask> {
    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.text !== undefined) payload.title = patch.text.trim();
    if (patch.details !== undefined) payload.details = patch.details;
    if (patch.dueAt !== undefined) payload.due_at = patch.dueAt;
    if (patch.completed !== undefined) payload.completed = patch.completed;

    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', taskId).eq('user_id', userId);
    if (error) throw new Error(error.message);
  }

  async deleteByAudio(userId: string, audioNoteId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('audio_note_id', audioNoteId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  }
}
