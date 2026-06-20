import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Send } from "lucide-react-native";
import { generateText, getEmbedding } from "../lib/gemini";
import { supabase } from "../lib/supabase";
import MessageBubble from "../utils/MessageBubble";
import { COLORS } from "../components/ui/Colors";
import TypingIndicator from "../utils/burbujaEscribiendo";
import { chatBot_Prompt } from "../utils/prompt";

type Props = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

// Decidimos cuantos mensajes guarde para recordare el contexto
const MAX_HISTORIAL = 5;

// Arma un bloque de texto plano con los últimos mensajes de la charla, para que el modelo entienda a qué se refiere una pregunta de seguimiento
function construirHistorial(msgs: Props[]) {
  if (msgs.length === 0) return "";
  const recientes = msgs.slice(-MAX_HISTORIAL);
  const lineas = recientes.map(
    (m) => `${m.sender === "user" ? "Estudiante" : "Tutor"}: ${m.text}`,
  );
  return (
    `Historial reciente de la conversación (es solo para que entiendas el ` +
    `contexto de la charla; seguí respondiendo ÚNICAMENTE en base a los ` +
    `apuntes de la materia, no inventes nada por fuera de eso):\n` +
    `${lineas.join("\n")}\n\n`
  );
}

export default function ChatbotScreen() {
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Props[]>([
    {
      id: "1",
      text: "¡Hola! Soy tu tutor de IA. Por favor, selecciona una materia arriba para que pueda buscar información exacta y actualizada en tus apuntes.",
      sender: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // States para materias
  const [materia, setMateria] = useState<any[]>([]);
  const [materiaId, setMateriaId] = useState<string>("");

  useEffect(() => {
    leerMaterias();
  }, []);

  useEffect(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  // Si cambia la materia seleccionada, arrancamos la charla de nuevo.
  useEffect(() => {
    if (!materiaId) return;
    setMessages([
      {
        id: "1",
        text: "¡Listo! Preguntame lo que necesites sobre esta materia.",
        sender: "bot",
      },
    ]);
  }, [materiaId]);

  async function leerMaterias() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setMateria(data);
        if (data.length > 0) {
          setMateriaId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error cargando materias:", error);
    }
  }

  async function enviarMensaje() {
    if (!inputText.trim() || loading) return;

    const userMessage: Props = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
    };

    // Guardamos en el historial el mensaje
    const historial = construirHistorial(messages);

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("No autenticado");

      // Generamos la pregunta en embedding
      const queryEmbedding = await getEmbedding(userMessage.text);

      // Buscamos la similitud
      const { data: matches, error: rpcError } = await supabase.rpc(
        "match_audio_embeddings",
        {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_threshold: 0.5,
          match_count: 5,
          p_user_id: userId,
          p_subject_id: materiaId,
        },
      );

      if (rpcError) throw rpcError;

      // Creamos el prompt para el RAG
      let contextText = "";
      if (matches && matches.length > 0) {
        contextText = matches.map((m: any) => m.content).join("\n\n");
      }

      // Creamos el prompt con el historial
      const prompt = `${historial}${chatBot_Prompt(contextText, userMessage.text)}`;

      // Pasamos a gemini para que genere la respuesta
      const botResponseText = await generateText(prompt);

      const botMessage: Props = {
        id: (Date.now() + 1).toString(),
        text: botResponseText || "Lo siento, no pude generar una respuesta.",
        sender: "bot",
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
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
    <View style={styles.container}>
      {/* Selector de Materias Obligatorio */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Materia:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={materiaId}
            onValueChange={(itemValue) => setMateriaId(itemValue)}
            style={styles.picker}
            dropdownIconColor={COLORS.primary}
          >
            {materia.length === 0 && (
              <Picker.Item
                label="No hay materias disponibles"
                value=""
                color="#999"
              />
            )}
            {materia.map((sub) => (
              <Picker.Item key={sub.id} label={sub.name} value={sub.id} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Input en la parte superior */}
      <View style={styles.inputWrapper}>
        <View
          style={[
            styles.inputContainer,
            inputFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder={
              !materiaId
                ? "Selecciona una materia primero..."
                : "Escribe tu pregunta aquí..."
            }
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            multiline
            maxLength={600}
            placeholderTextColor={COLORS.placeholder}
            editable={!!materiaId}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (loading || !inputText.trim() || !materiaId) &&
                styles.sendButtonDisabled,
            ]}
            onPress={enviarMensaje}
            disabled={loading || !inputText.trim() || !materiaId}
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
          <Text style={styles.charCount}>{inputText.length}/600</Text>
        )}
      </View>

      {/* Chat Area */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* Selector de Materias */
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: COLORS.text,
    marginRight: 10,
  },
  pickerWrapper: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 100,
    color: COLORS.text,
  },

  /* Input Superior */
  inputWrapper: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: COLORS.inputBg,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingLeft: 4,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
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
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    margin: 2,
    shadowColor: COLORS.primary,
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
    color: COLORS.placeholder,
    textAlign: "right",
    marginTop: 4,
    marginRight: 4,
  },

  /* Lista de mensajes */
  list: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 8,
    flexGrow: 1,
  },
});
