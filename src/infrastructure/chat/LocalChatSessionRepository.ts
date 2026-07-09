import * as FileSystem from 'expo-file-system/legacy';
import { ChatSession } from '../../domain/entities/ChatSession';

const CHAT_FILE = `${FileSystem.documentDirectory || ''}aulaia_chat_sessions.json`;
const MAX_SESSIONS = 80;
const MAX_MESSAGES_PER_SESSION = 40;

class LocalChatSessionRepository {
  async listAll(): Promise<ChatSession[]> {
    const sessions = await this.readAll();
    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async listByClass(subjectId: string, classId: string): Promise<ChatSession[]> {
    const sessions = await this.readAll();
    return sessions
      .filter((session) => session.subjectId === subjectId && session.classId === classId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async upsert(session: ChatSession): Promise<void> {
    const sessions = await this.readAll();
    const normalized: ChatSession = {
      ...session,
      messages: session.messages.slice(-MAX_MESSAGES_PER_SESSION),
    };

    const next = [
      normalized,
      ...sessions.filter((item) => item.id !== normalized.id),
    ].slice(0, MAX_SESSIONS);

    await this.writeAll(next);
  }

  private async readAll(): Promise<ChatSession[]> {
    try {
      const info = await FileSystem.getInfoAsync(CHAT_FILE);
      if (!info.exists) return [];

      const raw = await FileSystem.readAsStringAsync(CHAT_FILE);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.log('[LocalChatSessionRepository] No se pudo leer historial:', error);
      return [];
    }
  }

  private async writeAll(sessions: ChatSession[]): Promise<void> {
    try {
      await FileSystem.writeAsStringAsync(CHAT_FILE, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.log('[LocalChatSessionRepository] No se pudo guardar historial:', error);
    }
  }
}

export const localChatSessionRepository = new LocalChatSessionRepository();
