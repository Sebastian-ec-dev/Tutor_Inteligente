import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Audio } from "expo-av";
import { Picker } from "@react-native-picker/picker";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import {
  Upload,
  CheckCircle,
  Brain,
  Mic,
  Sparkles,
  Square,
  Clock,
  Pause,
  Play,
} from "lucide-react-native";
import LoadingModal from "../components/ui/LoadingModal";
import { useThemeMode } from "../shared/theme/ThemeContext";
import {
  ClassContentType,
  CLASS_CONTENT_LABELS,
} from "../domain/entities/ClassContentType";
import {
  AI_MODEL_CAPABILITIES,
  getModelCapabilityByContentType,
} from "../domain/entities/AIModelCapability";
import { processAudioNoteUseCase } from "../application/container";
import { env } from "../shared/config/env";

const BLUE = "#2563EB";
const PURPLE = "#7C3AED";
const BG = "#F8FAFC";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const GREEN = "#22C55E";
const ORANGE = "#F59E0B";

const CONTENT_TYPE_OPTIONS: ClassContentType[] = [
  "theory",
  "math",
  "image",
  "general",
];

export default function AudioRecorderScreen() {
  const route = useRoute<RouteProp<PropsList, "Audio">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors, isDark } = useThemeMode();
  const { subjectId, audioNoteId, audioNoteTitle } = route.params;
  const isAppendingToClass = !!audioNoteId;

  const [titulo, setTitulo] = useState(audioNoteTitle || "");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [mimeType, setMimeType] = useState("audio/m4a");
  const [contentType, setContentType] = useState<ClassContentType>("theory");
  const [loading, setLoading] = useState(false);
  const [textLoading, setTextLoading] = useState<string>("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedCapability = useMemo(
    () => getModelCapabilityByContentType(contentType),
    [contentType],
  );

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(
        () => setSeconds((value) => value + 1),
        1000,
      );
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const secs = (value % 60).toString().padStart(2, "0");
    return `${minutes}:${secs}`;
  };

  async function iniciarGrabacion() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Activa el permiso de micrófono para grabar desde la app.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setSeconds(0);
      setAudioUri(null);
      setAudioName("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo iniciar la grabación");
    }
  }

  async function detenerGrabacion() {
    try {
      if (!recording) return;
      setIsRecording(false);
      setIsPaused(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        Alert.alert("Error", "No se pudo obtener el archivo de audio grabado.");
        return;
      }

      const fileName = `grabacion_${new Date().toISOString().replace(/[:.]/g, "-")}.m4a`;
      setAudioUri(uri);
      setAudioName(fileName);
      setMimeType("audio/m4a");

      if (!titulo.trim()) {
        setTitulo(`Clase grabada ${new Date().toLocaleDateString()}`);
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo finalizar la grabación",
      );
    }
  }

  async function pausarGrabacion() {
    try {
      if (!recording) return;
      await recording.pauseAsync();
      setIsPaused(true);
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo pausar la grabación");
    }
  }

  async function continuarGrabacion() {
    try {
      if (!recording) return;
      await recording.startAsync();
      setIsPaused(false);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "No se pudo continuar la grabación",
      );
    }
  }

  async function seleccionarAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setAudioUri(asset.uri);
      setAudioName(asset.name || "audio_seleccionado");
      setMimeType(asset.mimeType || "audio/m4a");

      if (!titulo.trim() && asset.name) {
        setTitulo(asset.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo seleccionar el archivo");
    }
  }

  async function guardarData() {
    try {
      setLoading(true);
      await processAudioNoteUseCase.execute({
        title: titulo,
        subjectId,
        audioNoteId,
        audioUri: audioUri || "",
        mimeType,
        contentType,
        onProgress: setTextLoading,
      });
      Alert.alert(
        "Éxito",
        isAppendingToClass
          ? "El audio adicional fue agregado a esta clase y el chat ya consultará el contexto actualizado."
          : "El apunte fue procesado correctamente y quedó listo para revisar y consultar en el chat.",
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.heroCard, 
        { 
          backgroundColor: isDark ? `${PURPLE}15` : "#EEF2FF", 
          borderColor: isDark ? `${PURPLE}44` : "#C7D2FE" 
        }
      ]}>
        <View style={styles.heroIcon}>
          <Brain color="#fff" size={26} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            {isAppendingToClass
              ? "Agregar audio a la clase"
              : "Procesamiento inteligente"}
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>
            {isAppendingToClass
              ? "El nuevo audio se unirá a la clase seleccionada. La transcripción, el resumen y el chat se actualizarán solo para este tema."
              : "La pantalla no llama directo a Gemini, GPT ni Whisper. El core procesa el audio y prepara un resumen estructurado para el chat contextual."}
          </Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Datos de la clase</Text>

        <Text style={[styles.label, { color: colors.muted }]}>Nombre de la clase/tema</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Ej. Test 1 - Normalización"
          placeholderTextColor={colors.muted}
          value={titulo}
          onChangeText={setTitulo}
          editable={!loading}
        />
        <Text style={[styles.helperText, { color: colors.muted }]}>
          {isAppendingToClass
            ? "Este audio se agregará dentro de la clase seleccionada, sin crear otra tarjeta."
            : "Puedes escribir el nombre manualmente. Si lo dejas vacío, la app generará un título automático con base en el resumen o la transcripción."}
        </Text>

        <Text style={[styles.label, { color: colors.muted }]}>Tipo de contenido académico</Text>
        <View style={[styles.pickerWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Picker
            selectedValue={contentType}
            onValueChange={(value) => setContentType(value)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.text}
          >
            {CONTENT_TYPE_OPTIONS.map((option) => {
              const model = getModelCapabilityByContentType(option);
              return (
                <Picker.Item
                  key={option}
                  label={`${CLASS_CONTENT_LABELS[option]} · ${model.provider} ${model.modelName}`}
                  value={option}
                  color={colors.text}
                  style={{ backgroundColor: colors.background }}
                />
              );
            })}
          </Picker>
        </View>

        <View style={[
          styles.selectedModelCard, 
          { 
            backgroundColor: isDark ? `${PURPLE}12` : "#F5F3FF", 
            borderColor: isDark ? `${PURPLE}33` : "#DDD6FE" 
          }
        ]}>
          <View style={styles.selectedModelHeader}>
            <Sparkles color={PURPLE} size={18} />
            <Text style={[styles.selectedModelTitle, { color: colors.text }]}>
              {selectedCapability.provider} {selectedCapability.modelName}
            </Text>
          </View>
          <Text style={[styles.selectedModelText, { color: colors.muted }]}>
            Mejor para: {selectedCapability.bestFor}
          </Text>
          <Text style={[styles.selectedModelText, { color: colors.muted }]}>
            Uso dentro de la app: {selectedCapability.usedWhen}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Audio de la clase</Text>
        <View style={[
          styles.transcriptionCard, 
          { 
            backgroundColor: isDark ? `${BLUE}12` : "#EFF6FF", 
            borderColor: isDark ? `${BLUE}33` : "#BFDBFE" 
          }
        ]}>
          <Mic color={BLUE} size={19} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.transcriptionTitle, { color: colors.text }]}>
              OpenAI Whisper / transcriptor de audio
            </Text>
            <Text style={[styles.transcriptionText, { color: colors.muted }]}>
              Mejor para convertir grabaciones en texto. Si no hay API
              configurada, el proyecto usa el transcriptor de respaldo o Mock AI
              para pruebas.
            </Text>
          </View>
        </View>

        <View style={[styles.recordCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.recordHeader}>
            <Clock color={isRecording ? "#EF4444" : BLUE} size={18} />
            <Text
              style={[
                styles.recordTime,
                { color: colors.text },
                isRecording && styles.recordTimeActive,
              ]}
            >
              {formatTime(seconds)}
            </Text>
            <Text style={[styles.recordStatus, { color: colors.muted }]}>
              {isRecording
                ? isPaused
                  ? "Grabación pausada"
                  : "Grabando desde la app..."
                : "Listo para grabar"}
            </Text>
          </View>

          {!isRecording ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.recordStartButton]}
              onPress={iniciarGrabacion}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Mic color="#fff" size={21} />
              <Text style={styles.actionButtonText}>
                Grabar audio desde la app
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.recordControlsRow}>
              <TouchableOpacity
                style={[
                  styles.smallRecordButton,
                  isPaused ? styles.resumeButton : styles.pauseButton,
                ]}
                onPress={isPaused ? continuarGrabacion : pausarGrabacion}
                disabled={loading}
                activeOpacity={0.85}
              >
                {isPaused ? (
                  <Play color="#fff" size={18} />
                ) : (
                  <Pause color="#fff" size={18} />
                )}
                <Text style={styles.smallRecordButtonText}>
                  {isPaused ? "Continuar" : "Pausar"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallRecordButton, styles.stopButton]}
                onPress={detenerGrabacion}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Square color="#fff" size={18} />
                <Text style={styles.smallRecordButtonText}>
                  Guardar segmento
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.uploadButton]}
          onPress={seleccionarAudio}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Upload color="#fff" size={22} />
          <Text style={styles.actionButtonText}>Subir archivo de audio</Text>
        </TouchableOpacity>

        {audioUri && (
          <View style={[styles.successBox, { backgroundColor: isDark ? "#14532d" : "#DCFCE7" }]}>
            <CheckCircle color={GREEN} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.successText, { color: isDark ? "#4ade80" : "#166534" }]}>Audio listo para procesar</Text>
              <Text style={[styles.successSubText, { color: isDark ? "#86efac" : "#166534" }]}>
                El archivo se preparó correctamente.
              </Text>
            </View>
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Modelos disponibles</Text>
        <View style={styles.modelList}>
          {AI_MODEL_CAPABILITIES.map((item) => (
            <View key={item.id} style={[styles.modelCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.modelName, { color: colors.text }]}>
                {item.provider} · {item.modelName}
              </Text>
              <Text style={styles.modelRoute}>{item.routeLabel}</Text>
              <Text style={[styles.modelBest, { color: colors.muted }]}>Mejor para: {item.bestFor}</Text>
            </View>
          ))}
        </View>

        {env.useMockAI && (
          <View style={[styles.mockBox, { backgroundColor: isDark ? "#78350f" : "#FEF3C7", borderColor: isDark ? "#92400E" : "#FDE68A" }]}>
            <Text style={styles.mockTitle}>Modo prueba activo</Text>
            <Text style={[styles.mockText, { color: isDark ? "#fde68a" : "#92400E" }]}>
              EXPO_PUBLIC_USE_MOCK_AI=true. La app simula resumen, transcripción
              y chat contextual directo sin consumir APIs externas.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!audioUri || loading) && styles.disabledButton,
          ]}
          onPress={guardarData}
          disabled={!audioUri || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.submitText}>
            {isAppendingToClass
              ? "Agregar audio a esta clase"
              : "Procesar y guardar clase"}
          </Text>
        </TouchableOpacity>
      </View>
      <LoadingModal visible={loading} text={textLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: BG,
    padding: 16,
  },
  heroCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 14,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 3,
  },
  heroSubtitle: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: MUTED,
    marginBottom: 7,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 14,
    fontSize: 15,
    color: TEXT,
  },
  pickerWrapper: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    marginBottom: 10,
    overflow: "hidden",
  },
  picker: {
    height: 54,
    width: "100%",
  },
  helperText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
    marginBottom: 10,
  },
  selectedModelCard: {
    borderRadius: 16,
    padding: 13,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    marginBottom: 14,
  },
  selectedModelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  selectedModelTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  selectedModelText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  transcriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: 13,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 12,
  },
  transcriptionTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  transcriptionText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  uploadButton: { backgroundColor: BLUE },
  recordStartButton: { backgroundColor: PURPLE },
  stopButton: { backgroundColor: "#EF4444" },
  recordCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  recordControlsRow: { flexDirection: "row", gap: 10 },
  smallRecordButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  smallRecordButtonText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  pauseButton: { backgroundColor: ORANGE },
  resumeButton: { backgroundColor: GREEN },
  recordTime: {
    color: TEXT,
    fontWeight: "900",
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  recordTimeActive: { color: "#EF4444" },
  recordStatus: { color: MUTED, fontSize: 12, fontWeight: "800", flex: 1 },
  actionButtonText: {
    color: "#fff",
    fontWeight: "900",
    marginLeft: 8,
    fontSize: 14,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 13,
    borderRadius: 14,
    marginBottom: 14,
    gap: 10,
  },
  successText: { color: "#166534", fontWeight: "900", fontSize: 13 },
  successSubText: {
    color: "#166534",
    fontWeight: "600",
    fontSize: 11,
    marginTop: 2,
  },
  modelList: {
    gap: 8,
    marginBottom: 12,
  },
  modelCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },
  modelName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
  },
  modelRoute: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  modelBest: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  mockBox: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  mockTitle: {
    color: ORANGE,
    fontSize: 12,
    fontWeight: "900",
  },
  mockText: {
    color: "#92400E",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: BLUE,
    padding: 17,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
  },
  disabledButton: { backgroundColor: "#93C5FD" },
  submitText: { color: "#fff", fontSize: 15, fontWeight: "900" },
});