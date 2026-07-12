import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import {
  FileAudio,
  Plus,
  ChevronDown,
  ChevronUp,
  Mic,
  Users,
  MessageSquare,
  Pencil,
  Trash2,
  MoreVertical,
  X,
  CheckCircle2,
  CalendarDays,
} from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import LoadingModal from "../components/ui/LoadingModal";
import AppBottomBar from "../components/ui/AppBottomBar";
import { useAppTheme } from "../components/ui/ThemeContext";
import { AudioNote } from "../domain/entities/AudioNote";
import { ClassTask } from "../domain/entities/ClassTask";
import {
  deleteAudioNoteUseCase,
  deleteClassTaskUseCase,
  listAudioNotesUseCase,
  listClassTasksUseCase,
  updateAudioNoteUseCase,
  updateClassTaskUseCase,
} from "../application/container";
import { supabase } from "../infrastructure/supabase/supabaseClient";
import { formatEditableDueDate, parseEditableDueDate } from "../application/taskDetection";

export default function ResumenScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const markdownStyles = useMemo(() => createMarkdownStyles(colors), [colors]);
  const route = useRoute<RouteProp<PropsList, "Resumen">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId, subjectName, focusAudioNoteId, focusTaskId, initialTab } = route.params;
  const [resumenes, setResumenes] = useState<AudioNote[]>([]);
  const [classTasks, setClassTasks] = useState<ClassTask[]>([]);
  const [resumenId, setResumenId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [myRole, setMyRole] = useState<string>("student");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<AudioNote | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"apuntes" | "deberes">(initialTab || "apuntes");
  const [actionClass, setActionClass] = useState<AudioNote | null>(null);
  const [editingTask, setEditingTask] = useState<ClassTask | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDetails, setEditingTaskDetails] = useState("");
  const [editingTaskDate, setEditingTaskDate] = useState("");

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (initialTab) setActiveTab(initialTab);
      leerResumenes();
      cargarPermisos();
    });
    return unsubscribe;
  }, [initialTab, navigation]);

  async function leerResumenes() {
    try {
      setLoading(true);
      const [data, allTasks] = await Promise.all([
        listAudioNotesUseCase.execute(subjectId),
        listClassTasksUseCase.execute(),
      ]);
      setResumenes(data);
      setClassTasks(allTasks.filter((task) => task.subjectId === subjectId));
      if (focusAudioNoteId && data.some((item) => item.id === focusAudioNoteId)) {
        setResumenId(focusAudioNoteId);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function cargarPermisos() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || "";
      setCurrentUserId(uid);
      if (!uid) return;

      const { data } = await supabase
        .from("subject_members")
        .select("role")
        .eq("subject_id", subjectId)
        .eq("user_id", uid)
        .maybeSingle();

      setMyRole((data?.role as string) || "student");
    } catch (error) {
      console.log("[ResumenScreen] No se pudo cargar permisos:", error);
    }
  }

  function canManageClass(item: AudioNote): boolean {
    return (
      item.userId === currentUserId ||
      ["owner", "admin", "teacher"].includes(myRole)
    );
  }

  function abrirEditarClase(item: AudioNote) {
    setEditingClass(item);
    setEditingTitle(item.title);
    setEditModalVisible(true);
  }

  async function guardarNombreClase() {
    try {
      if (!editingClass) return;
      setLoading(true);
      await updateAudioNoteUseCase.execute({
        id: editingClass.id,
        title: editingTitle,
      });
      setEditModalVisible(false);
      setEditingClass(null);
      setEditingTitle("");
      await leerResumenes();
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function eliminarClase(item: AudioNote) {
    Alert.alert(
      "Eliminar clase",
      `¿Seguro que deseas eliminar "${item.title}"? También se eliminará su resumen y transcripción.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAudioNoteUseCase.execute(item.id);
              await deleteClassTaskUseCase.deleteByAudio(item.id).catch(() => undefined);
              await leerResumenes();
            } catch (error: any) {
              Alert.alert("Error", error.message || String(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  function openTaskEditor(task: ClassTask) {
    setEditingTask(task);
    setEditingTaskTitle(task.text);
    setEditingTaskDetails(task.details || "");
    setEditingTaskDate(formatEditableDueDate(task.dueAt));
  }

  async function saveTaskEdit() {
    if (!editingTask) return;
    try {
      setLoading(true);
      await updateClassTaskUseCase.execute(editingTask.id, {
        text: editingTaskTitle,
        details: editingTaskDetails.trim() || null,
        dueAt: parseEditableDueDate(editingTaskDate),
      });
      setEditingTask(null);
      await leerResumenes();
    } catch (error: any) {
      Alert.alert("No se pudo editar", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function toggleTaskCompleted(task: ClassTask) {
    try {
      setLoading(true);
      await updateClassTaskUseCase.execute(task.id, { completed: !task.completed });
      await leerResumenes();
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteTask(task: ClassTask) {
    Alert.alert("Eliminar tarea", `¿Desea eliminar “${task.text}”?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await deleteClassTaskUseCase.execute(task.id);
            await leerResumenes();
          } catch (error: any) {
            Alert.alert("Error", error.message || String(error));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  const toggleExpandir = (id: string) => {
    setResumenId(resumenId === id ? null : id);
    if (resumenId === id) setTranscriptId(null);
  };

  const toggleTranscript = (id: string) => {
    setTranscriptId(transcriptId === id ? null : id);
  };

  const renderResumen = ({ item }: { item: AudioNote }) => {
    const isExpanded = resumenId === item.id;
    const isTranscriptOpen = transcriptId === item.id;
    const cleanSummary = sanitizeDisplayText(item.summary || "");
    const cleanTranscript = sanitizeDisplayText(item.transcript || "");
    const relatedTasks = classTasks.filter((task) => task.audioNoteId === item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.cardHeaderMain}
            onPress={() => toggleExpandir(item.id)}
            activeOpacity={0.82}
          >
            <View style={styles.cardTitleRow}>
              <FileAudio color="#007AFF" size={24} />
              <Text style={styles.cardTitle}>{item.title}</Text>
            </View>
            {isExpanded ? (
              <ChevronUp color={colors.muted} />
            ) : (
              <ChevronDown color={colors.muted} />
            )}
          </TouchableOpacity>

          {canManageClass(item) ? (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setActionClass(item)}
              activeOpacity={0.75}
              accessibilityLabel={`Opciones de ${item.title}`}
            >
              <MoreVertical color={colors.text} size={22} />
            </TouchableOpacity>
          ) : null}
        </View>

        {isExpanded && activeTab === "apuntes" && (
          <View style={styles.cardContent}>
            <View style={styles.classActionsRow}>
              <TouchableOpacity
                style={styles.classChatButton}
                onPress={() =>
                  navigation.navigate("Chatbot", {
                    subjectId,
                    subjectName,
                    classId: item.id,
                    className: item.title,
                  })
                }
                activeOpacity={0.85}
              >
                <MessageSquare color="#fff" size={16} />
                <Text style={styles.classChatButtonText}>Preguntar sobre esta clase</Text>
              </TouchableOpacity>
            </View>

            {cleanSummary ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Resumen estructurado</Text>
                <Markdown style={markdownStyles}>{cleanSummary}</Markdown>
              </View>
            ) : null}

            {cleanTranscript ? (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.transcriptToggle}
                  onPress={() => toggleTranscript(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.transcriptToggleText}>
                    Transcripción original del audio
                  </Text>
                  <View style={styles.transcriptToggleRight}>
                    <Text style={styles.transcriptToggleHint}>
                      {isTranscriptOpen ? "Ocultar" : "Mostrar"}
                    </Text>
                    {isTranscriptOpen ? (
                      <ChevronUp color="#2563EB" size={18} />
                    ) : (
                      <ChevronDown color="#2563EB" size={18} />
                    )}
                  </View>
                </TouchableOpacity>

                {isTranscriptOpen ? (
                  <View style={styles.transcriptBox}>
                    <Markdown style={markdownStyles}>
                      {cleanTranscript}
                    </Markdown>
                  </View>
                ) : (
                  <Text style={styles.transcriptHelp}>
                    La transcripción original está minimizada. Toca “Mostrar” para revisarla completa.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        {isExpanded && activeTab === "deberes" && (
          <View style={styles.cardContent}>
            {relatedTasks.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tareas de esta clase</Text>
                {relatedTasks.map((task) => (
                  <View
                    key={task.id}
                    style={[
                      styles.detailedTaskCard,
                      task.id === focusTaskId && styles.focusedTaskCard,
                      task.completed && styles.completedTaskCard,
                    ]}
                  >
                    <View style={styles.detailedTaskHeader}>
                      <CheckCircle2
                        color={task.completed ? colors.success : colors.primary}
                        size={21}
                      />
                      <Text
                        style={[styles.detailedTaskTitle, task.completed && styles.completedTaskText]}
                      >
                        {task.text}
                      </Text>
                    </View>
                    {!!task.details && (
                      <Text style={styles.detailedTaskDetails}>{task.details}</Text>
                    )}
                    <View style={styles.detailedTaskMeta}>
                      <CalendarDays color={colors.muted} size={15} />
                      <Text style={styles.detailedTaskDate}>{formatTaskDate(task.dueAt)}</Text>
                      {task.confidence != null && (
                        <Text style={styles.detailedTaskConfidence}>
                          IA {Math.round(task.confidence * 100)}%
                        </Text>
                      )}
                    </View>
                    <View style={styles.detailedTaskActions}>
                      <TouchableOpacity
                        style={styles.taskActionButton}
                        onPress={() => toggleTaskCompleted(task)}
                      >
                        <CheckCircle2 color={colors.success} size={16} />
                        <Text style={styles.taskActionText}>
                          {task.completed ? "Pendiente" : "Completada"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.taskActionButton} onPress={() => openTaskEditor(task)}>
                        <Pencil color={colors.primary} size={16} />
                        <Text style={styles.taskActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.taskActionButton} onPress={() => confirmDeleteTask(task)}>
                        <Trash2 color="#EF4444" size={16} />
                        <Text style={[styles.taskActionText, { color: "#EF4444" }]}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : hasStoredTasks(item.deberes) ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tareas registradas</Text>
                <Markdown style={markdownStyles}>{sanitizeDisplayText(item.deberes || "")}</Markdown>
              </View>
            ) : (
              <Text style={{ color: colors.muted, marginTop: 10 }}>
                La IA no identificó una asignación explícita en esta clase.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const currentTabResumenes = resumenes.filter((item) => {
    if (activeTab === "deberes") {
      return classTasks.some((task) => task.audioNoteId === item.id) || hasStoredTasks(item.deberes);
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.actionsPanel}>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() =>
            navigation.navigate("Members", { subjectId, subjectName })
          }
        >
          <Users color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Integrantes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() =>
            navigation.navigate("Chatbot", { subjectId, subjectName })
          }
        >
          <MessageSquare color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "apuntes" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("apuntes")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "apuntes" && styles.activeTabText,
            ]}
          >
            Apuntes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "deberes" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("deberes")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "deberes" && styles.activeTabText,
            ]}
          >
            Tareas
          </Text>
        </TouchableOpacity>
      </View>

      {currentTabResumenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {activeTab === "apuntes"
              ? "No hay apuntes en esta materia."
              : "No se han identificado tareas en esta materia."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentTabResumenes}
          keyExtractor={(item) => item.id}
          renderItem={renderResumen}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("Audio", { subjectId })}
      >
        <Plus color="#fff" size={30} />
      </TouchableOpacity>
      <Modal
        visible={Boolean(actionClass)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionClass(null)}
      >
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModalCard}>
            <View style={styles.actionModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionModalEyebrow}>OPCIONES DE LA CLASE</Text>
                <Text style={styles.actionModalTitle} numberOfLines={2}>
                  {actionClass?.title || "Clase"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionCloseButton}
                onPress={() => setActionClass(null)}
              >
                <X color={colors.text} size={20} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const selected = actionClass;
                setActionClass(null);
                if (selected) abrirEditarClase(selected);
              }}
            >
              <View style={styles.actionIconBox}>
                <Pencil color="#2563EB" size={19} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowTitle}>Editar título</Text>
                <Text style={styles.actionRowHint}>Cambia el nombre de la clase o audio.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                const selected = actionClass;
                setActionClass(null);
                if (selected) {
                  navigation.navigate("Audio", {
                    subjectId,
                    audioNoteId: selected.id,
                    audioNoteTitle: selected.title,
                  });
                }
              }}
            >
              <View style={styles.actionIconBox}>
                <Plus color="#7C3AED" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowTitle}>Agregar otro audio</Text>
                <Text style={styles.actionRowHint}>Añade una grabación relacionada con esta clase.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, styles.actionDangerRow]}
              onPress={() => {
                const selected = actionClass;
                setActionClass(null);
                if (selected) eliminarClase(selected);
              }}
            >
              <View style={[styles.actionIconBox, styles.actionDangerIconBox]}>
                <Trash2 color="#EF4444" size={19} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionRowTitle, { color: "#EF4444" }]}>Eliminar clase</Text>
                <Text style={styles.actionRowHint}>Borra el audio, la transcripción y el resumen.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar nombre de la clase</Text>
            <TextInput
              style={styles.modalInput}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Ej. Test 1 - Dispositivos móviles"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={guardarNombreClase}
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(editingTask)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar tarea</Text>
            <Text style={styles.taskEditLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              value={editingTaskTitle}
              onChangeText={setEditingTaskTitle}
              placeholder="Título breve"
              placeholderTextColor={colors.muted}
            />
            <Text style={styles.taskEditLabel}>Detalle</Text>
            <TextInput
              style={[styles.modalInput, styles.taskDetailsInput]}
              value={editingTaskDetails}
              onChangeText={setEditingTaskDetails}
              placeholder="Instrucción completa"
              placeholderTextColor={colors.muted}
              multiline
            />
            <Text style={styles.taskEditLabel}>Fecha de entrega</Text>
            <TextInput
              style={styles.modalInput}
              value={editingTaskDate}
              onChangeText={setEditingTaskDate}
              placeholder="DD/MM/AAAA (opcional)"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setEditingTask(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={saveTaskEdit}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={loading} text="Procesando..." />
      <AppBottomBar activeTab="Subjects" />
    </View>
  );
}

function hasStoredTasks(value?: string | null): boolean {
  const text = (value || "").trim();
  return Boolean(text) && !/no se (identificaron|detectaron) tareas/i.test(text);
}

function formatTaskDate(value?: string | null): string {
  if (!value) return "Sin fecha de entrega";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha de entrega";
  return new Intl.DateTimeFormat("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sanitizeDisplayText(text: string): string {
  return (text || "")
    .replace(/\[DATO SENSIBLE ELIMINADO\]/gi, "")
    .replace(/informaci[oó]n sensible (bloqueada|eliminada|omitida)/gi, "")
    .replace(/dato sensible (bloqueado|eliminado|omitido)/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  actionsPanel: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  primaryAction: {
    flexGrow: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  primaryActionText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  secondaryAction: {
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  secondaryActionText: { color: colors.purple, fontWeight: "900", fontSize: 12 },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: colors.background,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontWeight: "700",
    fontSize: 14,
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  list: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: colors.muted, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
  },
  cardHeaderMain: {
    flex: 1,
    minHeight: 68,
    paddingLeft: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moreButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: "500",
    color: colors.text,
    flexShrink: 1,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  section: { marginTop: 15 },
  detailedTaskCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.input,
    padding: 13,
    marginTop: 10,
  },
  focusedTaskCard: { borderColor: colors.primary, borderWidth: 2 },
  completedTaskCard: { opacity: 0.68 },
  detailedTaskHeader: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  detailedTaskTitle: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "900", lineHeight: 20 },
  completedTaskText: { textDecorationLine: "line-through" },
  detailedTaskDetails: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  detailedTaskMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  detailedTaskDate: { color: colors.muted, fontSize: 10.5, fontWeight: "700", flex: 1 },
  detailedTaskConfidence: { color: colors.purple, fontSize: 9.5, fontWeight: "900" },
  detailedTaskActions: { flexDirection: "row", gap: 7, marginTop: 11, flexWrap: "wrap" },
  taskActionButton: { minHeight: 36, borderRadius: 11, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10 },
  taskActionText: { color: colors.text, fontSize: 10.5, fontWeight: "900" },
  taskEditLabel: { color: colors.text, fontSize: 11.5, fontWeight: "900", marginBottom: 6 },
  taskDetailsInput: { minHeight: 86, height: 86, paddingTop: 12, textAlignVertical: "top" },
  transcriptToggle: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transcriptToggleText: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 14,
    flex: 1,
  },
  transcriptToggleRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  transcriptToggleHint: { color: "#2563EB", fontWeight: "900", fontSize: 12 },
  transcriptBox: {
    marginTop: 10,
    backgroundColor: colors.input,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  transcriptHelp: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.primary,
    marginBottom: 5,
  },
  classActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 4,
  },
  classChatButton: {
    flex: 1,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  classChatButtonText: { color: "#fff", fontWeight: "900", fontSize: 12 },
  classIconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  classDangerButton: { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: isDark ? '#7F1D1D' : '#FECACA' },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    justifyContent: "center",
    padding: 22,
  },
  actionModalCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  actionModalEyebrow: {
    color: colors.primary,
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  actionModalTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 19,
    marginTop: 3,
  },
  actionCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.input,
  },
  actionRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionDangerRow: { marginTop: 2 },
  actionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  actionDangerIconBox: {
    backgroundColor: isDark ? "#450A0A" : "#FEF2F2",
  },
  actionRowTitle: { color: colors.text, fontWeight: "900", fontSize: 15 },
  actionRowHint: { color: colors.muted, fontWeight: "600", fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontWeight: "900",
    fontSize: 20,
    marginBottom: 12,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: colors.text,
    backgroundColor: colors.input,
    marginBottom: 14,
  },
  modalActionsRow: { flexDirection: "row", gap: 10 },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.input,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { color: colors.muted, fontWeight: "900" },
  modalSaveText: { color: "#fff", fontWeight: "900" },
  fab: {
    position: "absolute",
    bottom: 92,
    right: 20,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  });
}

function createMarkdownStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  body: {
    fontSize: 15.5,
    lineHeight: 24,
    color: colors.text,
  },
  heading1: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 8,
    color: colors.text,
  },
  heading2: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 8,
    color: colors.text,
  },
  strong: { fontWeight: "bold", color: colors.text },
  em: { fontStyle: "italic" },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 4 },
  paragraph: { marginVertical: 8 },
  });
}
