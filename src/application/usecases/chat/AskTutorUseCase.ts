import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { ConversationMessage } from '../../../domain/entities/ConversationMessage';
import { AIProvider } from '../../../domain/entities/AIProvider';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';
import { AIModelRouterPort } from '../../../domain/ports/AIModelRouterPort';
import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { buildConversationHistory, buildTutorPrompt } from '../../promptBuilders';

const MAX_CONTEXT_CHARS = 9000;
const MAX_TRANSCRIPT_CHARS_PER_NOTE = 5000;

export class AskTutorUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly audioNoteRepository: AudioNoteRepositoryPort,
    private readonly privacyFilter: PrivacyFilterPort,
    private readonly modelRouter: AIModelRouterPort,
  ) {}

  async execute(input: {
    question: string;
    subjectId: string;
    history: ConversationMessage[];
    contentType?: ClassContentType;
    aiProvider?: AIProvider;
    classId?: string;
  }): Promise<string> {
    const question = input.question.trim();
    if (!question) throw new Error('Escribe una pregunta');
    if (!input.subjectId) throw new Error('Selecciona una materia primero');
    if (!input.classId) throw new Error('Selecciona una clase/tema antes de preguntar');

    const userId = await this.authRepository.getCurrentUserId();
    const cleanQuestion = this.privacyFilter.clean(question);

    const notes = await this.audioNoteRepository.listBySubject(input.subjectId, userId);
    const selectedNote = notes.find((note) => note.id === input.classId);

    const contextText = selectedNote
      ? buildDirectContext([
          {
            title: selectedNote.title,
            summary: this.privacyFilter.clean(selectedNote.summary || ''),
            transcript: this.privacyFilter.clean(selectedNote.transcript || ''),
            createdAt: selectedNote.createdAt,
          },
        ])
      : '';

    const safeContext = contextText || 'No existe contexto procesado para la clase seleccionada todavía.';
    const history = buildConversationHistory(input.history);
    const prompt = `${history}${buildTutorPrompt(safeContext, cleanQuestion)}\n\nRegla principal: responde únicamente con base en la clase/tema seleccionado. No uses información de otras clases de la materia. Si el contexto de esta clase no alcanza, dilo claramente.`;

    const model = this.modelRouter.selectModel(input.contentType || 'general', input.aiProvider);
    const response = await model.generateText(prompt);

    return this.privacyFilter.clean(response || 'Lo siento, no pude generar una respuesta.');
  }
}

function buildDirectContext(notes: Array<{ title: string; summary?: string | null; transcript?: string | null; createdAt?: string | null }>): string {
  const orderedNotes = [...notes]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 1);

  const context = orderedNotes.map((note, index) => {
    const transcriptSnippet = (note.transcript || '').slice(0, MAX_TRANSCRIPT_CHARS_PER_NOTE);
    return [
      `CLASE SELECCIONADA ${index + 1}: ${note.title}`,
      note.summary ? `Resumen estructurado:\n${note.summary}` : '',
      transcriptSnippet ? `Transcripción de la clase:\n${transcriptSnippet}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n---\n\n');

  return context.slice(0, MAX_CONTEXT_CHARS);
}
