import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "../lib/supabase";
import { generateText, getEmbedding } from "../lib/gemini";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import { Upload, CheckCircle } from "lucide-react-native";
import LoadingModal from "../components/ui/LoadingModal";
import { audio_Prompt } from "../utils/prompt";

export default function AudioRecorderScreen() {
  const route = useRoute<RouteProp<PropsList, "Audio">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId } = route.params;

  const [titulo, setTitulo] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState<string>("");

  // Podemos seleccionar archivos con las siguientes extensiones mp3, wav, m4a, etc
  async function seleccionarAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      setAudioUri(result.assets[0].uri);
    } catch (err) {
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  }

  async function guardarData() {
    if (!titulo) return Alert.alert("Error", "Por favor ingresa un título");
    if (!audioUri) return Alert.alert("Error", "No hay audio para procesar");

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("No estás autenticado");

      setLoading(true);
      setTextLoading("Leyendo archivo de audio...");

      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: "base64",
      });

      setTextLoading("Analizando audio con IA (puede tardar)...");

      const prompt = audio_Prompt();

      // Pasamos a la IA el audio y el prompt para que pueda generar el resumen
      const generacionResumen = await generateText(
        prompt,
        "audio/m4a",
        base64Audio,
      );

      if (!generacionResumen) {
        throw new Error("No se pudo realizar el análisis");
      }

      // Separar transcripción y resumen buscando el encabezado "# Resumen"
      const secciones = generacionResumen.split("# Resumen");
      const transcripcion = secciones[0].replace("# Transcripción", "").trim();
      const resumen = secciones.length > 1 ? secciones[1].trim() : "";

      setTextLoading("Guardando en la base de datos...");

      // Se guarda la transcripción
      const { data: audioRecord, error: dbError } = await supabase
        .from("audios")
        .insert([
          {
            user_id: userId,
            subject_id: subjectId,
            title: titulo,
            summary: resumen,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setTextLoading("Generando embeddings para búsqueda semántica...");

      // Generar embeddings para chunks del resumen/transcript
      const textoEmbedding = `Título: ${titulo}\n\nResumen: ${resumen}\n\nTranscripción: ${transcripcion}`;

      // Dividimos los chunks en bloques de 1000 caracteres para mejorar el RAG
      const chunks = textoEmbedding.match(/(.|[\r\n]){1,1000}/g) || [
        textoEmbedding,
      ];

      for (const chunk of chunks) {
        // Ignorar chunks vacíos
        if (!chunk.trim()) continue;

        // Generamos un arreglo con todos los chunk de ese audio
        const arregloEmbedding = await getEmbedding(chunk);

        // Formatear a string de array tipo PostgreSQL vector: "[0.1, 0.2, ...]"
        const embeddingString = `[${arregloEmbedding.join(",")}]`;

        const { error: embedDbError } = await supabase
          .from("audio_embeddings")
          .insert([
            {
              user_id: userId,
              audio_id: audioRecord.id,
              content: chunk,
              embedding: embeddingString,
            },
          ]);

        if (embedDbError) {
          console.error("Error guardando embedding:", embedDbError);
          throw new Error(
            "No se pudo guardar la información de búsqueda semántica.",
          );
        }
      }

      Alert.alert(
        "Éxito",
        "El apunte ha sido procesado y guardado correctamente.",
      );
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error en el proceso", err.message || String(err));
    } finally {
      setLoading(false);
      setTextLoading("");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Título del apunte</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Clase 1 - Introducción"
          value={titulo}
          onChangeText={setTitulo}
        />

        <Text style={styles.label}>Fuente de audio</Text>

        <View style={styles.audioControls}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton]}
            onPress={seleccionarAudio}
            disabled={loading}
          >
            <Upload color="#fff" size={24} />
            <Text style={styles.actionButtonText}>Subir Archivo de Audio</Text>
          </TouchableOpacity>
        </View>

        {audioUri && (
          <View style={styles.successBox}>
            <CheckCircle color="#34C759" size={20} />
            <Text style={styles.successText}>Audio listo para procesar</Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!titulo || !audioUri || loading) && styles.disabledButton,
          ]}
          onPress={guardarData}
          disabled={!titulo || !audioUri || loading}
        >
          <Text style={styles.submitText}>Procesar y Guardar</Text>
        </TouchableOpacity>
      </View>
      <LoadingModal visible={loading} text={textLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    marginLeft: 15,
    marginRight: 15,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#eee",
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
  },
  audioControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FF3B30",
    padding: 15,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadButton: { backgroundColor: "#007AFF" },
  actionButtonText: { color: "#fff", fontWeight: "bold", marginLeft: 8 },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  successText: { color: "#2e7d32", fontWeight: "600", marginLeft: 10 },
  submitButton: {
    backgroundColor: "#007AFF",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: { backgroundColor: "#A2C8F2" },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  processingContainer: { flexDirection: "row", alignItems: "center" },
});
