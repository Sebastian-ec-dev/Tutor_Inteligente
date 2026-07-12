import * as FileSystem from 'expo-file-system/legacy';
import { ChatSession } from '../../domain/entities/ChatSession';

const CHAT_FILE = `${FileSystem.documentDirectory || ''}aulaia_chat_sessions.json`;
const MAX_SESSIONS = 100;
const MAX_MESSAGES_PER_SESSION = 80;

class LocalChatSessionRepository {
  async listAll(): Promise<ChatSession[]> {
    const sessions = await this.readAll();
    return sessions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  async listByClass(subjectId: string, classId: string): Promise<ChatSession[]> {
    const sessions = await this.listAll();
    return sessions.filter(
      (session) => session.subjectId === subjectId && session.classId === classId,
    );
  }

  async upsert(session: ChatSession): Promise<void> {
    const sessions = await this.readAll();
    const normalized: ChatSession = this.normalize({
      ...session,
      messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    });

    const next = [
      normalized,
      ...sessions.filter((item) => item.id !== normalized.id),
    ].slice(0, MAX_SESSIONS);

    await this.writeAll(next);
  }

  async delete(sessionId: string): Promise<void> {
    if (!sessionId) return;
    const sessions = await this.readAll();
    await this.writeAll(sessions.filter((session) => session.id !== sessionId));
  }

  async rename(sessionId: string, title: string): Promise<ChatSession | null> {
    const sessions = await this.readAll();
    const current = sessions.find((session) => session.id === sessionId);
    if (!current) return null;
    const updated = this.normalize({
      ...current,
      title: title.trim() || current.title,
      updatedAt: new Date().toISOString(),
    });
    await this.writeAll([
      updated,
      ...sessions.filter((session) => session.id !== sessionId),
    ]);
    return updated;
  }

  private normalize(session: Partial<ChatSession> & Pick<ChatSession, 'id' | 'subjectId' | 'classId' | 'title' | 'messages' | 'contentType' | 'createdAt' | 'updatedAt'>): ChatSession {
    return {
      id: session.id,
      subjectId: session.subjectId,
      classId: session.classId,
      classTitle: session.classTitle,
      title: session.title || 'Nueva conversación',
      messages: Array.isArray(session.messages) ? session.messages : [],
      contentType: session.contentType || 'general',
      aiProvider: session.aiProvider || 'gemini',
      webSearchEnabled: session.webSearchEnabled ?? false,
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: session.updatedAt || new Date().toISOString(),
    };
  }

  private async readAll(): Promise<ChatSession[]> {
    try {
      if (!FileSystem.documentDirectory) return [];
      const info = await FileSystem.getInfoAsync(CHAT_FILE);
      if (!info.exists) return [];
      const raw = await FileSystem.readAsStringAsync(CHAT_FILE);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && item.id && item.subjectId && item.classId)
        .map((item) => this.normalize(item));
    } catch (error) {
      console.log('[LocalChatSessionRepository] No se pudo leer historial:', error);
      return [];
    }
  }

  private async writeAll(sessions: ChatSession[]): Promise<void> {
    try {
      if (!FileSystem.documentDirectory) return;
      await FileSystem.writeAsStringAsync(CHAT_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.log('[LocalChatSessionRepository] No se pudo guardar historial:', error);
      throw error;
    }
  }
}

export const localChatSessionRepository = new LocalChatSessionRepository();
