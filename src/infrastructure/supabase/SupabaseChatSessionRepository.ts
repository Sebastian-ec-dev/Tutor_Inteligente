import { ChatSession } from '../../domain/entities/ChatSession';
import { ConversationMessage } from '../../domain/entities/ConversationMessage';
import { supabase } from './supabaseClient';

const SESSION_TABLE = 'chat_sessions';
const MESSAGE_TABLE = 'chat_messages';
const MAX_MESSAGES_PER_SESSION = 80;

function mapMessage(row: any): ConversationMessage {
  return { id: row.id, text: row.content, sender: row.sender };
}

function mapSession(row: any, messages: ConversationMessage[]): ChatSession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    classId: row.audio_note_id,
    classTitle: row.class_title ?? undefined,
    title: row.title || 'Nueva conversación',
    messages,
    contentType: row.content_type || 'general',
    aiProvider: row.ai_provider || 'gemini',
    webSearchEnabled: Boolean(row.web_search_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SupabaseChatSessionRepository {
  async listAll(): Promise<ChatSession[]> {
    const { data: sessionData, error: sessionError } = await supabase
      .from(SESSION_TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (sessionError) throw new Error(sessionError.message);

    const rows = sessionData || [];
    if (rows.length === 0) return [];
    const ids = rows.map((row: any) => row.id);
    const { data: messageData, error: messageError } = await supabase
      .from(MESSAGE_TABLE)
      .select('*')
      .in('session_id', ids)
      .order('position', { ascending: true });
    if (messageError) throw new Error(messageError.message);

    const grouped = new Map<string, ConversationMessage[]>();
    (messageData || []).forEach((row: any) => {
      const current = grouped.get(row.session_id) || [];
      current.push(mapMessage(row));
      grouped.set(row.session_id, current);
    });

    return rows.map((row: any) => mapSession(row, grouped.get(row.id) || []));
  }

  async listByClass(subjectId: string, classId: string): Promise<ChatSession[]> {
    const sessions = await this.listAll();
    return sessions.filter((session) => session.subjectId === subjectId && session.classId === classId);
  }

  async upsert(session: ChatSession): Promise<void> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Usuario no autenticado');

    const now = new Date().toISOString();
    const { error: sessionError } = await supabase.from(SESSION_TABLE).upsert(
      {
        id: session.id,
        user_id: userData.user.id,
        subject_id: session.subjectId,
        audio_note_id: session.classId,
        class_title: session.classTitle ?? null,
        title: session.title || 'Nueva conversación',
        content_type: session.contentType || 'general',
        ai_provider: session.aiProvider || 'gemini',
        web_search_enabled: session.webSearchEnabled ?? false,
        created_at: session.createdAt || now,
        updated_at: session.updatedAt || now,
      },
      { onConflict: 'id' },
    );
    if (sessionError) throw new Error(sessionError.message);

    const { error: deleteError } = await supabase
      .from(MESSAGE_TABLE)
      .delete()
      .eq('session_id', session.id);
    if (deleteError) throw new Error(deleteError.message);

    const messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
    if (messages.length > 0) {
      const { error: insertError } = await supabase.from(MESSAGE_TABLE).insert(
        messages.map((message, index) => ({
          session_id: session.id,
          user_id: userData.user.id,
          sender: message.sender,
          content: message.text,
          position: index,
        })),
      );
      if (insertError) throw new Error(insertError.message);
    }
  }

  async delete(sessionId: string): Promise<void> {
    if (!sessionId) return;
    const { error } = await supabase.from(SESSION_TABLE).delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
  }

  async rename(sessionId: string, title: string): Promise<ChatSession | null> {
    const clean = title.trim();
    if (!clean) return null;
    const { error } = await supabase
      .from(SESSION_TABLE)
      .update({ title: clean, updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    if (error) throw new Error(error.message);
    const all = await this.listAll();
    return all.find((session) => session.id === sessionId) || null;
  }
}

export const chatSessionRepository = new SupabaseChatSessionRepository();
