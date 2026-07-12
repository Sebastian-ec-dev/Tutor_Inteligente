export type DetectedTaskCandidate = {
  text: string;
  details?: string | null;
  dueAt: string | null;
  confidence?: number | null;
};

/**
 * Reads tasks that were already validated by an AI response and stored in the
 * `deberes` field. It intentionally does NOT scan the transcript for keywords;
 * doing so caused false positives when a teacher only mentioned the word
 * "tarea" as an example or as part of an explanation.
 */
export function detectTaskCandidates(input: {
  deberes?: string | null;
  transcript?: string | null;
  summary?: string | null;
}): DetectedTaskCandidate[] {
  const value = (input.deberes || '').trim();
  if (!value || /no se (identificaron|detectaron) tareas/i.test(value)) return [];

  const lines = value
    .replace(/^##\s*Tareas (identificadas por IA|detectadas)\s*/gim, '')
    .split(/\n(?=\s*[-*•▪◦]\s+)/)
    .map((line) => line.replace(/^\s*[-*•▪◦]\s*/, '').trim())
    .filter(Boolean);

  const candidates = lines.map(parseStoredTaskLine).filter(Boolean) as DetectedTaskCandidate[];
  return deduplicateCandidates(candidates).slice(0, 10);
}

/** Parses the strict JSON produced by the dedicated AI task-classifier prompt. */
export function parseAITaskDetectionResponse(raw: string): DetectedTaskCandidate[] {
  if (!raw?.trim()) return [];

  const jsonText = extractJsonObject(raw);
  if (!jsonText) return [];

  try {
    const parsed = JSON.parse(jsonText);
    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];

    const candidates = tasks
      .filter((task: any) => task && task.isTask === true)
      .map((task: any): DetectedTaskCandidate | null => {
        const confidence = clampConfidence(task.confidence);
        // A conservative threshold prevents ambiguous classroom phrases from
        // becoming pending tasks automatically.
        if (confidence !== null && confidence < 0.72) return null;

        const text = cleanTaskText(task.title || task.task || task.text || '');
        if (!text) return null;

        const details = cleanTaskDetails(task.details || task.description || task.instruction || '');
        const dueAt = parseAIDueDate(task.dueDate || task.due_at || task.deadline || null);

        return {
          text,
          details: details && details.toLowerCase() !== text.toLowerCase() ? details : null,
          dueAt,
          confidence,
        };
      })
      .filter(Boolean) as DetectedTaskCandidate[];

    return deduplicateCandidates(candidates).slice(0, 10);
  } catch {
    return [];
  }
}

export function formatDetectedTasks(candidates: DetectedTaskCandidate[]): string {
  if (!candidates.length) return 'No se identificaron tareas explícitas mediante IA.';

  return candidates
    .map((task) => {
      const detail = task.details ? `\n  Detalle: ${task.details}` : '';
      const due = task.dueAt ? `\n  Fecha: ${formatDate(task.dueAt)}` : '';
      return `- ${task.text}${detail}${due}`;
    })
    .join('\n');
}

export function parseTaskDueDate(text: string): Date | null {
  const lower = text.toLowerCase();
  const current = new Date();
  const currentYear = current.getFullYear();

  if (/\bmañana\b/.test(lower)) {
    const date = new Date(current);
    date.setDate(date.getDate() + 1);
    date.setHours(23, 59, 0, 0);
    return date;
  }

  const numeric = lower.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : currentYear;
    const date = new Date(year, Number(numeric[2]) - 1, Number(numeric[1]), 23, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const months: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9,
    noviembre: 10, diciembre: 11,
  };
  const written = lower.match(/\b(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?/i);
  if (written && months[written[2]] !== undefined) {
    const date = new Date(Number(written[3] || currentYear), months[written[2]], Number(written[1]), 23, 59);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function parseEditableDueDate(value: string): string | null {
  const clean = value.trim();
  if (!clean) return null;
  const match = clean.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) throw new Error('Use la fecha DD/MM/AAAA o déjela vacía.');
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 23, 59);
  if (Number.isNaN(date.getTime())) throw new Error('La fecha ingresada no es válida.');
  return date.toISOString();
}

export function formatEditableDueDate(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function extractJsonObject(value: string): string | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced?.startsWith('{')) return fenced;

  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  return value.slice(start, end + 1);
}

function parseStoredTaskLine(line: string): DetectedTaskCandidate | null {
  const parts = line.split(/\n\s*(?:Detalle|Fecha):\s*/i);
  const text = cleanTaskText(parts[0]);
  if (!text) return null;

  const detailMatch = line.match(/\n\s*Detalle:\s*([^\n]+)/i);
  const dateMatch = line.match(/\n\s*Fecha:\s*([^\n]+)/i);
  return {
    text,
    details: detailMatch ? cleanTaskDetails(detailMatch[1]) : null,
    dueAt: dateMatch ? parseTaskDueDate(dateMatch[1])?.toISOString() || null : null,
    confidence: null,
  };
}

function parseAIDueDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const clean = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [year, month, day] = clean.split('-').map(Number);
    const date = new Date(year, month - 1, day, 23, 59, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return parseTaskDueDate(clean)?.toISOString() || null;
}

function cleanTaskText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/^#+\s*/, '')
    .replace(/^[-*•▪◦]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function cleanTaskDetails(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function clampConfidence(value: unknown): number | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0, number));
}

function deduplicateCandidates(candidates: DetectedTaskCandidate[]): DetectedTaskCandidate[] {
  const unique = new Map<string, DetectedTaskCandidate>();
  for (const candidate of candidates) {
    const key = candidate.text.toLowerCase().replace(/[^a-záéíóúñ0-9]+/gi, ' ').trim();
    if (!key || unique.has(key)) continue;
    unique.set(key, candidate);
  }
  return [...unique.values()];
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}
