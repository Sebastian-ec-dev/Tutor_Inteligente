import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  Bot,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  FileText,
  Globe2,
  Image as ImageIcon,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import MessageBubble from '../utils/MessageBubble';
import AppBottomBar from '../components/ui/AppBottomBar';
import TypingIndicator from '../utils/burbujaEscribiendo';
import { Subject } from '../domain/entities/Subject';
import { AudioNote } from '../domain/entities/AudioNote';
import { ConversationMessage } from '../domain/entities/ConversationMessage';
import { ClassContentType } from '../domain/entities/ClassContentType';
import { ChatSession } from '../domain/entities/ChatSession';
import { AIProvider, AI_PROVIDER_LABELS } from '../domain/entities/AIProvider';
import {
  askTutorUseCase,
  listAudioNotesUseCase,
  listSubjectsUseCase,
} from '../application/container';
import { chatSessionRepository } from '../infrastructure/supabase/SupabaseChatSessionRepository';
import { supabase } from '../infrastructure/supabase/supabaseClient';
import { PropsList } from '../navigation/AppNavigator';
import { useAppTheme } from '../components/ui/ThemeContext';

const ALL_SUBJECTS = '__all_subjects__';

type ChatMessage = ConversationMessage;
type ChatView = 'list' | 'conversation';
type ConfigMode = 'new' | 'edit';

type PendingAttachment = {
  mimeType: string;
  base64Data: string;
  name: string;
};

function welcomeMessage(classTitle?: string): ChatMessage {
  return {
    id: `welcome_${Date.now()}`,
    sender: 'bot',
    text: classTitle
      ? `¡Hola! Este chat está dedicado a “${classTitle}”. Mantendré la conversación enfocada en esta clase y usaré sus apuntes como contexto.`
      : 'Selecciona una materia y una clase para crear una tutoría personalizada.',
  };
}

function buildChatTitle(question: string): string {
  const clean = question.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Nueva conversación';
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function getPastelBorder(color: string | null | undefined, fallback: string): string {
  if (!color) return fallback;
  const clean = color.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return `${clean}66`;
  return fallback;
}

function getSessionPreview(session: ChatSession): string {
  const lastMessage = [...session.messages]
    .reverse()
    .find((message) => message.text && !message.text.startsWith('¡Hola!'));
  const clean = lastMessage?.text?.replace(/\s+/g, ' ').trim() || 'Conversación preparada';
  return clean.length > 62 ? `${clean.slice(0, 62)}…` : clean;
}

export default function ChatbotScreen() {
  const route = useRoute<RouteProp<PropsList, 'Chatbot'>>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const [view, setView] = useState<ChatView>('list');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentClasses, setCurrentClasses] = useState<AudioNote[]>([]);
  const [subjectFilter, setSubjectFilter] = useState(ALL_SUBJECTS);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [chatSearch, setChatSearch] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  const [configVisible, setConfigVisible] = useState(false);
  const [configMode, setConfigMode] = useState<ConfigMode>('new');
  const [configSubjectId, setConfigSubjectId] = useState('');
  const [configClassId, setConfigClassId] = useState('');
  const [configClasses, setConfigClasses] = useState<AudioNote[]>([]);
  const [configProvider, setConfigProvider] = useState<AIProvider>('gemini');
  const [configWebSearch, setConfigWebSearch] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  const [actionSession, setActionSession] = useState<ChatSession | null>(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const currentSession = sessions.find((item) => item.id === currentSessionId) || null;
  const selectedSubject = subjects.find((item) => item.id === currentSession?.subjectId);
  const selectedClass = currentClasses.find((item) => item.id === currentSession?.classId);

  useEffect(() => {
    initialize().catch((error) => {
      console.log('[ChatbotScreen] Inicialización:', error);
      Alert.alert('Tutor IA', error.message || String(error));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSessions().catch(() => undefined);
    }, []),
  );

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (view !== 'conversation') return;
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [messages, loading, view]);

  async function initialize() {
    const [subjectData, sessionData] = await Promise.all([
      listSubjectsUseCase.execute(),
      chatSessionRepository.listAll(),
    ]);
    setSubjects(subjectData);
    setSessions(sessionData);

    const requestedSubjectId = route.params?.subjectId;
    const requestedClassId = route.params?.classId;
    if (requestedSubjectId && requestedClassId) {
      const existing = sessionData.find(
        (session) =>
          session.subjectId === requestedSubjectId && session.classId === requestedClassId,
      );
      if (existing) {
        await openSession(existing, subjectData);
      } else {
        await openNewChatConfig(requestedSubjectId, requestedClassId, subjectData);
      }
      return;
    }

    setView('list');
  }

  async function refreshSessions() {
    const next = await chatSessionRepository.listAll();
    setSessions(next);
    return next;
  }

  async function openSession(session: ChatSession, sourceSubjects = subjects) {
    const classData = await listAudioNotesUseCase.execute(session.subjectId);
    setCurrentClasses(classData);
    setCurrentSessionId(session.id);
    setMessages(session.messages.length ? session.messages : [welcomeMessage(session.classTitle)]);
    setPendingAttachment(null);
    setInputText('');
    setView('conversation');

    if (!sourceSubjects.some((item) => item.id === session.subjectId)) {
      const latestSubjects = await listSubjectsUseCase.execute();
      setSubjects(latestSubjects);
    }
  }

  async function openNewChatConfig(
    preferredSubjectId?: string,
    preferredClassId?: string,
    sourceSubjects = subjects,
  ) {
    if (!sourceSubjects.length) {
      Alert.alert('No hay materias', 'Cree una materia y procese una clase antes de iniciar el Tutor IA.');
      return;
    }

    const subjectId =
      preferredSubjectId && sourceSubjects.some((item) => item.id === preferredSubjectId)
        ? preferredSubjectId
        : sourceSubjects[0].id;
    const classData = await listAudioNotesUseCase.execute(subjectId);
    setConfigMode('new');
    setEditingSessionId(null);
    setConfigSubjectId(subjectId);
    setConfigClasses(classData);
    setConfigClassId(
      preferredClassId && classData.some((item) => item.id === preferredClassId)
        ? preferredClassId
        : classData[0]?.id || '',
    );
    setConfigProvider('gemini');
    setConfigWebSearch(false);
    setConfigVisible(true);
  }

  async function changeConfigSubject(nextSubjectId: string) {
    setConfigSubjectId(nextSubjectId);
    setConfigClassId('');
    if (!nextSubjectId) {
      setConfigClasses([]);
      return;
    }
    try {
      const classData = await listAudioNotesUseCase.execute(nextSubjectId);
      setConfigClasses(classData);
      setConfigClassId(classData[0]?.id || '');
    } catch (error: any) {
      setConfigClasses([]);
      Alert.alert('No se pudieron cargar las clases', error.message || String(error));
    }
  }

  function changeProvider(provider: AIProvider) {
    setConfigProvider(provider);
    if (provider !== 'openai') setConfigWebSearch(false);
  }

  async function createOrUpdateChat() {
    if (!configSubjectId || !configClassId) {
      Alert.alert('Seleccione una clase', 'Elija una materia y una clase o audio procesado.');
      return;
    }

    const classItem = configClasses.find((item) => item.id === configClassId);
    if (!classItem) {
      Alert.alert('Clase no disponible', 'La clase seleccionada ya no está disponible.');
      return;
    }

    const now = new Date().toISOString();
    if (configMode === 'edit' && editingSessionId) {
      const previous = sessions.find((session) => session.id === editingSessionId);
      if (!previous) return;
      const updated: ChatSession = {
        ...previous,
        subjectId: configSubjectId,
        classId: configClassId,
        classTitle: classItem.title,
        contentType: classItem.contentType || 'general',
        aiProvider: configProvider,
        webSearchEnabled: configProvider === 'openai' && configWebSearch,
        updatedAt: now,
      };
      await chatSessionRepository.upsert(updated);
      setConfigVisible(false);
      setActionSession(null);
      await refreshSessions();
      if (currentSessionId === updated.id) await openSession(updated);
      return;
    }

    const newSession: ChatSession = {
      id: `chat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      subjectId: configSubjectId,
      classId: configClassId,
      classTitle: classItem.title,
      title: classItem.title || 'Nueva conversación',
      messages: [welcomeMessage(classItem.title)],
      contentType: classItem.contentType || 'general',
      aiProvider: configProvider,
      webSearchEnabled: configProvider === 'openai' && configWebSearch,
      createdAt: now,
      updatedAt: now,
    };
    await chatSessionRepository.upsert(newSession);
    setConfigVisible(false);
    await refreshSessions();
    await openSession(newSession);
  }

  async function saveConversation(nextMessages: ChatMessage[], firstQuestion: string) {
    if (!currentSession) return;
    const shouldReplaceTitle =
      currentSession.title === currentSession.classTitle ||
      currentSession.title === 'Nueva conversación';
    const updated: ChatSession = {
      ...currentSession,
      title: shouldReplaceTitle ? buildChatTitle(firstQuestion) : currentSession.title,
      messages: nextMessages,
      updatedAt: new Date().toISOString(),
    };
    await chatSessionRepository.upsert(updated);
    setCurrentSessionId(updated.id);
    await refreshSessions();
  }

  async function attachFile() {
    if (!currentSession) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'audio/*', 'application/pdf', 'text/*', 'application/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('No estás autenticado');

      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const safeName = (asset.name || 'archivo').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const mimeType = asset.mimeType || 'application/octet-stream';
      setPendingAttachment({ mimeType, base64Data: base64, name: asset.name || safeName });

      const storagePath = `${currentSession.subjectId}/${currentSession.classId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(storagePath, decode(base64), { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { error: fileError } = await supabase.from('session_files').insert({
        subject_id: currentSession.subjectId,
        audio_id: currentSession.classId,
        uploaded_by: userId,
        file_name: asset.name || safeName,
        file_type: mimeType.startsWith('image/')
          ? 'image'
          : mimeType.startsWith('audio/')
            ? 'audio'
            : mimeType.includes('pdf')
              ? 'pdf'
              : 'document',
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: asset.size || null,
      });
      if (fileError) throw new Error(fileError.message);
    } catch (error: any) {
      setPendingAttachment(null);
      Alert.alert('Error al adjuntar', error.message || String(error));
    }
  }

  async function sendMessage() {
    if ((!inputText.trim() && !pendingAttachment) || loading || !currentSession) return;

    const messageText =
      inputText.trim() || `[Archivo adjunto: ${pendingAttachment?.name || 'archivo'}]`;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
    };
    const messagesWithUser = [...messages, userMessage];
    const attachmentToSend = pendingAttachment;

    setMessages(messagesWithUser);
    setInputText('');
    setPendingAttachment(null);
    setLoading(true);

    try {
      const botText = await askTutorUseCase.execute({
        question: messageText,
        subjectId: currentSession.subjectId,
        subjectName: selectedSubject?.name,
        classId: currentSession.classId,
        history: messages,
        contentType: currentSession.contentType,
        aiProvider: currentSession.aiProvider,
        webSearchEnabled: currentSession.webSearchEnabled,
        attachment: attachmentToSend
          ? {
              mimeType: attachmentToSend.mimeType,
              base64Data: attachmentToSend.base64Data,
            }
          : undefined,
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botText || 'No pude generar una respuesta en este momento.',
        sender: 'bot',
      };
      const finalMessages = [...messagesWithUser, botMessage];
      setMessages(finalMessages);
      await saveConversation(finalMessages, messageText);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: `No pude responder: ${error.message || String(error)}`,
        sender: 'bot',
      };
      const finalMessages = [...messagesWithUser, errorMessage];
      setMessages(finalMessages);
      await saveConversation(finalMessages, messageText);
    } finally {
      setLoading(false);
    }
  }

  function openActions(session: ChatSession) {
    setActionSession(session);
  }

  function beginRename(session: ChatSession) {
    setActionSession(null);
    setRenameText(session.title);
    setEditingSessionId(session.id);
    setRenameVisible(true);
  }

  async function saveRename() {
    if (!editingSessionId || !renameText.trim()) return;
    const updated = await chatSessionRepository.rename(editingSessionId, renameText);
    setRenameVisible(false);
    setEditingSessionId(null);
    setRenameText('');
    await refreshSessions();
    if (updated && currentSessionId === updated.id) setCurrentSessionId(updated.id);
  }

  async function beginEditContext(session: ChatSession) {
    setActionSession(null);
    const classData = await listAudioNotesUseCase.execute(session.subjectId);
    setConfigMode('edit');
    setEditingSessionId(session.id);
    setConfigSubjectId(session.subjectId);
    setConfigClasses(classData);
    setConfigClassId(session.classId);
    setConfigProvider(session.aiProvider || 'gemini');
    setConfigWebSearch(session.webSearchEnabled || false);
    setConfigVisible(true);
  }

  function confirmDelete(session: ChatSession) {
    setActionSession(null);
    Alert.alert(
      'Eliminar chat',
      `¿Desea eliminar “${session.title}” y todo su historial local?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await chatSessionRepository.delete(session.id);
            if (currentSessionId === session.id) {
              setCurrentSessionId(null);
              setMessages([]);
              setView('list');
            }
            await refreshSessions();
          },
        },
      ],
    );
  }

  const filteredSessions = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    return sessions.filter((session) => {
      if (subjectFilter !== ALL_SUBJECTS && session.subjectId !== subjectFilter) return false;
      if (!query) return true;
      const subjectName = subjects.find((item) => item.id === session.subjectId)?.name || '';
      return [session.title, session.classTitle || '', subjectName]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [chatSearch, sessions, subjectFilter, subjects]);

  const sessionGroups = useMemo(
    () =>
      subjects
        .map((subject) => ({
          subject,
          chats: filteredSessions.filter((session) => session.subjectId === subject.id),
        }))
        .filter((group) => group.chats.length > 0),
    [filteredSessions, subjects],
  );

  if (view === 'list') {
    return (
      <View style={styles.screen}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.listTitle}>Tutor IA</Text>
            <Text style={styles.listSubtitle}>Continúa una conversación o crea un tutor por clase</Text>
          </View>
          <View style={styles.chatCountBox}>
            <Text style={styles.chatCount}>{sessions.length}</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search color={colors.muted} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversación"
            placeholderTextColor={colors.muted}
            value={chatSearch}
            onChangeText={setChatSearch}
          />
        </View>

        <ScrollView
          horizontal
          style={styles.filterScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            style={[styles.filterChip, subjectFilter === ALL_SUBJECTS && styles.filterChipActive]}
            onPress={() => setSubjectFilter(ALL_SUBJECTS)}
          >
            <Text style={[styles.filterChipText, subjectFilter === ALL_SUBJECTS && styles.filterChipTextActive]}>Todas</Text>
          </Pressable>
          {subjects.map((subject) => (
            <Pressable
              key={subject.id}
              style={[styles.filterChip, subjectFilter === subject.id && styles.filterChipActive]}
              onPress={() => setSubjectFilter(subject.id)}
            >
              <Text style={[styles.filterChipText, subjectFilter === subject.id && styles.filterChipTextActive]}>{subject.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          style={styles.groupScroll}
          contentContainerStyle={
            sessionGroups.length ? styles.groupContent : styles.groupContentEmpty
          }
          showsVerticalScrollIndicator={false}
        >
          {sessionGroups.length === 0 ? (
            <View style={styles.emptyChats}>
              <View style={styles.emptyChatIcon}>
                <MessageCircle color={colors.primary} size={34} />
              </View>
              <Text style={styles.emptyChatsTitle}>Aún no hay conversaciones</Text>
              <Text style={styles.emptyChatsText}>
                Crea un chat, elige una materia, una clase y el modelo de IA. El historial quedará guardado para continuar después.
              </Text>
            </View>
          ) : (
            sessionGroups.map(({ subject, chats }) => {
              const expanded = expandedSubjects[subject.id] !== false;
              return (
                <View
                  key={subject.id}
                  style={[
                    styles.subjectGroup,
                    { borderColor: getPastelBorder(subject.color, colors.border) },
                  ]}
                >
                  <Pressable
                    style={styles.subjectGroupHeader}
                    onPress={() =>
                      setExpandedSubjects((current) => ({
                        ...current,
                        [subject.id]: !expanded,
                      }))
                    }
                  >
                    <View style={[styles.subjectDot, { backgroundColor: subject.color || colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectGroupTitle}>{subject.name}</Text>
                      <Text style={styles.subjectGroupCount}>{chats.length} conversación(es)</Text>
                    </View>
                    <ChevronDown
                      color={colors.muted}
                      size={20}
                      style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>

                  {expanded &&
                    chats.map((session) => (
                      <Pressable key={session.id} style={styles.chatRow} onPress={() => openSession(session)}>
                        <View style={styles.chatIcon}>
                          <Bot color={colors.primary} size={20} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.chatRowTitle} numberOfLines={1}>{session.title}</Text>
                          <Text style={styles.chatRowSubtitle} numberOfLines={1}>
                            {session.classTitle || 'Clase'} · {getSessionPreview(session)}
                          </Text>
                          <View style={styles.modelLine}>
                            <Text style={styles.modelLineText}>{AI_PROVIDER_LABELS[session.aiProvider || 'gemini']}</Text>
                            {session.webSearchEnabled && <Globe2 color={colors.primary} size={12} />}
                          </View>
                        </View>
                        <View style={styles.chatRightBox}>
                          <Text style={styles.chatDate}>{formatUpdatedAt(session.updatedAt)}</Text>
                          <Pressable
                            style={styles.moreButton}
                            onPress={(event) => {
                              event.stopPropagation();
                              openActions(session);
                            }}
                          >
                            <MoreVertical color={colors.muted} size={20} />
                          </Pressable>
                        </View>
                      </Pressable>
                    ))}
                </View>
              );
            })
          )}
        </ScrollView>

        <Pressable style={styles.fab} onPress={() => openNewChatConfig()} accessibilityLabel="Crear nuevo chat">
          <Plus color="#fff" size={29} />
        </Pressable>
        <AppBottomBar activeTab="Chatbot" />

        {renderModals()}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable style={styles.topIconButton} onPress={() => setView('list')}>
          <ChevronLeft color={colors.primary} size={24} />
        </Pressable>
        <View style={styles.topTitleBox}>
          <Text style={styles.topTitle} numberOfLines={1}>{currentSession?.title || 'Tutor IA'}</Text>
          <Text style={styles.topSubtitle} numberOfLines={1}>
            {selectedSubject?.name || 'Materia'} · {selectedClass?.title || currentSession?.classTitle || 'Clase'}
          </Text>
        </View>
        <Pressable style={styles.topIconButton} onPress={() => currentSession && openActions(currentSession)}>
          <MoreVertical color={colors.text} size={22} />
        </Pressable>
      </View>

      <View style={styles.contextStrip}>
        <Sparkles color={colors.purple} size={15} />
        <Text style={styles.contextStripText} numberOfLines={1}>
          {currentSession ? AI_PROVIDER_LABELS[currentSession.aiProvider] : 'Tutor IA'}
          {currentSession?.webSearchEnabled ? ' · apoyo web activado' : ' · enfocado en la clase'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 82 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || `${item.sender}_${index}`}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => {
            const next = messages[index + 1];
            const isLastInGroup = !next || next.sender !== item.sender;
            return <MessageBubble item={{ ...item, id: item.id || `${item.sender}_${index}` }} isLastInGroup={isLastInGroup} />;
          }}
          ListFooterComponent={loading ? <TypingIndicator /> : null}
        />

        <View style={styles.inputArea}>
          {pendingAttachment && (
            <View style={styles.attachmentChip}>
              {pendingAttachment.mimeType.startsWith('image/') ? (
                <ImageIcon color={colors.primary} size={18} />
              ) : (
                <FileText color={colors.primary} size={18} />
              )}
              <Text style={styles.attachmentName} numberOfLines={1}>{pendingAttachment.name}</Text>
              <Pressable onPress={() => setPendingAttachment(null)}>
                <X color={colors.danger} size={18} />
              </Pressable>
            </View>
          )}

          <View style={styles.inputRow}>
            <Pressable style={styles.attachButton} onPress={attachFile} disabled={loading}>
              <Paperclip color={colors.primary} size={21} />
            </Pressable>
            <TextInput
              style={styles.textInput}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!loading}
            />
            <Pressable
              style={[styles.sendButton, ((!inputText.trim() && !pendingAttachment) || loading) && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={(!inputText.trim() && !pendingAttachment) || loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={21} />}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {!keyboardVisible && <AppBottomBar activeTab="Chatbot" />}
      {renderModals()}
    </View>
  );

  function renderModals() {
    return (
      <>
        <ChatConfigModal
          visible={configVisible}
          mode={configMode}
          subjects={subjects}
          classes={configClasses}
          subjectId={configSubjectId}
          classId={configClassId}
          provider={configProvider}
          webSearchEnabled={configWebSearch}
          onChangeSubject={changeConfigSubject}
          onChangeClass={setConfigClassId}
          onChangeProvider={changeProvider}
          onToggleWebSearch={() => setConfigWebSearch((value) => !value)}
          onClose={() => setConfigVisible(false)}
          onSave={createOrUpdateChat}
        />

        <ChatActionsModal
          session={actionSession}
          onClose={() => setActionSession(null)}
          onRename={() => actionSession && beginRename(actionSession)}
          onChangeContext={() => actionSession && beginEditContext(actionSession)}
          onDelete={() => actionSession && confirmDelete(actionSession)}
        />

        <RenameChatModal
          visible={renameVisible}
          value={renameText}
          onChange={setRenameText}
          onClose={() => setRenameVisible(false)}
          onSave={saveRename}
        />
      </>
    );
  }
}

function ChatConfigModal({
  visible,
  mode,
  subjects,
  classes,
  subjectId,
  classId,
  provider,
  webSearchEnabled,
  onChangeSubject,
  onChangeClass,
  onChangeProvider,
  onToggleWebSearch,
  onClose,
  onSave,
}: {
  visible: boolean;
  mode: ConfigMode;
  subjects: Subject[];
  classes: AudioNote[];
  subjectId: string;
  classId: string;
  provider: AIProvider;
  webSearchEnabled: boolean;
  onChangeSubject: (value: string) => void;
  onChangeClass: (value: string) => void;
  onChangeProvider: (value: AIProvider) => void;
  onToggleWebSearch: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.configModal}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{mode === 'new' ? 'Nuevo chat' : 'Cambiar tema del chat'}</Text>
              <Text style={styles.modalSubtitle}>Elige el contexto antes de conversar</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <X color={colors.text} size={21} />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>1. Materia</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={subjectId} onValueChange={onChangeSubject} style={{ color: colors.text }} dropdownIconColor={colors.text}>
              {!subjects.length && <Picker.Item label="No hay materias" value="" color={colors.text} />}
              {subjects.map((subject) => <Picker.Item key={subject.id} label={subject.name} value={subject.id} color={colors.text} />)}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>2. Clase o audio procesado</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={classId} onValueChange={onChangeClass} style={{ color: colors.text }} dropdownIconColor={colors.text}>
              {!classes.length && <Picker.Item label="No hay clases procesadas" value="" color={colors.text} />}
              {classes.map((item) => <Picker.Item key={item.id} label={item.title} value={item.id} color={colors.text} />)}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>3. Modelo de IA</Text>
          <View style={styles.providerRow}>
            {(['gemini', 'openai'] as AIProvider[]).map((item) => (
              <Pressable
                key={item}
                style={[styles.providerCard, provider === item && styles.providerCardActive]}
                onPress={() => onChangeProvider(item)}
              >
                <Bot color={provider === item ? '#fff' : colors.primary} size={20} />
                <Text style={[styles.providerText, provider === item && styles.providerTextActive]}>
                  {item === 'gemini' ? 'Gemini' : 'OpenAI'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.webToggle, provider !== 'openai' && styles.webToggleDisabled]}
            onPress={provider === 'openai' ? onToggleWebSearch : undefined}
          >
            <Globe2 color={provider === 'openai' ? colors.primary : colors.muted} size={21} />
            <View style={{ flex: 1 }}>
              <Text style={styles.webToggleTitle}>Apoyo con búsqueda web</Text>
              <Text style={styles.webToggleText}>
                {provider === 'openai'
                  ? 'Busca fuentes relacionadas sin abandonar el tema de la clase.'
                  : 'Disponible al seleccionar OpenAI.'}
              </Text>
            </View>
            <View style={[styles.checkbox, webSearchEnabled && provider === 'openai' && styles.checkboxActive]}>
              {webSearchEnabled && provider === 'openai' && <View style={styles.checkboxDot} />}
            </View>
          </Pressable>

          <Pressable style={[styles.saveConfigButton, (!subjectId || !classId) && styles.disabled]} onPress={onSave} disabled={!subjectId || !classId}>
            <Text style={styles.saveConfigText}>{mode === 'new' ? 'Crear chat' : 'Guardar cambios'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ChatActionsModal({
  session,
  onClose,
  onRename,
  onChangeContext,
  onDelete,
}: {
  session: ChatSession | null;
  onClose: () => void;
  onRename: () => void;
  onChangeContext: () => void;
  onDelete: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={!!session} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.actionsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{session?.title || 'Opciones del chat'}</Text>
            <Pressable style={styles.closeButton} onPress={onClose}><X color={colors.text} size={21} /></Pressable>
          </View>
          <Pressable style={styles.actionRow} onPress={onRename}>
            <Pencil color={colors.primary} size={20} />
            <Text style={styles.actionText}>Editar título</Text>
          </Pressable>
          <Pressable style={styles.actionRow} onPress={onChangeContext}>
            <BookOpen color={colors.purple} size={20} />
            <Text style={styles.actionText}>Cambiar materia, clase o modelo</Text>
          </Pressable>
          <Pressable style={[styles.actionRow, styles.dangerAction]} onPress={onDelete}>
            <Trash2 color={colors.danger} size={20} />
            <Text style={[styles.actionText, { color: colors.danger }]}>Eliminar chat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RenameChatModal({
  visible,
  value,
  onChange,
  onClose,
  onSave,
}: {
  visible: boolean;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.actionsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar título</Text>
            <Pressable style={styles.closeButton} onPress={onClose}><X color={colors.text} size={21} /></Pressable>
          </View>
          <TextInput
            style={styles.renameInput}
            value={value}
            onChangeText={onChange}
            placeholder="Título del chat"
            placeholderTextColor={colors.muted}
            autoFocus
          />
          <Pressable style={[styles.saveConfigButton, !value.trim() && styles.disabled]} onPress={onSave} disabled={!value.trim()}>
            <Text style={styles.saveConfigText}>Guardar título</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    listHeader: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    listTitle: { color: colors.text, fontSize: 26, fontWeight: '900' },
    listSubtitle: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
    chatCountBox: { minWidth: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    chatCount: { color: colors.primary, fontWeight: '900', fontSize: 15 },
    searchBox: { minHeight: 47, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginHorizontal: 16, gap: 8 },
    searchInput: { flex: 1, color: colors.text, fontSize: 13.5 },
    filterScroll: { flexGrow: 0, flexShrink: 0, height: 58 },
    filterRow: { paddingHorizontal: 16, paddingVertical: 11, gap: 7, alignItems: 'center' },
    filterChip: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 },
    filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterChipText: { color: colors.text, fontSize: 11.5, fontWeight: '800' },
    filterChipTextActive: { color: '#fff' },
    groupScroll: { flex: 1, marginTop: 0 },
    groupContent: { flexGrow: 0, paddingHorizontal: 14, paddingTop: 0, paddingBottom: 100 },
    groupContentEmpty: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 14, paddingBottom: 100 },
    emptyChats: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 24 },
    emptyChatIcon: { width: 76, height: 76, borderRadius: 25, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    emptyChatsTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 13 },
    emptyChatsText: { color: colors.muted, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 6 },
    subjectGroup: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1.4, borderColor: colors.border, marginBottom: 10, overflow: 'hidden' },
    subjectGroupHeader: { minHeight: 61, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
    subjectDot: { width: 9, height: 42, borderRadius: 99 },
    subjectGroupTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
    subjectGroupCount: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
    chatRow: { minHeight: 82, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    chatIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    chatRowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
    chatRowSubtitle: { color: colors.muted, fontSize: 10.5, marginTop: 3 },
    modelLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    modelLineText: { color: colors.primary, fontSize: 9.5, fontWeight: '800' },
    chatRightBox: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 10 },
    chatDate: { color: colors.muted, fontSize: 9.5 },
    moreButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
    fab: { position: 'absolute', right: 20, bottom: 92, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 24px rgba(37,99,235,0.35)' },
    topBar: { minHeight: 66, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    topIconButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    topTitleBox: { flex: 1 },
    topTitle: { color: colors.text, fontSize: 15.5, fontWeight: '900' },
    topSubtitle: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
    contextStrip: { minHeight: 38, backgroundColor: colors.soft, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
    contextStripText: { color: colors.muted, fontSize: 10.5, fontWeight: '800' },
    chatArea: { flex: 1 },
    messageList: { flexGrow: 1, paddingHorizontal: 12, paddingTop: 15, paddingBottom: 12 },
    inputArea: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 10, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8 },
    attachmentChip: { minHeight: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8, marginBottom: 7 },
    attachmentName: { flex: 1, color: colors.text, fontSize: 11.5, fontWeight: '800' },
    inputRow: { minHeight: 54, borderRadius: 27, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, flexDirection: 'row', alignItems: 'flex-end', padding: 3, gap: 3 },
    attachButton: { width: 45, height: 45, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    textInput: { flex: 1, minHeight: 46, maxHeight: 120, color: colors.text, fontSize: 15, paddingHorizontal: 7, paddingTop: 12, paddingBottom: 11, textAlignVertical: 'center' },
    sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendButtonDisabled: { opacity: 0.4 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    configModal: { width: '100%', maxHeight: '90%', backgroundColor: colors.card, borderRadius: 23, padding: 16, borderWidth: 1, borderColor: colors.border },
    actionsModal: { width: '100%', backgroundColor: colors.card, borderRadius: 23, padding: 16, borderWidth: 1, borderColor: colors.border },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
    modalTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '900' },
    modalSubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
    closeButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
    fieldLabel: { color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 7 },
    pickerWrapper: { minHeight: 49, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.input, justifyContent: 'center' },
    providerRow: { flexDirection: 'row', gap: 9 },
    providerCard: { flex: 1, minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    providerCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    providerText: { color: colors.text, fontSize: 12, fontWeight: '900' },
    providerTextActive: { color: '#fff' },
    webToggle: { minHeight: 72, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.soft, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 12 },
    webToggleDisabled: { opacity: 0.58 },
    webToggleTitle: { color: colors.text, fontSize: 12.5, fontWeight: '900' },
    webToggleText: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
    checkbox: { width: 25, height: 25, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primary },
    checkboxDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
    saveConfigButton: { minHeight: 51, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    saveConfigText: { color: '#fff', fontSize: 13.5, fontWeight: '900' },
    disabled: { opacity: 0.42 },
    actionRow: { minHeight: 56, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 4 },
    dangerAction: { marginTop: 2 },
    actionText: { color: colors.text, fontSize: 13, fontWeight: '850' as any },
    renameInput: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 13, fontSize: 14 },
  });
}
