import React, { useEffect, useState } from "react";
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
} from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import LoadingModal from "../components/ui/LoadingModal";
import { useThemeMode } from "../shared/theme/ThemeContext";
import { AudioNote } from "../domain/entities/AudioNote";
import {
  deleteAudioNoteUseCase,
  listAudioNotesUseCase,
  updateAudioNoteUseCase,
} from "../application/container";
import { supabase } from "../infrastructure/supabase/supabaseClient";

export default function ResumenScreen() {
  const route = useRoute<RouteProp<PropsList, "Resumen">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors, isDark } = useThemeMode();

  const { subjectId, subjectName } = route.params;
  const [resumenes, setResumenes] = useState<AudioNote[]>([]);
  const [resumenId, setResumenId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [myRole, setMyRole] = useState<string>("student");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<AudioNote | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"apuntes" | "deberes">("apuntes");

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      leerResumenes();
      cargarPermisos();
    });
    return unsubscribe;
  }, [navigation]);

  async function leerResumenes() {
    try {
      setLoading(true);
      const data = await listAudioNotesUseCase.execute(subjectId);
      setResumenes(data);
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

  const toggleExpandir = (id: string) => {
    setResumenId(resumenId === id ? null : id);
    if (resumenId === id) setTranscriptId(null);
  };

  const toggleTranscript = (id: string) => {
    setTranscriptId(transcriptId === id ? null : id);
  };

  // Estilos de Markdown generados dinámicamente según el tema activo
  const dynamicMarkdownStyles = {
    body: { fontSize: 15.5, lineHeight: 24, color: colors.text },
    heading1: { fontSize: 22, fontWeight: "bold", marginVertical: 8, color: colors.text },
    heading2: { fontSize: 20, fontWeight: "bold", marginVertical: 8, color: colors.text },
    strong: { fontWeight: "bold", color: colors.text },
    em: { fontStyle: "italic", color: colors.text },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    list_item: { marginVertical: 4, color: colors.text },
    paragraph: { marginVertical: 8 },
  };

  const renderResumen = ({ item }: { item: AudioNote }) => {
    const isExpanded = resumenId === item.id;
    const isTranscriptOpen = transcriptId === item.id;
    const cleanSummary = sanitizeDisplayText(item.summary || "");
    const cleanTranscript = sanitizeDisplayText(item.transcript || "");

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.cardHeader, { backgroundColor: colors.surface }]}
          onPress={() => toggleExpandir(item.id)}
        >
          <View style={styles.cardTitleRow}>
            <FileAudio color={colors.primary} size={24} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp color={colors.muted} />
          ) : (
            <ChevronDown color={colors.muted} />
          )}
        </TouchableOpacity>

        {isExpanded && activeTab === "apuntes" && (
          <View style={[styles.cardContent, { borderTopColor: colors.border }]}>
            <View style={styles.classActionsRow}>
              <TouchableOpacity
                style={[styles.classChatButton, { backgroundColor: colors.primary }]}
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
                <Text style={styles.classChatButtonText}>Preguntar</Text>
              </TouchableOpacity>

              {canManageClass(item) && (
                <>
                  <TouchableOpacity
                    style={[styles.classIconButton, { backgroundColor: isDark ? `${colors.primary}15` : "#EFF6FF", borderColor: isDark ? `${colors.primary}35` : "#BFDBFE" }]}
                    onPress={() => abrirEditarClase(item)}
                    activeOpacity={0.85}
                  >
                    <Pencil color={colors.primary} size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.classIconButton, { backgroundColor: isDark ? `${colors.primary}15` : "#EFF6FF", borderColor: isDark ? `${colors.primary}35` : "#BFDBFE" }]}
                    onPress={() =>
                      navigation.navigate("Audio", {
                        subjectId,
                        audioNoteId: item.id,
                        audioNoteTitle: item.title,
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Plus color={colors.primary} size={18} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.classIconButton, styles.classDangerButton]}
                    onPress={() => eliminarClase(item)}
                    activeOpacity={0.85}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </TouchableOpacity>
                </>
              )}
            </View>

            {cleanSummary ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Resumen estructurado</Text>
                <Markdown style={dynamicMarkdownStyles}>{cleanSummary}</Markdown>
              </View>
            ) : null}

            {cleanTranscript ? (
              <View style={styles.section}>
                <TouchableOpacity
                  style={[styles.transcriptToggle, { backgroundColor: isDark ? `${colors.primary}15` : "#EFF6FF", borderColor: isDark ? `${colors.primary}35` : "#BFDBFE" }]}
                  onPress={() => toggleTranscript(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.transcriptToggleText, { color: colors.text }]}>
                    Transcripción literal del audio
                  </Text>
                  <View style={styles.transcriptToggleRight}>
                    <Text style={[styles.transcriptToggleHint, { color: colors.primary }]}>
                      {isTranscriptOpen ? "Ocultar" : "Mostrar"}
                    </Text>
                    {isTranscriptOpen ? (
                      <ChevronUp color={colors.primary} size={18} />
                    ) : (
                      <ChevronDown color={colors.primary} size={18} />
                    )}
                  </View>
                </TouchableOpacity>

                {isTranscriptOpen ? (
                  <View style={[styles.transcriptBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Markdown style={dynamicMarkdownStyles}>
                      {cleanTranscript}
                    </Markdown>
                  </View>
                ) : (
                  <Text style={[styles.transcriptHelp, { color: colors.muted }]}>
                    La transcripción está oculta para que el resumen sea más
                    fácil de revisar.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        )}

        {isExpanded && activeTab === "deberes" && (
          <View style={[styles.cardContent, { borderTopColor: colors.border }]}>
            {item.deberes ? (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Deberes y entregas</Text>
                <Markdown style={dynamicMarkdownStyles}>
                  {sanitizeDisplayText(item.deberes)}
                </Markdown>
              </View>
            ) : (
              <Text style={{ color: colors.muted, marginTop: 10 }}>
                No se detectaron tareas o fechas de entrega.
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const currentTabResumenes = resumenes.filter((item) => {
    if (activeTab === "deberes") return !!item.deberes;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.actionsPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.secondaryAction, { backgroundColor: isDark ? `${colors.primary}15` : "#F5F3FF", borderColor: isDark ? `${colors.primary}35` : "#DDD6FE" }]}
          onPress={() =>
            navigation.navigate("Members", { subjectId, subjectName })
          }
        >
          <Users color={colors.primary} size={17} />
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Integrantes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryAction, { backgroundColor: isDark ? `${colors.primary}15` : "#F5F3FF", borderColor: isDark ? `${colors.primary}35` : "#DDD6FE" }]}
          onPress={() =>
            navigation.navigate("Chatbot", { subjectId, subjectName })
          }
        >
          <MessageSquare color={colors.primary} size={17} />
          <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Chat</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: colors.border },
            activeTab === "apuntes" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("apuntes")}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.muted },
              activeTab === "apuntes" && styles.activeTabText,
            ]}
          >
            Apuntes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            { backgroundColor: colors.border },
            activeTab === "deberes" && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab("deberes")}
        >
          <Text
            style={[
              styles.tabText,
              { color: colors.muted },
              activeTab === "deberes" && styles.activeTabText,
            ]}
          >
            Deberes
          </Text>
        </TouchableOpacity>
      </View>

      {currentTabResumenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {activeTab === "apuntes"
              ? "No hay apuntes en esta materia."
              : "No se han detectado deberes en esta materia."}
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
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate("Audio", { subjectId })}
      >
        <Plus color="#fff" size={30} />
      </TouchableOpacity>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar nombre de la clase</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Ej. Test 1 - Dispositivos móviles"
              placeholderTextColor={colors.muted}
            />
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: colors.primary }]}
                onPress={guardarNombreClase}
              >
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={loading} text="Procesando..." />
    </View>
  );
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  actionsPanel: {
    borderBottomWidth: 1,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  secondaryAction: {
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  tabText: {
    fontWeight: "700",
    fontSize: 14,
  },
  activeTabText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  list: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16 },
  card: {
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
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  cardTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: "500",
    flexShrink: 1,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
  },
  section: { marginTop: 15 },
  transcriptToggle: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transcriptToggleText: {
    fontWeight: "900",
    fontSize: 14,
    flex: 1,
  },
  transcriptToggleRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  transcriptToggleHint: { fontWeight: "900", fontSize: 12 },
  transcriptBox: {
    marginTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  transcriptHelp: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  classDangerButton: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontWeight: "900",
    fontSize: 20,
    marginBottom: 12,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  modalActionsRow: { flexDirection: "row", gap: 10 },
  modalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontWeight: "900" },
  modalSaveText: { color: "#fff", fontWeight: "900" },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
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