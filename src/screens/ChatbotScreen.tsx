import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { RouteProp, useRoute } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import {
  Send,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
} from "lucide-react-native";
import MessageBubble from "../utils/MessageBubble";
import TypingIndicator from "../utils/burbujaEscribiendo";
import { useThemeMode } from "../shared/theme/ThemeContext";
import { Subject } from "../domain/entities/Subject";
import { AudioNote } from "../domain/entities/AudioNote";
import { ConversationMessage } from "../domain/entities/ConversationMessage";
import { ClassContentType } from "../domain/entities/ClassContentType";
import {
  askTutorUseCase,
  listAudioNotesUseCase,
  listSubjectsUseCase,
} from "../application/container";
import { supabase } from "../infrastructure/supabase/supabaseClient";
import { PropsList } from "../navigation/AppNavigator";

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

export default function ChatbotScreen() {
  const route = useRoute<RouteProp<PropsList, "Chatbot">>();
  const { colors, isDark } = useThemeMode();
  const initialSubjectId = route.params?.subjectId || "";
  const initialClassId = route.params?.classId || "";
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "¡Hola! Soy tu tutor de IA. Selecciona una materia y luego una clase/tema para consultar solo ese contenido.",
      sender: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const [materia, setMateria] = useState<Subject[]>([]);
  const [materiaId, setMateriaId] = useState<string>(initialSubjectId);
  const [clases, setClases] = useState<AudioNote[]>([]);
  const [classId, setClassId] = useState<string>(initialClassId);
  const [contentType, setContentType] = useState<ClassContentType>("general");
  const [pendingAttachment, setPendingAttachment] = useState<{
    mimeType: string;
    base64Data: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    leerMaterias();
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
    leerClases(materiaId);
  }, [materiaId]);

  useEffect(() => {
    const selectedClass = clases.find((item) => item.id === classId);
    if (!materiaId) return;

    setMessages([
      {
        id: "1",
        text: selectedClass
          ? `¡Listo! Pregúntame sobre la clase "${selectedClass.title}". El sistema usará solo el resumen y la transcripción de ese tema.`
          : "Selecciona una clase/tema de esta materia antes de preguntar. Así el chat no revisará toda la materia.",
        sender: "bot",
      },
    ]);
  }, [classId, clases, materiaId]);

  async function leerMaterias() {
    try {
      const data = await listSubjectsUseCase.execute();
      setMateria(data);
      if (!materiaId && data.length > 0) {
        setMateriaId(data[0].id);
      }
    } catch (error) {
      console.error("Error cargando materias:", error);
    }
  }

  async function leerClases(subjectId: string) {
    try {
      const data = await listAudioNotesUseCase.execute(subjectId);
      setClases(data);

      const initialExists =
        initialClassId && data.some((item) => item.id === initialClassId);
      if (initialExists) {
        setClassId(initialClassId);
        return;
      }

      setClassId(data[0]?.id || "");
    } catch (error) {
      console.error("Error cargando clases:", error);
      setClases([]);
      setClassId("");
    }
  }

  async function adjuntarArchivo() {
    if (!materiaId || !classId) {
      Alert.alert(
        "Selecciona una clase",
        "Primero selecciona la materia y la clase/tema para asociar el archivo al chat.",
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
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("No estás autenticado");

      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: "base64",
      });
      const safeName = (asset.name || "archivo").replace(
        /[^a-zA-Z0-9_.-]/g,
        "_",
      );

      setPendingAttachment({
        mimeType: asset.mimeType || "application/octet-stream",
        base64Data: base64,
        name: asset.name || safeName,
      });

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
        uploaded_by: userId,
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
    } catch (error: any) {
      Alert.alert("Error al adjuntar", error.message || String(error));
    }
  }

  async function enviarMensaje() {
    if (!inputText.trim() && !pendingAttachment) return;
    if (loading) return;
    if (!materiaId || !classId) {
      Alert.alert(
        "Selecciona una clase",
        "Escoge primero la materia y la clase/tema para que el chat use solo ese contexto.",
      );
      return;
    }

    const messageText =
      inputText.trim() ||
      (pendingAttachment ? `[Archivo adjunto: ${pendingAttachment.name}]` : "");

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
    };

    const history: ConversationMessage[] = messages.map((message) => ({
      id: message.id,
      text: message.text,
      sender: message.sender,
    }));

    setMessages((prev) => [...prev, userMessage]);

    const attachmentToSend = pendingAttachment;

    setInputText("");
    setPendingAttachment(null);
    setLoading(true);

    try {
      const botResponseText = await askTutorUseCase.execute({
        question: messageText,
        subjectId: materiaId,
        classId,
        history,
        contentType,
        attachment: attachmentToSend
          ? {
              mimeType: attachmentToSend.mimeType,
              base64Data: attachmentToSend.base64Data,
            }
          : undefined,
      });

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: botResponseText || "Lo siento, no pude generar una respuesta.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          text: "Hubo un error al procesar tu pregunta.",
          sender: "bot",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Selectores de Contexto de Clase */}
      <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.pickerLabel, { color: colors.text }]}>Materia:</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: colors.background }]}>
          <Picker
            selectedValue={materiaId}
            onValueChange={(itemValue) => setMateriaId(itemValue)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.primary}
          >
            {materia.length === 0 && (
              <Picker.Item
                label="No hay materias disponibles"
                value=""
                color={colors.muted}
                style={{ backgroundColor: colors.background }}
              />
            )}
            {materia.map((sub) => (
              <Picker.Item 
                key={sub.id} 
                label={sub.name} 
                value={sub.id} 
                color={colors.text}
                style={{ backgroundColor: colors.background }}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[styles.pickerContainerSecondary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.pickerLabel, { color: colors.text }]}>Clase:</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: colors.background }]}>
          <Picker
            selectedValue={classId}
            onValueChange={(itemValue) => setClassId(itemValue)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.primary}
          >
            {clases.length === 0 && (
              <Picker.Item
                label="No hay clases procesadas"
                value=""
                color={colors.muted}
                style={{ backgroundColor: colors.background }}
              />
            )}
            {clases.map((item) => (
              <Picker.Item 
                key={item.id} 
                label={item.title} 
                value={item.id} 
                color={colors.text}
                style={{ backgroundColor: colors.background }}
              />
            ))}
          </Picker>
        </View>
      </View>

      <View style={[styles.pickerContainerSecondary, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.pickerLabel, { color: colors.text }]}>Ruta IA:</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: colors.background }]}>
          <Picker
            selectedValue={contentType}
            onValueChange={(value) => setContentType(value)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.primary}
          >
            <Picker.Item label="General · mejor para respuestas rápidas" value="general" color={colors.text} style={{ backgroundColor: colors.background }} />
            <Picker.Item label="Teoría · mejor para conceptos y resúmenes" value="theory" color={colors.text} style={{ backgroundColor: colors.background }} />
            <Picker.Item label="Matemática · mejor para razonamiento paso a paso" value="math" color={colors.text} style={{ backgroundColor: colors.background }} />
            <Picker.Item label="Imágenes · mejor para lectura visual" value="image" color={colors.text} style={{ backgroundColor: colors.background }} />
          </Picker>
        </View>
      </View>

      {/* Historial del Feed de Conversación */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const next = messages[index + 1];
          const isLastInGroup = !next || next.sender !== item.sender;
          return <MessageBubble item={item} isLastInGroup={isLastInGroup} />;
        }}
        ListFooterComponent={loading ? <TypingIndicator /> : null}
      />

      {/* Caja de Entrada de Texto y Adjuntos (Fija abajo) */}
      <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, borderBottomWidth: 0 }]}>
        {pendingAttachment && (
          <View style={[styles.attachmentChip, { backgroundColor: isDark ? `${colors.primary}18` : "#EEF2FF", borderColor: isDark ? `${colors.primary}44` : "#C7D2FE" }]}>
            {pendingAttachment.mimeType.startsWith("image/") ? (
              <ImageIcon color={colors.primary} size={18} />
            ) : (
              <FileText color={colors.primary} size={18} />
            )}
            <Text style={[styles.attachmentName, { color: colors.primary }]} numberOfLines={1}>
              {pendingAttachment.name}
            </Text>
            <TouchableOpacity
              onPress={() => setPendingAttachment(null)}
              style={styles.removeAttachmentButton}
            >
              <X color="#EF4444" size={18} />
            </TouchableOpacity>
          </View>
        )}
        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.background },
            inputFocused && { borderColor: colors.primary, backgroundColor: colors.surface },
          ]}
        >
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: isDark ? `${colors.primary}15` : "#EFF6FF" }]}
            onPress={adjuntarArchivo}
            disabled={!materiaId || !classId || loading}
          >
            <Paperclip
              color={materiaId && classId ? colors.primary : (isDark ? "#475569" : "#94A3B8")}
              size={21}
            />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={
              !materiaId
                ? "Selecciona una materia primero..."
                : !classId
                  ? "Selecciona una clase/tema primero..."
                  : pendingAttachment
                    ? "Añade un mensaje a tu archivo..."
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
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: colors.primary, shadowColor: colors.primary },
              (loading ||
                (!inputText.trim() && !pendingAttachment) ||
                !materiaId ||
                !classId) &&
                styles.sendButtonDisabled,
            ]}
            onPress={enviarMensaje}
            disabled={
              loading ||
              (!inputText.trim() && !pendingAttachment) ||
              !materiaId ||
              !classId
            }
            activeOpacity={0.75}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Send color="#fff" size={22} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        </View>
        {inputText.length > 500 && (
          <Text style={[styles.charCount, { color: colors.muted }]}>{inputText.length}/600</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pickerContainerSecondary: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginRight: 10,
  },
  pickerWrapper: {
    flex: 1,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 100,
  },
  inputWrapper: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  attachmentName: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  removeAttachmentButton: {
    padding: 4,
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
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
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
  list: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
});