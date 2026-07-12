import { NewSubject, Subject, UpdateSubject } from '../../domain/entities/Subject';
import { SubjectRepositoryPort } from '../../domain/ports/SubjectRepositoryPort';
import { supabase } from './supabaseClient';

const SUBJECT_SELECT = 'id, name, user_id, teacher, description, color, icon, created_at';

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    teacher: row.teacher,
    description: row.description,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
  };
}

export class SupabaseSubjectRepository implements SubjectRepositoryPort {
  async listByUser(userId: string): Promise<Subject[]> {
    const { data: ownData, error: ownError } = await supabase
      .from('subjects')
      .select(SUBJECT_SELECT)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownError) throw new Error(ownError.message);

    const { data: memberData, error: memberError } = await supabase
      .from('subject_members')
      .select(`subjects:subject_id(${SUBJECT_SELECT})`)
      .eq('user_id', userId);

    if (memberError) {
      // Si aún no ejecutaste el SQL colaborativo, al menos se muestran las materias propias.
      return (ownData || []).map(mapSubject);
    }

    const joinedSubjects = (memberData || [])
      .map((row: any) => (Array.isArray(row.subjects) ? row.subjects[0] : row.subjects))
      .filter(Boolean);

    const byId = new Map<string, Subject>();
    [...(ownData || []), ...joinedSubjects].forEach((row) => {
      const subject = mapSubject(row);
      byId.set(subject.id, subject);
    });

    return Array.from(byId.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async create(input: NewSubject): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .insert([
        {
          name: input.name,
          user_id: input.userId,
          teacher: input.teacher || null,
          description: input.description || null,
          color: input.color || '#2563EB',
          icon: input.icon || '📚',
        },
      ])
      .select(SUBJECT_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return mapSubject(data);
  }

  async update(input: UpdateSubject): Promise<Subject> {
    const { data, error } = await supabase
      .from('subjects')
      .update({
        name: input.name,
        teacher: input.teacher || null,
        description: input.description || null,
        color: input.color || '#2563EB',
        icon: input.icon || '📚',
      })
      .eq('id', input.id)
      .select(SUBJECT_SELECT)
      .single();

    if (error) throw new Error(error.message);
    return mapSubject(data);
  }

  async delete(subjectId: string): Promise<void> {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId);

    if (error) throw new Error(error.message);
  }
}
