import { env } from '../shared/config/env';

import { SupabaseAuthRepository } from '../infrastructure/supabase/SupabaseAuthRepository';
import { SupabaseSubjectRepository } from '../infrastructure/supabase/SupabaseSubjectRepository';
import { SupabaseAudioNoteRepository } from '../infrastructure/supabase/SupabaseAudioNoteRepository';
import { SupabaseProfileRepository } from '../infrastructure/supabase/SupabaseProfileRepository';
import { SupabaseClassroomMemberRepository } from '../infrastructure/supabase/SupabaseClassroomMemberRepository';
import { SupabaseClassScheduleRepository } from '../infrastructure/supabase/SupabaseClassScheduleRepository';
import { SupabaseClassTaskRepository } from '../infrastructure/supabase/SupabaseClassTaskRepository';

import { GeminiAIModelAdapter } from '../infrastructure/ai/GeminiAIModelAdapter';
import { GptMathAIModelAdapter } from '../infrastructure/ai/GptMathAIModelAdapter';
import { WhisperTranscriptionAdapter } from '../infrastructure/ai/WhisperTranscriptionAdapter';
import { AIModelRouter } from '../infrastructure/ai/AIModelRouter';
import { MockAIModelAdapter } from '../infrastructure/ai/mock/MockAIModelAdapter';
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
import { TranscribeAudioChunkUseCase } from './usecases/audio/TranscribeAudioChunkUseCase';
import { UpdateAudioNoteUseCase } from './usecases/audio/UpdateAudioNoteUseCase';
import { DeleteAudioNoteUseCase } from './usecases/audio/DeleteAudioNoteUseCase';
import { AskTutorUseCase } from './usecases/chat/AskTutorUseCase';
import { GetProfileUseCase } from './usecases/profile/GetProfileUseCase';
import { UpdateProfileUseCase } from './usecases/profile/UpdateProfileUseCase';
import { ListClassroomMembersUseCase } from './usecases/classroom/ListClassroomMembersUseCase';
import { InviteClassroomMemberUseCase } from './usecases/classroom/InviteClassroomMemberUseCase';
import { UpdateClassroomMemberRoleUseCase } from './usecases/classroom/UpdateClassroomMemberRoleUseCase';
import { ListMyMembershipsUseCase } from './usecases/classroom/ListMyMembershipsUseCase';
import { CreateJoinInviteUseCase } from './usecases/classroom/CreateJoinInviteUseCase';
import { JoinSubjectByTokenUseCase } from './usecases/classroom/JoinSubjectByTokenUseCase';
import { RemoveClassroomMemberUseCase } from './usecases/classroom/RemoveClassroomMemberUseCase';
import { DeleteClassroomInviteUseCase } from './usecases/classroom/DeleteClassroomInviteUseCase';
import { ListClassScheduleUseCase } from './usecases/schedule/ListClassScheduleUseCase';
import { CreateClassScheduleUseCase } from './usecases/schedule/CreateClassScheduleUseCase';
import { DeleteClassScheduleUseCase } from './usecases/schedule/DeleteClassScheduleUseCase';
import { UpdateClassScheduleUseCase } from './usecases/schedule/UpdateClassScheduleUseCase';
import { FindActiveClassScheduleUseCase } from './usecases/schedule/FindActiveClassScheduleUseCase';
import { ListClassTasksUseCase } from './usecases/tasks/ListClassTasksUseCase';
import { SaveDetectedTasksUseCase } from './usecases/tasks/SaveDetectedTasksUseCase';
import { UpdateClassTaskUseCase } from './usecases/tasks/UpdateClassTaskUseCase';
import { DeleteClassTaskUseCase } from './usecases/tasks/DeleteClassTaskUseCase';

const authRepository = new SupabaseAuthRepository();
const subjectRepository = new SupabaseSubjectRepository();
const audioNoteRepository = new SupabaseAudioNoteRepository();
const profileRepository = new SupabaseProfileRepository();
const classroomMemberRepository = new SupabaseClassroomMemberRepository();
const classScheduleRepository = new SupabaseClassScheduleRepository();
const classTaskRepository = new SupabaseClassTaskRepository();

const privacyFilter = new RegexPrivacyFilter();
const fileReader = new ExpoFileReaderAdapter();

const geminiTheoryModel = env.useMockAI
  ? new MockAIModelAdapter('Mock AI simulando Google Gemini Flash')
  : new GeminiAIModelAdapter();

const gptMathModel = env.useMockAI
  ? new MockAIModelAdapter('Mock AI simulando OpenAI GPT-4.1 mini / modo Light')
  : new GptMathAIModelAdapter(geminiTheoryModel);

const modelRouter = new AIModelRouter(geminiTheoryModel, gptMathModel);


const transcriber = env.useMockAI
  ? new MockTranscriptionAdapter()
  : new WhisperTranscriptionAdapter();

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
export const createJoinInviteUseCase = new CreateJoinInviteUseCase(authRepository, classroomMemberRepository);
export const joinSubjectByTokenUseCase = new JoinSubjectByTokenUseCase(classroomMemberRepository);
export const removeClassroomMemberUseCase = new RemoveClassroomMemberUseCase(classroomMemberRepository);
export const deleteClassroomInviteUseCase = new DeleteClassroomInviteUseCase(classroomMemberRepository);


export const listClassScheduleUseCase = new ListClassScheduleUseCase(
  authRepository,
  classScheduleRepository,
);
export const createClassScheduleUseCase = new CreateClassScheduleUseCase(
  authRepository,
  subjectRepository,
  classScheduleRepository,
);
export const deleteClassScheduleUseCase = new DeleteClassScheduleUseCase(
  authRepository,
  classScheduleRepository,
);
export const updateClassScheduleUseCase = new UpdateClassScheduleUseCase(
  authRepository,
  subjectRepository,
  classScheduleRepository,
);
export const findActiveClassScheduleUseCase = new FindActiveClassScheduleUseCase(
  authRepository,
  classScheduleRepository,
);


export const listClassTasksUseCase = new ListClassTasksUseCase(
  authRepository,
  classTaskRepository,
);
export const saveDetectedTasksUseCase = new SaveDetectedTasksUseCase(
  authRepository,
  classTaskRepository,
);
export const updateClassTaskUseCase = new UpdateClassTaskUseCase(
  authRepository,
  classTaskRepository,
);
export const deleteClassTaskUseCase = new DeleteClassTaskUseCase(
  authRepository,
  classTaskRepository,
);

export const listAudioNotesUseCase = new ListAudioNotesUseCase(authRepository, audioNoteRepository);
export const updateAudioNoteUseCase = new UpdateAudioNoteUseCase(audioNoteRepository);
export const deleteAudioNoteUseCase = new DeleteAudioNoteUseCase(audioNoteRepository);
export const transcribeAudioChunkUseCase = new TranscribeAudioChunkUseCase(
  transcriber,
  privacyFilter,
);

export const processAudioNoteUseCase = new ProcessAudioNoteUseCase(
  authRepository,
  fileReader,
  transcriber,
  privacyFilter,
  modelRouter,
  audioNoteRepository,
);

export const askTutorUseCase = new AskTutorUseCase(
  authRepository,
  audioNoteRepository,
  privacyFilter,
  modelRouter,
);

export const aiModelRouter = modelRouter;
