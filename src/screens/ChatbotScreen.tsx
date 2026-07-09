import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { RouteProp, useRoute } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import {
  ArrowLeft,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare,
  Paperclip,
  PlusCircle,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import MessageBubble from "../utils/MessageBubble";
import AppBottomBar from "../components/ui/AppBottomBar";
import { useAppTheme } from "../components/ui/ThemeContext";
import TypingIndicator from "../utils/burbujaEscribiendo";
import { Subject } from "../domain/entities/Subject";
import { AudioNote } from "../domain/entities/AudioNote";
import { ConversationMessage } from "../domain/entities/ConversationMessage";
import { ChatSession } from "../domain/entities/ChatSession";
import { ClassContentType } from "../domain/entities/ClassContentType";
import { AIProvider } from "../domain/entities/AIProvider";
import {
  askTutorUseCase,
  listAudioNotesUseCase,
  listSubjectsUseCase,
} from "../application/container";
import { supabase } from "../infrastructure/supabase/supabaseClient";
import { localChatSessionRepository } from "../infrastructure/chat/LocalChatSessionRepository";
import { PropsList } from "../navigation/AppNavigator";

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

type ScreenMode = "history" | "setup" | "chat";

function initialBotMessage(classTitle?: string): ChatMessage {
  return {
    id: "1",
    text: classTitle
      ? `¡Listo! Pregúntame sobre la clase "${classTitle}". Usaré esa clase como tema base y también puedo reforzar el aprendizaje con explicación general relacionada.`
      : "¡Hola! Soy tu tutor de IA. Primero selecciona una materia y una clase. La configuración básica está activa para ahorrar consumo.",
    sender: "bot",
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

function toConversationMessages(
  messages: ChatMessage[],
): ConversationMessage[] {
  return messages.map((message) => ({
    id: message.id,
    text: message.text,
    sender: message.sender,
  }));
}

function buildSessionTitle(firstQuestion: string, classTitle?: string): string {
  const cleanQuestion = firstQuestion.trim().replace(/\s+/g, " ");
  if (cleanQuestion) return cleanQuestion.slice(0, 48);
  return `Charla sobre ${classTitle || "la clase"}`;
}

function formatSessionDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "Reciente";
  }
}

export default function ChatbotScreen() {
  const route = useRoute<RouteProp<PropsList, "Chatbot">>();
  const initialSubjectId = route.params?.subjectId || "";
  const initialClassId = route.params?.classId || "";
  const flatListRef = useRef<FlatList>(null);
  const classIdRef = useRef<string>(initialClassId);
  const chatSessionIdRef = useRef<string>("");
  const preferredSessionIdRef = useRef<string>("");
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  const [messages, setMessages] = useState<ChatMessage[]>([
    initialBotMessage(route.params?.className),
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>(
    initialClassId ? "chat" : "history",
  );
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [materias, setMaterias] = useState<Subject[]>([]);
  const [materiaId, setMateriaId] = useState<string>(initialSubjectId);
  const [clases, setClases] = useState<AudioNote[]>([]);
  const [classId, setClassId] = useState<string>(initialClassId);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [allChatSessions, setAllChatSessions] = useState<ChatSession[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string>("");

  // Configuración básica por defecto para una nueva charla.
  // No consume IA hasta que el usuario envía una pregunta.
  const [contentType, setContentType] = useState<ClassContentType>("general");
  const [aiProvider, setAiProvider] = useState<AIProvider>("gemini");

  const cargarMaterias = useCallback(async () => {
    try {
      const data = await listSubjectsUseCase.execute();
      setMaterias(data);
      if (!initialSubjectId && data.length > 0) {
        setMateriaId(data[0].id);
      }
    } catch (error) {
      console.log("Error cargando materias:", error);
    }
  }, [initialSubjectId]);

  const cargarClases = useCallback(
    async (subjectId: string) => {
      try {
        const data = await listAudioNotesUseCase.execute(subjectId);
        setClases(data);

        const currentClassId = classIdRef.current;
        const currentExists =
          currentClassId && data.some((item) => item.id === currentClassId);
        if (currentExists) {
          setClassId(currentClassId);
          return;
        }

        const initialExists =
          initialClassId && data.some((item) => item.id === initialClassId);
        if (initialExists) {
          classIdRef.current = initialClassId;
          setClassId(initialClassId);
          return;
        }

        const firstClassId = data[0]?.id || "";
        classIdRef.current = firstClassId;
        setClassId(firstClassId);
      } catch (error) {
        console.log("Error cargando clases:", error);
        setClases([]);
        classIdRef.current = "";
        setClassId("");
      }
    },
    [initialClassId],
  );

  const cargarHistorialGlobal = useCallback(async () => {
    const sessions = await localChatSessionRepository.listAll();
    setAllChatSessions(sessions);
  }, []);

  const cargarCharlas = useCallback(
    async (subjectId: string, selectedClassId: string, classTitle?: string) => {
      if (!subjectId || !selectedClassId) {
        setChatSessions([]);
        setChatSessionId("");
        setMessages([initialBotMessage()]);
        return;
      }

      const sessions = await localChatSessionRepository.listByClass(
        subjectId,
        selectedClassId,
      );
      setChatSessions(sessions);

      const preferredSessionId =
        preferredSessionIdRef.current || chatSessionIdRef.current;
      const sessionToOpen = preferredSessionId
        ? sessions.find((item) => item.id === preferredSessionId)
        : undefined;
      if (sessionToOpen) {
        preferredSessionIdRef.current = "";
        chatSessionIdRef.current = sessionToOpen.id;
        setChatSessionId(sessionToOpen.id);
        setMessages(toChatMessages(sessionToOpen.messages));
        setContentType(sessionToOpen.contentType || "general");
        setAiProvider(sessionToOpen.aiProvider || "gemini");
        return;
      }

      preferredSessionIdRef.current = "";
      chatSessionIdRef.current = "";
      setChatSessionId("");
      setMessages([initialBotMessage(classTitle)]);
    },
    [],
  );

  const guardarCharla = useCallback(
    async (nextMessages: ChatMessage[], firstQuestion: string) => {
      if (!materiaId || !classId) return;

      const selectedClass = clases.find((item) => item.id === classId);
      const existingSession =
        chatSessions.find((session) => session.id === chatSessionId) ||
        allChatSessions.find((session) => session.id === chatSessionId);
      const now = new Date().toISOString();
      const id = chatSessionId || `chat_${Date.now()}`;

      const session: ChatSession = {
        id,
        subjectId: materiaId,
        classId,
        classTitle: selectedClass?.title || existingSession?.classTitle,
        title:
          existingSession?.title ||
          buildSessionTitle(firstQuestion, selectedClass?.title),
        messages: toConversationMessages(nextMessages),
        contentType,
        aiProvider,
        createdAt: existingSession?.createdAt || now,
        updatedAt: now,
      };

      await localChatSessionRepository.upsert(session);
      chatSessionIdRef.current = id;
      setChatSessionId(id);
      setChatSessions((prev) => [
        session,
        ...prev.filter((item) => item.id !== id),
      ]);
      setAllChatSessions((prev) => [
        session,
        ...prev.filter((item) => item.id !== id),
      ]);
    },
    [
      aiProvider,
      allChatSessions,
      chatSessionId,
      chatSessions,
      classId,
      clases,
      contentType,
      materiaId,
    ],
  );

  useEffect(() => {
    classIdRef.current = classId;
  }, [classId]);

  useEffect(() => {
    chatSessionIdRef.current = chatSessionId;
  }, [chatSessionId]);

  useEffect(() => {
    cargarMaterias();
    cargarHistorialGlobal();
  }, [cargarMaterias, cargarHistorialGlobal]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    if (!materiaId) {
      setClases([]);
      setClassId("");
      return;
    }

    cargarClases(materiaId);
  }, [materiaId, cargarClases]);

  useEffect(() => {
    const selectedClass = clases.find((item) => item.id === classId);
    cargarCharlas(materiaId, classId, selectedClass?.title);
  }, [materiaId, classId, clases, cargarCharlas]);

  function nuevaCharlaBasica() {
    chatSessionIdRef.current = "";
    setChatSessionId("");
    setAiProvider("gemini");
    setContentType("general");
    setSettingsOpen(false);
    const selectedClass = clases.find((item) => item.id === classId);
    setMessages([initialBotMessage(selectedClass?.title)]);
    setScreenMode("chat");
  }

  function continuarCharla(sessionId: string) {
    if (sessionId === "__new__") {
      nuevaCharlaBasica();
      return;
    }

    const session = chatSessions.find((item) => item.id === sessionId);
    if (!session) return;

    chatSessionIdRef.current = session.id;
    setChatSessionId(session.id);
    setMessages(toChatMessages(session.messages));
    setContentType(session.contentType || "general");
    setAiProvider(session.aiProvider || "gemini");
    setSettingsOpen(false);
    setScreenMode("chat");
  }

  function abrirListaChats() {
    setScreenMode("history");
    setSettingsOpen(false);
  }

  function abrirConfiguracionNueva() {
    preferredSessionIdRef.current = "";
    chatSessionIdRef.current = "";
    setChatSessionId("");
    setAiProvider("gemini");
    setContentType("general");
    setMessages([]);
    setSettingsOpen(false);
    setScreenMode("setup");
  }

  function iniciarNuevaCharlaConfigurada() {
    if (!materiaId || !classId) {
      Alert.alert(
        "Selecciona una clase",
        "Primero escoge la materia, la clase o tema y el modo del Tutor IA.",
      );
      return;
    }

    const selectedClass = clases.find((item) => item.id === classId);
    preferredSessionIdRef.current = "";
    chatSessionIdRef.current = "";
    setChatSessionId("");
    setMessages([initialBotMessage(selectedClass?.title)]);
    setSettingsOpen(false);
    setScreenMode("chat");
  }

  function abrirCharlaGuardada(session: ChatSession) {
    preferredSessionIdRef.current = session.id;
    classIdRef.current = session.classId;
    chatSessionIdRef.current = session.id;
    setMateriaId(session.subjectId);
    setClassId(session.classId);
    setChatSessionId(session.id);
    setMessages(toChatMessages(session.messages));
    setContentType(session.contentType || "general");
    setAiProvider(session.aiProvider || "gemini");
    setSettingsOpen(false);
    setScreenMode("chat");
  }

  async function adjuntarArchivo() {
    if (!materiaId || !classId) {
      Alert.alert(
        "Selecciona una clase",
        "Primero selecciona la materia y la clase o tema para asociar el archivo al chat.",
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "audio/*",
          "application/pdf",
          "text/*",
          "application/*",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64",
      });
      const safeName = (asset.name || "archivo").replace(
        /[^a-zA-Z0-9_.-]/g,
        "_",
      );
      const storagePath = `${materiaId}/${classId}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-uploads")
        .upload(storagePath, decode(base64), {
          contentType: asset.mimeType || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      await supabase.from("session_files").insert({
        subject_id: materiaId,
        audio_id: classId,
        file_name: asset.name || safeName,
        file_type: (asset.mimeType || "").startsWith("image/")
          ? "image"
          : (asset.mimeType || "").startsWith("audio/")
            ? "audio"
            : (asset.mimeType || "").includes("pdf")
              ? "pdf"
              : "document",
        storage_path: storagePath,
        mime_type: asset.mimeType || null,
        size_bytes: asset.size || null,
      });

      const attachmentMessages: ChatMessage[] = [
        ...messages,
        {
          id: Date.now().toString(),
          text: "Adjunté un archivo de apoyo para esta clase.",
          sender: "user",
        },
        {
          id: (Date.now() + 1).toString(),
          text: "Archivo adjuntado correctamente. Quedó asociado a la clase seleccionada.",
          sender: "bot",
        },
      ];
      setMessages(attachmentMessages);
      await guardarCharla(attachmentMessages, "Archivo de apoyo adjuntado");
    } catch (error: any) {
      Alert.alert("Error al adjuntar", error.message || String(error));
    }
  }

  async function enviarMensaje() {
    if (!inputText.trim() || loading) return;
    if (!materiaId || !classId) {
      Alert.alert(
        "Selecciona una clase",
        "Escoge primero la materia y la clase o tema para que el chat use ese contexto base.",
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
    };

    const history: ConversationMessage[] = toConversationMessages(messages);
    const messagesWithUser = [...messages, userMessage];

    setMessages(messagesWithUser);
    setInputText("");
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
        text: botResponseText || "Lo siento, no pude generar una respuesta.",
        sender: "bot",
      };

      const finalMessages = [...messagesWithUser, botMessage];
      setMessages(finalMessages);
      await guardarCharla(finalMessages, userMessage.text);
    } catch (err) {
      console.log("Error procesando pregunta:", err);
      const errorMessages: ChatMessage[] = [
        ...messagesWithUser,
        {
          id: Date.now().toString(),
          text: "El servicio de IA no pudo responder ahora. Revisa tus créditos, conexión o cambia de proveedor en la configuración.",
          sender: "bot",
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
  const selectedSession =
    chatSessions.find((item) => item.id === chatSessionId) ||
    allChatSessions.find((item) => item.id === chatSessionId);
  const providerLabel = aiProvider === "openai" ? "GPT / OpenAI" : "Gemini";

  function getSessionContextLabel(session: ChatSession): string {
    const subjectName =
      materias.find((item) => item.id === session.subjectId)?.name ||
      "Materia guardada";
    const classTitle = session.classTitle || "Clase guardada";
    return `${subjectName} · ${classTitle}`;
  }

  function renderHistoryCard(session: ChatSession) {
    const isActive = session.id === chatSessionId;

    return (
      <Pressable
        key={session.id}
        style={[
          styles.chatHistoryCard,
          { backgroundColor: colors.card, borderColor: colors.border },
          isActive && {
            borderColor: colors.primary,
            backgroundColor: colors.primarySoft,
          },
        ]}
        onPress={() => abrirCharlaGuardada(session)}
      >
        <View
          style={[
            styles.chatHistoryAvatar,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <MessageSquare color={colors.primary} size={21} />
        </View>
        <View style={styles.chatHistoryBody}>
          <Text
            style={[styles.chatHistoryTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {session.title}
          </Text>
          <Text
            style={[styles.chatHistoryMeta, { color: colors.muted }]}
            numberOfLines={1}
          >
            {getSessionContextLabel(session)}
          </Text>
          <Text
            style={[styles.chatHistoryPreview, { color: colors.muted }]}
            numberOfLines={1}
          >
            {session.messages[session.messages.length - 1]?.text ||
              "Sin mensajes todavía"}
          </Text>
        </View>
        <Text style={[styles.chatHistoryDate, { color: colors.muted }]}>
          {formatSessionDate(session.updatedAt)}
        </Text>
      </Pressable>
    );
  }

  function renderSetupForm(embedded = false) {
    return (
      <>
        <View style={styles.pickerContainer}>
          <Text style={[styles.pickerLabel, { color: colors.text }]}>
            Materia
          </Text>
          <View
            style={[
              styles.pickerWrapper,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Picker
              selectedValue={materiaId}
              onValueChange={(itemValue) => setMateriaId(String(itemValue))}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.primary}
            >
              {materias.length === 0 && (
                <Picker.Item
                  label="No hay materias disponibles"
                  value=""
                  color="#999"
                />
              )}
              {materias.map((sub) => (
                <Picker.Item key={sub.id} label={sub.name} value={sub.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerContainerSecondary}>
          <Text style={[styles.pickerLabel, { color: colors.text }]}>
            Clase o tema
          </Text>
          <View
            style={[
              styles.pickerWrapper,
              { backgroundColor: colors.input, borderColor: colors.border },
            ]}
          >
            <Picker
              selectedValue={classId}
              onValueChange={(itemValue) => setClassId(String(itemValue))}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.primary}
            >
              {clases.length === 0 && (
                <Picker.Item
                  label="No hay clases procesadas"
                  value=""
                  color="#999"
                />
              )}
              {clases.map((item) => (
                <Picker.Item key={item.id} label={item.title} value={item.id} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.twoColumns}>
          <View style={styles.column}>
            <Text style={[styles.pickerLabel, { color: colors.text }]}>
              Proveedor IA
            </Text>
            <View
              style={[
                styles.pickerWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={aiProvider}
                onValueChange={(value) => setAiProvider(value as AIProvider)}
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="Gemini · básico" value="gemini" />
                <Picker.Item label="GPT / OpenAI" value="openai" />
              </Picker>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={[styles.pickerLabel, { color: colors.text }]}>
              Modo
            </Text>
            <View
              style={[
                styles.pickerWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={contentType}
                onValueChange={(value) =>
                  setContentType(value as ClassContentType)
                }
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="General" value="general" />
                <Picker.Item label="Teoría" value="theory" />
                <Picker.Item label="Matemática" value="math" />
                <Picker.Item label="Imágenes/doc." value="image" />
              </Picker>
            </View>
          </View>
        </View>

        {chatSessions.length > 0 && (
          <View style={styles.pickerContainerSecondary}>
            <Text style={[styles.pickerLabel, { color: colors.text }]}>
              Conversaciones de esta clase
            </Text>
            <View
              style={[
                styles.pickerWrapper,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={chatSessionId || "__new__"}
                onValueChange={(value) => continuarCharla(String(value))}
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.primary}
              >
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
          </View>
        )}

        <Pressable
          style={[styles.startChatButton, { backgroundColor: colors.primary }]}
          onPress={
            embedded
              ? () => setSettingsOpen(false)
              : iniciarNuevaCharlaConfigurada
          }
        >
          <Text style={styles.startChatButtonText}>
            {embedded ? "Aplicar configuración" : "Iniciar conversación"}
          </Text>
        </Pressable>
      </>
    );
  }

  function renderHistoryScreen() {
    return (
      <View style={styles.modeScreen}>
        <View style={styles.historyHeader}>
          <View style={styles.historyHeaderText}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              Chats del Tutor IA
            </Text>
            <Text style={[styles.modeSubtitle, { color: colors.muted }]}>
              Elige una conversación anterior o crea una nueva.
            </Text>
          </View>
          <Pressable
            style={[styles.newChatButton, { backgroundColor: colors.primary }]}
            onPress={abrirConfiguracionNueva}
          >
            <PlusCircle color="#fff" size={18} />
            <Text style={styles.newChatButtonText}>Nueva</Text>
          </Pressable>
        </View>

        <FlatList
          data={allChatSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyListContent}
          renderItem={({ item }) => renderHistoryCard(item)}
          ListEmptyComponent={
            <View
              style={[
                styles.emptyChatsBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Bot color={colors.primary} size={42} />
              <Text style={[styles.emptyChatsTitle, { color: colors.text }]}>
                Aún no tienes chats guardados
              </Text>
              <Text style={[styles.emptyChatsText, { color: colors.muted }]}>
                Crea una conversación, selecciona materia y clase, y luego
                aparecerá aquí para continuarla.
              </Text>
              <Pressable
                style={[
                  styles.emptyNewButton,
                  { backgroundColor: colors.primarySoft },
                ]}
                onPress={abrirConfiguracionNueva}
              >
                <Text
                  style={[styles.emptyNewButtonText, { color: colors.primary }]}
                >
                  Crear primera conversación
                </Text>
              </Pressable>
            </View>
          }
        />
      </View>
    );
  }

  function renderSetupScreen() {
    return (
      <View style={styles.modeScreen}>
        <View style={styles.setupHeader}>
          <Pressable
            style={[styles.backButton, { backgroundColor: colors.primarySoft }]}
            onPress={abrirListaChats}
          >
            <ArrowLeft color={colors.primary} size={18} />
          </Pressable>
          <View style={styles.historyHeaderText}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>
              Nueva conversación
            </Text>
            <Text style={[styles.modeSubtitle, { color: colors.muted }]}>
              Primero configura el chat y luego empieza a conversar.
            </Text>
          </View>
        </View>

        <ScrollView
          style={[
            styles.setupCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          contentContainerStyle={styles.setupCardContent}
          keyboardShouldPersistTaps="handled"
        >
          {renderSetupForm(false)}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {screenMode === "history" ? (
        renderHistoryScreen()
      ) : screenMode === "setup" ? (
        renderSetupScreen()
      ) : (
        <KeyboardAvoidingView
          style={styles.chatArea}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
        >
          <View
            style={[
              styles.topPanel,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={styles.topTitleRow}>
              <Pressable
                style={[
                  styles.backButton,
                  { backgroundColor: colors.primarySoft },
                ]}
                onPress={abrirListaChats}
              >
                <ArrowLeft color={colors.primary} size={18} />
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text style={[styles.screenTitle, { color: colors.text }]}>
                  Tutor IA por clase
                </Text>
                <Text style={[styles.screenSubtitle, { color: colors.muted }]}>
                  Contexto exacto de la conversación seleccionada.
                </Text>
              </View>

              <Pressable
                style={[
                  styles.configButton,
                  {
                    backgroundColor: colors.primarySoft,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSettingsOpen((value) => !value)}
              >
                <SlidersHorizontal color={colors.primary} size={17} />
                <Text
                  style={[styles.configButtonText, { color: colors.primary }]}
                >
                  Configurar
                </Text>
                {settingsOpen ? (
                  <ChevronUp color={colors.primary} size={16} />
                ) : (
                  <ChevronDown color={colors.primary} size={16} />
                )}
              </Pressable>
            </View>

            <View style={styles.selectionRow}>
              <View
                style={[
                  styles.selectionChip,
                  { backgroundColor: colors.chip, borderColor: colors.border },
                ]}
              >
                <BookOpen size={14} color={colors.primary} />
                <Text
                  style={[styles.selectionChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedSubject?.name || "Sin materia"}
                </Text>
              </View>
              <View
                style={[
                  styles.selectionChip,
                  styles.classChip,
                  { backgroundColor: colors.chip, borderColor: colors.border },
                ]}
              >
                <FolderOpen size={14} color={colors.purple} />
                <Text
                  style={[styles.selectionChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedClass?.title ||
                    selectedSession?.classTitle ||
                    "Sin clase"}
                </Text>
              </View>
              <View
                style={[
                  styles.selectionChip,
                  { backgroundColor: colors.chip, borderColor: colors.border },
                ]}
              >
                <Sparkles size={14} color={colors.success} />
                <Text
                  style={[styles.selectionChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {providerLabel} · {contentType}
                </Text>
              </View>
              <View
                style={[
                  styles.selectionChip,
                  { backgroundColor: colors.chip, borderColor: colors.border },
                ]}
              >
                <MessageSquare size={14} color={colors.primary} />
                <Text
                  style={[styles.selectionChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedSession?.title || "Nueva charla"}
                </Text>
              </View>
            </View>

            {settingsOpen && (
              <ScrollView
                style={[
                  styles.configPanel,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                contentContainerStyle={styles.configPanelContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {renderSetupForm(true)}
              </ScrollView>
            )}
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            contentContainerStyle={styles.list}
            style={styles.chatList}
            renderItem={({ item, index }) => {
              const next = messages[index + 1];
              const isLastInGroup = !next || next.sender !== item.sender;
              return (
                <MessageBubble item={item} isLastInGroup={isLastInGroup} />
              );
            }}
            ListFooterComponent={loading ? <TypingIndicator /> : null}
          />

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.inputContainer,
                { backgroundColor: colors.input },
                inputFocused && {
                  borderColor: colors.primary,
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Pressable
                style={[
                  styles.attachButton,
                  { backgroundColor: colors.primarySoft },
                ]}
                onPress={adjuntarArchivo}
                disabled={!materiaId || !classId || loading}
              >
                <Paperclip
                  color={materiaId && classId ? colors.primary : "#94A3B8"}
                  size={21}
                />
              </Pressable>

              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder={
                  !materiaId
                    ? "Selecciona una materia primero..."
                    : !classId
                      ? "Selecciona una clase o tema primero..."
                      : "Escribe tu pregunta aquí..."
                }
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
                  (loading || !inputText.trim() || !materiaId || !classId) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={enviarMensaje}
                disabled={
                  loading || !inputText.trim() || !materiaId || !classId
                }
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Send color="#fff" size={22} strokeWidth={2.5} />
                )}
              </Pressable>
            </View>
            {inputText.length > 500 && (
              <Text style={[styles.charCount, { color: colors.muted }]}>
                {inputText.length}/600
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {!keyboardVisible && (
        <AppBottomBar activeTab="Chatbot" subjectId={materiaId} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: {
    flex: 1,
  },
  modeScreen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  historyHeaderText: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: "900",
  },
  modeSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  newChatButton: {
    minHeight: 42,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newChatButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  historyListContent: {
    paddingBottom: 16,
    gap: 10,
  },
  chatHistoryCard: {
    minHeight: 78,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chatHistoryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHistoryBody: {
    flex: 1,
  },
  chatHistoryTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  chatHistoryMeta: {
    marginTop: 2,
    fontSize: 11.5,
    fontWeight: "700",
  },
  chatHistoryPreview: {
    marginTop: 3,
    fontSize: 11.5,
    fontWeight: "500",
  },
  chatHistoryDate: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  emptyChatsBox: {
    marginTop: 26,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
  },
  emptyChatsTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyChatsText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    fontWeight: "600",
  },
  emptyNewButton: {
    marginTop: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  emptyNewButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  setupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  setupCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
  },
  setupCardContent: {
    paddingBottom: 16,
  },
  startChatButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  startChatButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  topPanel: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  topTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  screenTitle: {
    fontSize: 19,
    fontWeight: "900",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  configButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  selectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  selectionChip: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "700",
    flexShrink: 1,
  },
  configPanel: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    maxHeight: 430,
  },
  configPanelContent: {
    paddingBottom: 2,
  },
  pickerContainer: {
    marginTop: 0,
  },
  pickerContainerSecondary: {
    marginTop: 10,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
  },
  pickerWrapper: {
    borderRadius: 14,
    minHeight: 48,
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  picker: {
    width: "100%",
  },
  configHelp: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: -4,
    marginBottom: 8,
    fontWeight: "600",
  },
  globalHistoryList: {
    gap: 8,
  },
  emptyHistoryCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  emptyHistoryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyItem: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  historyTextBox: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 12.5,
    fontWeight: "900",
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
  },
  historyDate: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  twoColumns: {
    flexDirection: "row",
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  basicButtonText: {
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
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
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingLeft: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "transparent",
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    boxShadow: "0px 4px 8px rgba(37, 99, 235, 0.24)",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
    marginRight: 4,
  },
});
