export type ClassSchedule = {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  teacher?: string | null;
  color?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  createdAt: string;
};

export const WEEK_DAYS = [
  { value: 1, short: 'Lun', label: 'Lunes' },
  { value: 2, short: 'Mar', label: 'Martes' },
  { value: 3, short: 'Mié', label: 'Miércoles' },
  { value: 4, short: 'Jue', label: 'Jueves' },
  { value: 5, short: 'Vie', label: 'Viernes' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
] as const;

export function getWeekDayLabel(dayOfWeek: number): string {
  return WEEK_DAYS.find((day) => day.value === Number(dayOfWeek))?.label || 'Día';
}

export function normalizeTimeString(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  let hour = 0;
  let minute = 0;

  if (raw.includes(':')) {
    const [hourPart = '0', minutePart = '0'] = raw.split(':');
    hour = Number(hourPart.replace(/\D/g, '') || '0');
    minute = Number(minutePart.replace(/\D/g, '') || '0');
  } else {
    const digits = raw.replace(/\D/g, '').slice(0, 4);
    if (!digits) return '';

    if (digits.length <= 2) {
      hour = Number(digits);
    } else if (digits.length === 3) {
      const firstTwo = Number(digits.slice(0, 2));
      if (firstTwo <= 23) {
        hour = firstTwo;
        minute = Number(digits.slice(2).padEnd(2, '0'));
      } else {
        hour = Number(digits.slice(0, 1));
        minute = Number(digits.slice(1));
      }
    } else {
      hour = Number(digits.slice(0, 2));
      minute = Number(digits.slice(2));
    }
  }

  hour = Math.min(23, Math.max(0, Number.isFinite(hour) ? hour : 0));
  minute = Math.min(59, Math.max(0, Number.isFinite(minute) ? minute : 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function timeToMinutes(time: string): number {
  const normalized = normalizeTimeString(time);
  if (!normalized || !isValidTimeString(normalized)) return Number.NaN;
  const [hour, minute] = normalized.split(':').map(Number);
  return hour * 60 + minute;
}

export function isScheduleActive(entry: ClassSchedule, date: Date): boolean {
  if (Number(entry.dayOfWeek) !== date.getDay()) return false;
  const start = timeToMinutes(entry.startTime);
  const end = timeToMinutes(entry.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

  const now = date.getHours() * 60 + date.getMinutes();
  return now >= start && now < end;
}

export function findNextSchedule(
  entries: ClassSchedule[],
  from: Date,
): { entry: ClassSchedule; date: Date } | null {
  let nearest: { entry: ClassSchedule; date: Date } | null = null;

  entries.forEach((entry) => {
    const normalizedStart = normalizeTimeString(entry.startTime);
    if (!isValidTimeString(normalizedStart)) return;

    for (let offset = 0; offset < 8; offset += 1) {
      const candidate = new Date(from);
      candidate.setHours(0, 0, 0, 0);
      candidate.setDate(candidate.getDate() + offset);
      if (candidate.getDay() !== Number(entry.dayOfWeek)) continue;

      const [hour, minute] = normalizedStart.split(':').map(Number);
      candidate.setHours(hour, minute, 0, 0);
      if (candidate.getTime() <= from.getTime()) continue;

      if (!nearest || candidate.getTime() < nearest.date.getTime()) {
        nearest = { entry: { ...entry, startTime: normalizedStart }, date: candidate };
      }
      break;
    }
  });

  return nearest;
}
