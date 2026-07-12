import * as FileSystem from 'expo-file-system/legacy';
import { ClassTask, NewClassTask } from '../../domain/entities/ClassTask';
import { ClassTaskRepositoryPort } from '../../domain/ports/ClassTaskRepositoryPort';

const FILE_URI = `${FileSystem.documentDirectory || ''}aulaia_class_tasks.json`;

async function readAll(): Promise<ClassTask[]> {
  if (!FileSystem.documentDirectory) return [];
  const info = await FileSystem.getInfoAsync(FILE_URI);
  if (!info.exists) return [];
  try {
    const text = await FileSystem.readAsStringAsync(FILE_URI);
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(tasks: ClassTask[]): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(tasks, null, 2));
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export class LocalClassTaskRepository implements ClassTaskRepositoryPort {
  async listByUser(userId: string): Promise<ClassTask[]> {
    const tasks = await readAll();
    return tasks
      .filter((task) => task.userId === userId)
      .sort((a, b) => {
        const aTime = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime || b.updatedAt.localeCompare(a.updatedAt);
      });
  }

  async mergeForAudio(userId: string, incoming: NewClassTask[]): Promise<ClassTask[]> {
    const tasks = await readAll();
    const now = new Date().toISOString();
    const saved: ClassTask[] = [];

    for (const item of incoming) {
      const existing = tasks.find(
        (task) =>
          task.userId === userId &&
          task.audioNoteId === item.audioNoteId &&
          normalizeText(task.text) === normalizeText(item.text),
      );

      if (existing) {
        existing.subjectId = item.subjectId;
        existing.subjectName = item.subjectName;
        existing.subjectColor = item.subjectColor;
        existing.classTitle = item.classTitle;
        existing.details = item.details || null;
        existing.confidence = item.confidence ?? null;
        existing.dueAt = item.dueAt;
        existing.updatedAt = now;
        saved.push(existing);
        continue;
      }

      const task: ClassTask = {
        ...item,
        id: `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(task);
      saved.push(task);
    }

    await writeAll(tasks);
    return saved;
  }

  async update(
    userId: string,
    taskId: string,
    patch: Partial<Pick<ClassTask, 'text' | 'details' | 'dueAt' | 'completed'>>,
  ): Promise<ClassTask> {
    const tasks = await readAll();
    const index = tasks.findIndex((task) => task.id === taskId && task.userId === userId);
    if (index < 0) throw new Error('La tarea ya no existe.');

    tasks[index] = {
      ...tasks[index],
      ...patch,
      text: patch.text !== undefined ? patch.text.trim() : tasks[index].text,
      updatedAt: new Date().toISOString(),
    };
    await writeAll(tasks);
    return tasks[index];
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const tasks = await readAll();
    await writeAll(tasks.filter((task) => !(task.userId === userId && task.id === taskId)));
  }

  async deleteByAudio(userId: string, audioNoteId: string): Promise<void> {
    const tasks = await readAll();
    await writeAll(
      tasks.filter((task) => !(task.userId === userId && task.audioNoteId === audioNoteId)),
    );
  }
}
