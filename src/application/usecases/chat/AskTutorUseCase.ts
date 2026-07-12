import { AIProvider } from '../../../domain/entities/AIProvider';
import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { ConversationMessage } from '../../../domain/entities/ConversationMessage';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';
import { AIModelRouterPort } from '../../../domain/ports/AIModelRouterPort';
import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { env } from '../../../shared/config/env';
import {
  buildConversationHistory,
  buildTutorPrompt,
} from '../../promptBuilders';

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
    subjectName?: string;
    history: ConversationMessage[];
    contentType?: ClassContentType;
    classId?: string;
    aiProvider?: AIProvider;
    webSearchEnabled?: boolean;
    attachment?: {
      mimeType: string;
      base64Data: string;
    };
  }): Promise<string> {
    const question = input.question.trim();
    if (!question) throw new Error('Escribe una pregunta');
    if (!input.subjectId) throw new Error('Selecciona una materia primero');
    if (!input.classId) throw new Error('Selecciona una clase antes de preguntar');

    let resolvedContentType = input.contentType || 'general';
    if (input.attachment?.mimeType?.startsWith('image/')) {
      resolvedContentType = 'image';
    }

    const userId = await this.authRepository.getCurrentUserId();
    const cleanQuestion = this.privacyFilter.clean(question);
    const notes = await this.audioNoteRepository.listBySubject(input.subjectId, userId);
    const selectedNote = notes.find((note) => note.id === input.classId);

    if (!selectedNote) {
      throw new Error('La clase seleccionada ya no existe o no está disponible');
    }

    const contextText = buildDirectContext([
      {
        title: selectedNote.title,
        summary: this.privacyFilter.clean(selectedNote.summary || ''),
        transcript: this.privacyFilter.clean(selectedNote.transcript || ''),
        createdAt: selectedNote.createdAt,
      },
    ]);

    const history = buildConversationHistory(input.history);
    const webSearchEnabled =
      input.aiProvider === 'openai' &&
      input.webSearchEnabled !== false &&
      env.enableTutorWebSearch;

    const prompt = `${history}${buildTutorPrompt({
      contextText,
      userMessage: cleanQuestion,
      subjectName: input.subjectName,
      classTitle: selectedNote.title,
      webSearchEnabled,
    })}`;

    const provider = input.aiProvider || 'gemini';
    const model = this.modelRouter.selectModelByProvider(provider, resolvedContentType);
    const response = await model.generateText(prompt, input.attachment, {
      temperature: env.aiChatTemperature,
      enableWebSearch: webSearchEnabled,
    });

    return this.privacyFilter.clean(
      response || 'Lo siento, no pude generar una respuesta.',
    );
  }
}

function buildDirectContext(
  notes: Array<{
    title: string;
    summary?: string | null;
    transcript?: string | null;
    createdAt?: string | null;
  }>,
): string {
  const orderedNotes = [...notes]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    )
    .slice(0, 1);

  const context = orderedNotes
    .map((note, index) => {
      const transcriptSnippet = (note.transcript || '').slice(
        0,
        MAX_TRANSCRIPT_CHARS_PER_NOTE,
      );
      return [
        `CLASE SELECCIONADA ${index + 1}: ${note.title}`,
        note.summary ? `Resumen estructurado:\n${note.summary}` : '',
        transcriptSnippet
          ? `Transcripción de la clase:\n${transcriptSnippet}`
          : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n---\n\n');

  return context.slice(0, MAX_CONTEXT_CHARS);
}
