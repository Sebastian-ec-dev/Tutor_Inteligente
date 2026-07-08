import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare,
  Paperclip,
  Send,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react-native';
import MessageBubble from '../utils/MessageBubble';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import TypingIndicator from '../utils/burbujaEscribiendo';
import { Subject } from '../domain/entities/Subject';
import { AudioNote } from '../domain/entities/AudioNote';
import { ConversationMessage } from '../domain/entities/ConversationMessage';
import { ChatSession } from '../domain/entities/ChatSession';
import { ClassContentType } from '../domain/entities/ClassContentType';
import { AIProvider } from '../domain/entities/AIProvider';
import { askTutorUseCase, listAudioNotesUseCase, listSubjectsUseCase } from '../application/container';
import { supabase } from '../infrastructure/supabase/supabaseClient';
import { localChatSessionRepository } from '../infrastructure/chat/LocalChatSessionRepository';
import { PropsList } from '../navigation/AppNavigator';

type ChatMessage = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

function initialBotMessage(classTitle?: string): ChatMessage {
  return {
    id: '1',
    text: classTitle
      ? `¡Listo! Pregúntame sobre la clase "${classTitle}". Usaré esa clase como tema base y también puedo reforzar el aprendizaje con explicación general relacionada.`
      : '¡Hola! Soy tu tutor de IA. Primero selecciona una materia y una clase. La configuración básica está activa para ahorrar consumo.',
    sender: 'bot',
  };
}

function toChatMessages(messages: ConversationMessage[]): ChatMessage[] {
  if (!messages.length) return [];

  return messages.map((message, index) => ({
    id: message.id || `${Date.now()}_${index}`,
    text: message.text,
    sender: message.sender,
  }));
}

function toConversationMessages(messages: ChatMessage[]): ConversationMessage[] {
  return messages.map((message) => ({
    id: message.id,
    text: message.text,
    sender: message.sender,
  }));
}

function buildSessionTitle(firstQuestion: string, classTitle?: string): string {
  const cleanQuestion = firstQuestion.trim().replace(/\s+/g, ' ');
  if (cleanQuestion) return cleanQuestion.slice(0, 48);
  return `Charla sobre ${classTitle || 'la clase'}`;
}

export default function ChatbotScreen() {
  const route = useRoute<RouteProp<PropsList, 'Chatbot'>>();
  const initialSubjectId = route.params?.subjectId || '';
  const initialClassId = route.params?.classId || '';
  const flatListRef = useRef<FlatList>(null);
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  const [messages, setMessages] = useState<ChatMessage[]>([initialBotMessage(route.params?.className)]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [materias, setMaterias] = useState<Subject[]>([]);
  const [materiaId, setMateriaId] = useState<string>(initialSubjectId);
  const [clases, setClases] = useState<AudioNote[]>([]);
  const [classId, setClassId] = useState<string>(initialClassId);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string>('');

  // Configuración básica por defecto para una nueva charla.
  // No consume IA hasta que el usuario envía una pregunta.
  const [contentType, setContentType] = useState<ClassContentType>('general');
  const [aiProvider, setAiProvider] = useState<AIProvider>('gemini');

  const cargarMaterias = useCallback(async () => {
    try {
      const data = await listSubjectsUseCase.execute();
      setMaterias(data);
      if (!initialSubjectId && data.length > 0) {
        setMateriaId(data[0].id);
      }
    } catch (error) {
      console.log('Error cargando materias:', error);
    }
  }, [initialSubjectId]);

  const cargarClases = useCallback(async (subjectId: string) => {
    try {
      const data = await listAudioNotesUseCase.execute(subjectId);
      setClases(data);

      const initialExists = initialClassId && data.some((item) => item.id === initialClassId);
      if (initialExists) {
        setClassId(initialClassId);
        return;
      }

      setClassId(data[0]?.id || '');
    } catch (error) {
      console.log('Error cargando clases:', error);
      setClases([]);
      setClassId('');
    }
  }, [initialClassId]);

  const cargarCharlas = useCallback(async (subjectId: string, selectedClassId: string, classTitle?: string) => {
    if (!subjectId || !selectedClassId) {
      setChatSessions([]);
      setChatSessionId('');
      setMessages([initialBotMessage()]);
      return;
    }

    const sessions = await localChatSessionRepository.listByClass(subjectId, selectedClassId);
    setChatSessions(sessions);

    const latestSession = sessions[0];
    if (latestSession) {
      setChatSessionId(latestSession.id);
      setMessages(toChatMessages(latestSession.messages));
      setContentType(latestSession.contentType || 'general');
      setAiProvider(latestSession.aiProvider || 'gemini');
      return;
    }

    setChatSessionId('');
    setMessages([initialBotMessage(classTitle)]);
  }, []);

  const guardarCharla = useCallback(async (
    nextMessages: ChatMessage[],
    firstQuestion: string,
  ) => {
    if (!materiaId || !classId) return;

    const selectedClass = clases.find((item) => item.id === classId);
    const existingSession = chatSessions.find((session) => session.id === chatSessionId);
    const now = new Date().toISOString();
    const id = chatSessionId || `chat_${Date.now()}`;

    const session: ChatSession = {
      id,
      subjectId: materiaId,
      classId,
      classTitle: selectedClass?.title,
      title: existingSession?.title || buildSessionTitle(firstQuestion, selectedClass?.title),
      messages: toConversationMessages(nextMessages),
      contentType,
      aiProvider,
      createdAt: existingSession?.createdAt || now,
      updatedAt: now,
    };

    await localChatSessionRepository.upsert(session);
    setChatSessionId(id);
    setChatSessions((prev) => [session, ...prev.filter((item) => item.id !== id)]);
  }, [aiProvider, chatSessionId, chatSessions, classId, clases, contentType, materiaId]);

  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    if (!materiaId) {
      setClases([]);
      setClassId('');
      return;
    }

    cargarClases(materiaId);
  }, [materiaId, cargarClases]);

  useEffect(() => {
    const selectedClass = clases.find((item) => item.id === classId);
    cargarCharlas(materiaId, classId, selectedClass?.title);
  }, [materiaId, classId, clases, cargarCharlas]);

  function nuevaCharlaBasica() {
    setChatSessionId('');
    setAiProvider('gemini');
    setContentType('general');
    setSettingsOpen(false);
    const selectedClass = clases.find((item) => item.id === classId);
    setMessages([initialBotMessage(selectedClass?.title)]);
  }

  function continuarCharla(sessionId: string) {
    if (sessionId === '__new__') {
      nuevaCharlaBasica();
      return;
    }

    const session = chatSessions.find((item) => item.id === sessionId);
    if (!session) return;

    setChatSessionId(session.id);
    setMessages(toChatMessages(session.messages));
    setContentType(session.contentType || 'general');
    setAiProvider(session.aiProvider || 'gemini');
    setSettingsOpen(false);
  }

  async function adjuntarArchivo() {
    if (!materiaId || !classId) {
      Alert.alert('Selecciona una clase', 'Primero selecciona la materia y la clase o tema para asociar el archivo al chat.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'audio/*', 'application/pdf', 'text/*', 'application/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
      const safeName = (asset.name || 'archivo').replace(/[^a-zA-Z0-9_.-]/g, '_');
      const storagePath = `${materiaId}/${classId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage.from('chat-uploads').upload(storagePath, decode(base64), {
        contentType: asset.mimeType || 'application/octet-stream',
        upsert: false,
      });

      if (uploadError) throw new Error(uploadError.message);

      await supabase.from('session_files').insert({
        subject_id: materiaId,
        audio_id: classId,
        file_name: asset.name || safeName,
        file_type: (asset.mimeType || '').startsWith('image/')
          ? 'image'
          : (asset.mimeType || '').startsWith('audio/')
            ? 'audio'
            : (asset.mimeType || '').includes('pdf')
              ? 'pdf'
              : 'document',
        storage_path: storagePath,
        mime_type: asset.mimeType || null,
        size_bytes: asset.size || null,
      });

      const attachmentMessages: ChatMessage[] = [
        ...messages,
        { id: Date.now().toString(), text: 'Adjunté un archivo de apoyo para esta clase.', sender: 'user' },
        {
          id: (Date.now() + 1).toString(),
          text: 'Archivo adjuntado correctamente. Quedó asociado a la clase seleccionada.',
          sender: 'bot',
        },
      ];
      setMessages(attachmentMessages);
      await guardarCharla(attachmentMessages, 'Archivo de apoyo adjuntado');
    } catch (error: any) {
      Alert.alert('Error al adjuntar', error.message || String(error));
    }
  }

  async function enviarMensaje() {
    if (!inputText.trim() || loading) return;
    if (!materiaId || !classId) {
      Alert.alert('Selecciona una clase', 'Escoge primero la materia y la clase o tema para que el chat use ese contexto base.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
    };

    const history: ConversationMessage[] = toConversationMessages(messages);
    const messagesWithUser = [...messages, userMessage];

    setMessages(messagesWithUser);
    setInputText('');
    setLoading(true);

    try {
      const botResponseText = await askTutorUseCase.execute({
        question: userMessage.text,
        subjectId: materiaId,
        classId,
        history,
        contentType,
        aiProvider,
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponseText || 'Lo siento, no pude generar una respuesta.',
        sender: 'bot',
      };

      const finalMessages = [...messagesWithUser, botMessage];
      setMessages(finalMessages);
      await guardarCharla(finalMessages, userMessage.text);
    } catch (err) {
      console.log('Error procesando pregunta:', err);
      const errorMessages: ChatMessage[] = [
        ...messagesWithUser,
        {
          id: Date.now().toString(),
          text: 'El servicio de IA no pudo responder ahora. Revisa tus créditos, conexión o cambia de proveedor en la configuración.',
          sender: 'bot',
        },
      ];
      setMessages(errorMessages);
      await guardarCharla(errorMessages, userMessage.text);
    } finally {
      setLoading(false);
    }
  }

  const selectedSubject = materias.find((item) => item.id === materiaId);
  const selectedClass = clases.find((item) => item.id === classId);
  const selectedSession = chatSessions.find((item) => item.id === chatSessionId);
  const providerLabel = aiProvider === 'openai' ? 'GPT / OpenAI' : 'Gemini';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={[styles.topPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.topTitleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Tutor IA por clase</Text>
            <Text style={[styles.screenSubtitle, { color: colors.muted }]}>Contexto exacto y modo básico por defecto.</Text>
          </View>

          <Pressable
            style={[styles.configButton, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}
            onPress={() => setSettingsOpen((value) => !value)}
          >
            <SlidersHorizontal color={colors.primary} size={17} />
            <Text style={[styles.configButtonText, { color: colors.primary }]}>Configurar</Text>
            {settingsOpen ? <ChevronUp color={colors.primary} size={16} /> : <ChevronDown color={colors.primary} size={16} />}
          </Pressable>
        </View>

        <View style={styles.selectionRow}>
          <View style={[styles.selectionChip, { backgroundColor: colors.chip, borderColor: colors.border }]}>
            <BookOpen size={14} color={colors.primary} />
            <Text style={[styles.selectionChipText, { color: colors.text }]} numberOfLines={1}>{selectedSubject?.name || 'Sin materia'}</Text>
          </View>
          <View style={[styles.selectionChip, styles.classChip, { backgroundColor: colors.chip, borderColor: colors.border }]}>
            <FolderOpen size={14} color={colors.purple} />
            <Text style={[styles.selectionChipText, { color: colors.text }]} numberOfLines={1}>{selectedClass?.title || 'Sin clase'}</Text>
          </View>
          <View style={[styles.selectionChip, { backgroundColor: colors.chip, borderColor: colors.border }]}>
            <Sparkles size={14} color={colors.success} />
            <Text style={[styles.selectionChipText, { color: colors.text }]} numberOfLines={1}>{providerLabel} · {contentType}</Text>
          </View>
          <View style={[styles.selectionChip, { backgroundColor: colors.chip, borderColor: colors.border }]}>
            <MessageSquare size={14} color={colors.primary} />
            <Text style={[styles.selectionChipText, { color: colors.text }]} numberOfLines={1}>{selectedSession?.title || 'Nueva charla'}</Text>
          </View>
        </View>

        {settingsOpen && (
          <View style={[styles.configPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Materia</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Picker selectedValue={materiaId} onValueChange={(itemValue) => setMateriaId(itemValue)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.primary}>
                  {materias.length === 0 && <Picker.Item label="No hay materias disponibles" value="" color="#999" />}
                  {materias.map((sub) => <Picker.Item key={sub.id} label={sub.name} value={sub.id} />)}
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainerSecondary}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Clase o tema</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Picker selectedValue={classId} onValueChange={(itemValue) => setClassId(itemValue)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.primary}>
                  {clases.length === 0 && <Picker.Item label="No hay clases procesadas" value="" color="#999" />}
                  {clases.map((item) => <Picker.Item key={item.id} label={item.title} value={item.id} />)}
                </Picker>
              </View>
            </View>

            <View style={styles.pickerContainerSecondary}>
              <Text style={[styles.pickerLabel, { color: colors.text }]}>Charla</Text>
              <View style={[styles.pickerWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                <Picker selectedValue={chatSessionId || '__new__'} onValueChange={(value) => continuarCharla(value)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.primary}>
                  <Picker.Item label="Nueva charla" value="__new__" />
                  {chatSessions.map((session) => (
                    <Picker.Item
                      key={session.id}
                      label={`${session.title} · ${new Date(session.updatedAt).toLocaleDateString()}`}
                      value={session.id}
                    />
                  ))}
                </Picker>
              </View>
              <Text style={[styles.configHelp, { color: colors.muted }]}>El historial se guarda localmente por clase para continuar una charla anterior.</Text>
            </View>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Proveedor IA</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Picker selectedValue={aiProvider} onValueChange={(value) => setAiProvider(value)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.primary}>
                    <Picker.Item label="Gemini · básico" value="gemini" />
                    <Picker.Item label="GPT / OpenAI" value="openai" />
                  </Picker>
                </View>
              </View>

              <View style={styles.column}>
                <Text style={[styles.pickerLabel, { color: colors.text }]}>Modo</Text>
                <View style={[styles.pickerWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
                  <Picker selectedValue={contentType} onValueChange={(value) => setContentType(value)} style={[styles.picker, { color: colors.text }]} dropdownIconColor={colors.primary}>
                    <Picker.Item label="General" value="general" />
                    <Picker.Item label="Teoría" value="theory" />
                    <Picker.Item label="Matemática" value="math" />
                    <Picker.Item label="Imágenes/doc." value="image" />
                  </Picker>
                </View>
              </View>
            </View>

            <Pressable style={[styles.basicButton, { backgroundColor: colors.primarySoft }]} onPress={nuevaCharlaBasica}>
              <Text style={[styles.basicButtonText, { color: colors.primary }]}>Nueva charla sobre esta clase</Text>
            </Pressable>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        contentContainerStyle={styles.list}
        style={styles.chatList}
        renderItem={({ item, index }) => {
          const next = messages[index + 1];
          const isLastInGroup = !next || next.sender !== item.sender;
          return <MessageBubble item={item} isLastInGroup={isLastInGroup} />;
        }}
        ListFooterComponent={loading ? <TypingIndicator /> : null}
      />

      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={[styles.inputContainer, { backgroundColor: colors.input }, inputFocused && { borderColor: colors.primary, backgroundColor: colors.surface }]}>
          <Pressable style={[styles.attachButton, { backgroundColor: colors.primarySoft }]} onPress={adjuntarArchivo} disabled={!materiaId || !classId || loading}>
            <Paperclip color={materiaId && classId ? colors.primary : '#94A3B8'} size={21} />
          </Pressable>

          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={!materiaId ? 'Selecciona una materia primero...' : !classId ? 'Selecciona una clase o tema primero...' : 'Escribe tu pregunta aquí...'}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            maxLength={600}
            placeholderTextColor={colors.muted}
            editable={!!materiaId && !!classId}
          />

          <Pressable
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary },
              (loading || !inputText.trim() || !materiaId || !classId) && styles.sendButtonDisabled,
            ]}
            onPress={enviarMensaje}
            disabled={loading || !inputText.trim() || !materiaId || !classId}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={22} strokeWidth={2.5} />}
          </Pressable>
        </View>
        {inputText.length > 500 && <Text style={[styles.charCount, { color: colors.muted }]}>{inputText.length}/600</Text>}
      </View>

      <AppBottomBar activeTab="Chatbot" subjectId={materiaId} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topPanel: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: '900',
  },
  screenSubtitle: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  configButton: {
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  configButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  selectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  selectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: 150,
  },
  classChip: {
    maxWidth: 230,
  },
  selectionChipText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  configPanel: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  pickerContainer: {
    marginTop: 0,
  },
  pickerContainerSecondary: {
    marginTop: 10,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
  },
  pickerWrapper: {
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  picker: {
    width: '100%',
  },
  configHelp: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 8,
    fontWeight: '600',
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  column: {
    flex: 1,
  },
  basicButton: {
    marginTop: 12,
    minHeight: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  basicButtonText: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  chatList: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 10,
    flexGrow: 1,
  },
  inputWrapper: {
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 16,
    maxHeight: 130,
    minHeight: 52,
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    boxShadow: '0px 4px 8px rgba(37, 99, 235, 0.24)',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  charCount: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginRight: 4,
  },
});
