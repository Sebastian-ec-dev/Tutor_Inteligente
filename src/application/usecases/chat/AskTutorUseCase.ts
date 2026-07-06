import { ClassContentType } from '../../../domain/entities/ClassContentType';
import { ConversationMessage } from '../../../domain/entities/ConversationMessage';
import { AuthRepositoryPort } from '../../../domain/ports/AuthRepositoryPort';
import { AudioNoteRepositoryPort } from '../../../domain/ports/AudioNoteRepositoryPort';
import { AIModelRouterPort } from '../../../domain/ports/AIModelRouterPort';
import { EmbeddingPort } from '../../../domain/ports/EmbeddingPort';
import { PrivacyFilterPort } from '../../../domain/ports/PrivacyFilterPort';
import { buildConversationHistory, buildTutorPrompt } from '../../promptBuilders';

export class AskTutorUseCase {
  constructor(
    private readonly authRepository: AuthRepositoryPort,
    private readonly embeddingService: EmbeddingPort,
    private readonly audioNoteRepository: AudioNoteRepositoryPort,
    private readonly privacyFilter: PrivacyFilterPort,
    private readonly modelRouter: AIModelRouterPort,
  ) {}

  async execute(input: {
    question: string;
    subjectId: string;
    history: ConversationMessage[];
    contentType?: ClassContentType;
  }): Promise<string> {
    const question = input.question.trim();
    if (!question) throw new Error('Escribe una pregunta');
    if (!input.subjectId) throw new Error('Selecciona una materia primero');

    const userId = await this.authRepository.getCurrentUserId();
    const cleanQuestion = this.privacyFilter.clean(question);
    const queryEmbedding = await this.embeddingService.generateEmbedding(cleanQuestion);

    const matches = await this.audioNoteRepository.searchSimilar({
      userId,
      subjectId: input.subjectId,
      embedding: queryEmbedding,
      threshold: 0.5,
      count: 5,
    });

    const contextText = matches.map((match) => this.privacyFilter.clean(match.content)).join('\n\n');
    const history = buildConversationHistory(input.history);
    const prompt = `${history}${buildTutorPrompt(contextText, cleanQuestion)}`;

    const model = this.modelRouter.selectModel(input.contentType || 'general');
    const response = await model.generateText(prompt);

    return this.privacyFilter.clean(response || 'Lo siento, no pude generar una respuesta.');
  }
}
