import { ClassSchedule } from '../../domain/entities/ClassSchedule';
import { ClassScheduleRepositoryPort } from '../../domain/ports/ClassScheduleRepositoryPort';
import { supabase } from './supabaseClient';

const TABLE = 'class_schedules';

function mapRow(row: any): ClassSchedule {
  return {
    id: row.id,
    userId: row.user_id,
    subjectId: row.subject_id,
    subjectName: row.subject_name,
    teacher: row.teacher ?? null,
    color: row.color ?? null,
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
    createdAt: row.created_at,
  };
}

export class SupabaseClassScheduleRepository implements ClassScheduleRepositoryPort {
  async listByUser(userId: string): Promise<ClassSchedule[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(mapRow);
  }

  async save(entry: ClassSchedule): Promise<ClassSchedule> {
    const payload = {
      id: entry.id,
      user_id: entry.userId,
      subject_id: entry.subjectId,
      subject_name: entry.subjectName,
      teacher: entry.teacher ?? null,
      color: entry.color ?? '#2563EB',
      day_of_week: entry.dayOfWeek,
      start_time: entry.startTime,
      end_time: entry.endTime,
      created_at: entry.createdAt,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return mapRow(data);
  }

  async delete(userId: string, scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  }
}
