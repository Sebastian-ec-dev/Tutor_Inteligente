import { env } from '../shared/config/env';

import { SupabaseAuthRepository } from '../infrastructure/supabase/SupabaseAuthRepository';
import { SupabaseSubjectRepository } from '../infrastructure/supabase/SupabaseSubjectRepository';
import { SupabaseAudioNoteRepository } from '../infrastructure/supabase/SupabaseAudioNoteRepository';
import { SupabaseProfileRepository } from '../infrastructure/supabase/SupabaseProfileRepository';
import { SupabaseClassroomMemberRepository } from '../infrastructure/supabase/SupabaseClassroomMemberRepository';

import { GeminiAIModelAdapter } from '../infrastructure/ai/GeminiAIModelAdapter';
import { GptMathAIModelAdapter } from '../infrastructure/ai/GptMathAIModelAdapter';
import { GeminiEmbeddingAdapter } from '../infrastructure/ai/GeminiEmbeddingAdapter';
import { GeminiAudioTranscriptionAdapter } from '../infrastructure/ai/GeminiAudioTranscriptionAdapter';
import { WhisperTranscriptionAdapter } from '../infrastructure/ai/WhisperTranscriptionAdapter';
import { AIModelRouter } from '../infrastructure/ai/AIModelRouter';
import { MockAIModelAdapter } from '../infrastructure/ai/mock/MockAIModelAdapter';
import { MockEmbeddingAdapter } from '../infrastructure/ai/mock/MockEmbeddingAdapter';
import { MockTranscriptionAdapter } from '../infrastructure/ai/mock/MockTranscriptionAdapter';

import { RegexPrivacyFilter } from '../infrastructure/privacy/RegexPrivacyFilter';
import { ExpoFileReaderAdapter } from '../infrastructure/expo/ExpoFileReaderAdapter';

import { LoginUseCase } from './usecases/auth/LoginUseCase';
import { RegisterUseCase } from './usecases/auth/RegisterUseCase';
import { LogoutUseCase } from './usecases/auth/LogoutUseCase';
import { GetSessionUseCase } from './usecases/auth/GetSessionUseCase';
import { ObserveAuthStateUseCase } from './usecases/auth/ObserveAuthStateUseCase';
import { ListSubjectsUseCase } from './usecases/subjects/ListSubjectsUseCase';
import { CreateSubjectUseCase } from './usecases/subjects/CreateSubjectUseCase';
import { UpdateSubjectUseCase } from './usecases/subjects/UpdateSubjectUseCase';
import { DeleteSubjectUseCase } from './usecases/subjects/DeleteSubjectUseCase';
import { ListAudioNotesUseCase } from './usecases/audio/ListAudioNotesUseCase';
import { ProcessAudioNoteUseCase } from './usecases/audio/ProcessAudioNoteUseCase';
import { AskTutorUseCase } from './usecases/chat/AskTutorUseCase';
import { GetProfileUseCase } from './usecases/profile/GetProfileUseCase';
import { UpdateProfileUseCase } from './usecases/profile/UpdateProfileUseCase';
import { ListClassroomMembersUseCase } from './usecases/classroom/ListClassroomMembersUseCase';
import { InviteClassroomMemberUseCase } from './usecases/classroom/InviteClassroomMemberUseCase';
import { UpdateClassroomMemberRoleUseCase } from './usecases/classroom/UpdateClassroomMemberRoleUseCase';
import { ListMyMembershipsUseCase } from './usecases/classroom/ListMyMembershipsUseCase';

const authRepository = new SupabaseAuthRepository();
const subjectRepository = new SupabaseSubjectRepository();
const audioNoteRepository = new SupabaseAudioNoteRepository();
const profileRepository = new SupabaseProfileRepository();
const classroomMemberRepository = new SupabaseClassroomMemberRepository();

const privacyFilter = new RegexPrivacyFilter();
const fileReader = new ExpoFileReaderAdapter();

const geminiTheoryModel = env.useMockAI
  ? new MockAIModelAdapter('Mock AI simulando Google Gemini Flash')
  : new GeminiAIModelAdapter();

const gptMathModel = env.useMockAI
  ? new MockAIModelAdapter('Mock AI simulando OpenAI GPT-4.1 mini / modo Light')
  : new GptMathAIModelAdapter(geminiTheoryModel);

const modelRouter = new AIModelRouter(geminiTheoryModel, gptMathModel);

const embeddingService = env.useMockAI
  ? new MockEmbeddingAdapter()
  : new GeminiEmbeddingAdapter();

const geminiTranscriptionFallback = new GeminiAudioTranscriptionAdapter(geminiTheoryModel);

const transcriber = env.useMockAI
  ? new MockTranscriptionAdapter()
  : new WhisperTranscriptionAdapter(geminiTranscriptionFallback);

export const loginUseCase = new LoginUseCase(authRepository);
export const registerUseCase = new RegisterUseCase(authRepository);
export const logoutUseCase = new LogoutUseCase(authRepository);
export const getSessionUseCase = new GetSessionUseCase(authRepository);
export const observeAuthStateUseCase = new ObserveAuthStateUseCase(authRepository);

export const listSubjectsUseCase = new ListSubjectsUseCase(authRepository, subjectRepository);
export const createSubjectUseCase = new CreateSubjectUseCase(authRepository, subjectRepository);
export const updateSubjectUseCase = new UpdateSubjectUseCase(subjectRepository);
export const deleteSubjectUseCase = new DeleteSubjectUseCase(subjectRepository);

export const getProfileUseCase = new GetProfileUseCase(authRepository, profileRepository);
export const updateProfileUseCase = new UpdateProfileUseCase(authRepository, profileRepository);
export const listClassroomMembersUseCase = new ListClassroomMembersUseCase(classroomMemberRepository);
export const inviteClassroomMemberUseCase = new InviteClassroomMemberUseCase(authRepository, classroomMemberRepository);
export const updateClassroomMemberRoleUseCase = new UpdateClassroomMemberRoleUseCase(classroomMemberRepository);
export const listMyMembershipsUseCase = new ListMyMembershipsUseCase(authRepository, classroomMemberRepository);

export const listAudioNotesUseCase = new ListAudioNotesUseCase(authRepository, audioNoteRepository);
export const processAudioNoteUseCase = new ProcessAudioNoteUseCase(
  authRepository,
  fileReader,
  transcriber,
  privacyFilter,
  modelRouter,
  embeddingService,
  audioNoteRepository,
);

export const askTutorUseCase = new AskTutorUseCase(
  authRepository,
  embeddingService,
  audioNoteRepository,
  privacyFilter,
  modelRouter,
);

export const aiModelRouter = modelRouter;
