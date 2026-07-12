import * as FileSystem from 'expo-file-system/legacy';
import {
  ClassSchedule,
  isValidTimeString,
  normalizeTimeString,
} from '../../domain/entities/ClassSchedule';
import { ClassScheduleRepositoryPort } from '../../domain/ports/ClassScheduleRepositoryPort';

const FILE_URI = `${FileSystem.documentDirectory || ''}aulaia_class_schedule.json`;

function normalizeEntry(raw: any): ClassSchedule | null {
  const dayOfWeek = Number(raw?.dayOfWeek);
  const startTime = normalizeTimeString(String(raw?.startTime || ''));
  const endTime = normalizeTimeString(String(raw?.endTime || ''));

  if (
    !raw?.id ||
    !raw?.userId ||
    !raw?.subjectId ||
    !raw?.subjectName ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    !isValidTimeString(startTime) ||
    !isValidTimeString(endTime)
  ) {
    return null;
  }

  return {
    ...raw,
    dayOfWeek,
    startTime,
    endTime,
  } as ClassSchedule;
}

async function readAll(): Promise<ClassSchedule[]> {
  if (!FileSystem.documentDirectory) return [];
  const info = await FileSystem.getInfoAsync(FILE_URI);
  if (!info.exists) return [];

  try {
    const content = await FileSystem.readAsStringAsync(FILE_URI);
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter((entry): entry is ClassSchedule => !!entry);
  } catch {
    return [];
  }
}

async function writeAll(entries: ClassSchedule[]): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  await FileSystem.writeAsStringAsync(FILE_URI, JSON.stringify(entries, null, 2));
}

export class LocalClassScheduleRepository implements ClassScheduleRepositoryPort {
  async listByUser(userId: string): Promise<ClassSchedule[]> {
    const entries = await readAll();
    return entries
      .filter((entry) => entry.userId === userId)
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      });
  }

  async save(entry: ClassSchedule): Promise<ClassSchedule> {
    const normalized = normalizeEntry(entry);
    if (!normalized) throw new Error('El horario contiene un día o una hora inválida.');

    const entries = await readAll();
    const index = entries.findIndex((item) => item.id === normalized.id);
    if (index >= 0) entries[index] = normalized;
    else entries.push(normalized);
    await writeAll(entries);
    return normalized;
  }

  async delete(userId: string, scheduleId: string): Promise<void> {
    const entries = await readAll();
    await writeAll(
      entries.filter(
        (entry) => !(entry.userId === userId && entry.id === scheduleId),
      ),
    );
  }
}
