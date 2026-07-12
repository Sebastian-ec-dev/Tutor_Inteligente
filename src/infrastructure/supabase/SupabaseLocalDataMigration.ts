import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabaseClient';

const MIGRATION_KEY = 'AULAIA_LOCAL_TO_SUPABASE_V1';
const SCHEDULE_FILE = `${FileSystem.documentDirectory || ''}aulaia_class_schedule.json`;
const TASK_FILE = `${FileSystem.documentDirectory || ''}aulaia_class_tasks.json`;
const CHAT_FILE = `${FileSystem.documentDirectory || ''}aulaia_chat_sessions.json`;

async function readArray(path: string): Promise<any[]> {
  if (!FileSystem.documentDirectory) return [];
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return [];
  try {
    const text = await FileSystem.readAsStringAsync(path);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function migrateLocalDataToSupabaseOnce(): Promise<void> {
  if ((await SecureStore.getItemAsync(MIGRATION_KEY)) === 'done') return;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return;

  const [schedules, tasks, chats] = await Promise.all([
    readArray(SCHEDULE_FILE),
    readArray(TASK_FILE),
    readArray(CHAT_FILE),
  ]);

  if (schedules.length) {
    const payload = schedules
      .filter((item) => item?.id && item?.subjectId)
      .map((item) => ({
        id: item.id,
        user_id: user.id,
        subject_id: item.subjectId,
        subject_name: item.subjectName || 'Materia',
        teacher: item.teacher ?? null,
        color: item.color ?? '#2563EB',
        day_of_week: Number(item.dayOfWeek),
        start_time: item.startTime,
        end_time: item.endTime,
        created_at: item.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
    if (payload.length) {
      const { error } = await supabase.from('class_schedules').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
  }

  if (tasks.length) {
    const payload = tasks
      .filter((item) => item?.id && item?.audioNoteId && item?.subjectId)
      .map((item) => ({
        id: item.id,
        user_id: user.id,
        subject_id: item.subjectId,
        subject_name: item.subjectName || 'Materia',
        subject_color: item.subjectColor ?? null,
        audio_note_id: item.audioNoteId,
        class_title: item.classTitle || 'Clase',
        title: item.text || 'Tarea',
        details: item.details ?? null,
        confidence: item.confidence ?? null,
        due_at: item.dueAt ?? null,
        completed: Boolean(item.completed),
        created_at: item.createdAt || new Date().toISOString(),
        updated_at: item.updatedAt || new Date().toISOString(),
      }));
    if (payload.length) {
      const { error } = await supabase.from('class_tasks').upsert(payload, { onConflict: 'id' });
      if (error) throw new Error(error.message);
    }
  }

  for (const chat of chats.filter((item) => item?.id && item?.subjectId && item?.classId)) {
    const { error: sessionError } = await supabase.from('chat_sessions').upsert({
      id: chat.id,
      user_id: user.id,
      subject_id: chat.subjectId,
      audio_note_id: chat.classId,
      class_title: chat.classTitle ?? null,
      title: chat.title || 'Nueva conversación',
      content_type: chat.contentType || 'general',
      ai_provider: chat.aiProvider || 'gemini',
      web_search_enabled: Boolean(chat.webSearchEnabled),
      created_at: chat.createdAt || new Date().toISOString(),
      updated_at: chat.updatedAt || new Date().toISOString(),
    }, { onConflict: 'id' });
    if (sessionError) throw new Error(sessionError.message);

    await supabase.from('chat_messages').delete().eq('session_id', chat.id);
    const messages = Array.isArray(chat.messages) ? chat.messages.slice(-80) : [];
    if (messages.length) {
      const { error: messageError } = await supabase.from('chat_messages').insert(
        messages.map((message: any, index: number) => ({
          session_id: chat.id,
          user_id: user.id,
          sender: message.sender === 'user' ? 'user' : 'bot',
          content: String(message.text || ''),
          position: index,
        })),
      );
      if (messageError) throw new Error(messageError.message);
    }
  }

  await SecureStore.setItemAsync(MIGRATION_KEY, 'done');
}
