import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PropsList } from "../navigation/AppNavigator";
import {
  BookOpen,
  Plus,
  LogOut,
  MessageSquare,
  Search,
  X,
  Mic,
  ChevronRight,
  Brain,
  UserRound,
  Pencil,
  Trash2,
  Users,
  QrCode,
} from "lucide-react-native";
import LoadingModal from "../components/ui/LoadingModal";
import { Subject } from "../domain/entities/Subject";
import {
  createSubjectUseCase,
  deleteSubjectUseCase,
  getProfileUseCase,
  listSubjectsUseCase,
  logoutUseCase,
  updateSubjectUseCase,
} from "../application/container";

const BLUE = "#2563EB";
const PURPLE = "#7C3AED";
const BG = "#F8FAFC";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";
const GREEN = "#22C55E";
const RED = "#EF4444";
const ORANGE = "#F59E0B";
const CYAN = "#06B6D4";

const SUBJECT_COLORS = [BLUE, PURPLE, GREEN, RED, ORANGE, CYAN];

type SubjectForm = {
  name: string;
  teacher: string;
  description: string;
  color: string;
};

const initialSubjectForm: SubjectForm = {
  name: "",
  teacher: "",
  description: "",
  color: BLUE,
};

export default function HomeScreen() {
  const [materias, setMaterias] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<SubjectForm>(initialSubjectForm);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      leerMaterias();
      cargarPerfil();
    });
    return unsubscribe;
  }, [navigation]);

  const filteredMaterias = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return materias;

    return materias.filter((materia) => {
      const values = [
        materia.name,
        materia.teacher || "",
        materia.description || "",
      ];
      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [materias, search]);

  async function cargarPerfil() {
    try {
      const profile = await getProfileUseCase.execute();
      const name = profile.displayName || profile.email?.split("@")[0] || "";
      setDisplayName(name);
    } catch (error) {
      console.log("[HomeScreen] No se pudo cargar el perfil:", error);
    }
  }

  async function leerMaterias() {
    try {
      setLoading(true);
      const data = await listSubjectsUseCase.execute();
      setMaterias(data);
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  function abrirFormulario() {
    setEditingSubject(null);
    setForm(initialSubjectForm);
    setModalVisible(true);
  }

  function abrirEditarMateria(subject: Subject) {
    setEditingSubject(subject);
    setForm({
      name: subject.name || "",
      teacher: subject.teacher || "",
      description: subject.description || "",
      color: subject.color || BLUE,
    });
    setModalVisible(true);
  }

  async function guardarMateria() {
    try {
      if (!form.name.trim()) {
        Alert.alert("Validación", "Ingrese el nombre de la materia");
        return;
      }

      setLoading(true);
      if (editingSubject) {
        await updateSubjectUseCase.execute({
          id: editingSubject.id,
          name: form.name,
          teacher: form.teacher,
          description: form.description,
          color: form.color,
          icon: editingSubject.icon || "📚",
        });
      } else {
        await createSubjectUseCase.execute({
          name: form.name,
          teacher: form.teacher,
          description: form.description,
          color: form.color,
          icon: "📚",
        });
      }

      setModalVisible(false);
      setForm(initialSubjectForm);
      setEditingSubject(null);
      await leerMaterias();
      Alert.alert(
        editingSubject ? "Materia actualizada" : "Materia creada",
        "Los datos se guardaron exitosamente.",
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function eliminarMateria(subject: Subject) {
    Alert.alert(
      "Eliminar materia",
      `¿Seguro que quieres eliminar "${subject.name}"? También se eliminarán sus apuntes relacionados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteSubjectUseCase.execute(subject.id);
              await leerMaterias();
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

  async function cerrarSesion() {
    try {
      setLoading(true);
      await logoutUseCase.execute();
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
      setLoading(false);
    }
  }

  const renderMateria = ({ item }: { item: Subject }) => {
    const cardColor = item.color || BLUE;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("Resumen", {
            subjectId: item.id,
            subjectName: item.name,
          })
        }
        activeOpacity={0.84}
      >
        <View
          style={[styles.subjectIconBox, { backgroundColor: `${cardColor}22` }]}
        >
          <Text style={styles.subjectIcon}>{item.icon || "📚"}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSubtitle}>
            {item.teacher || "Docente no definido"}
          </Text>
          {!!item.description && (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.miniActionButton}
              onPress={(event) => {
                event.stopPropagation();
                abrirEditarMateria(item);
              }}
            >
              <Pencil size={13} color={BLUE} />
              <Text style={styles.miniActionText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.miniDangerButton}
              onPress={(event) => {
                event.stopPropagation();
                eliminarMateria(item);
              }}
            >
              <Trash2 size={13} color={RED} />
              <Text style={styles.miniDangerText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ChevronRight size={20} color={MUTED} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerPanel}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>
              Hola{displayName ? `, ${displayName}` : ""} 👋
            </Text>
            <Text style={styles.headerSubtitle}>
              ¿Qué clase quieres estudiar hoy?
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={cerrarSesion}
            >
              <LogOut color={RED} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={17} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar materia, docente o descripción..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={MUTED}
          />
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={abrirFormulario}
        >
          <Plus color="#fff" size={18} />
          <Text style={styles.primaryActionText}>Crear materia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          onPress={() => navigation.navigate("JoinSubject")}
        >
          <QrCode color={PURPLE} size={18} />
          <Text style={styles.secondaryActionText}>Unirme</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis materias</Text>
        <Text style={styles.sectionCounter}>
          {filteredMaterias.length} visibles
        </Text>
      </View>

      {filteredMaterias.length === 0 ? (
        <View style={styles.emptyBox}>
          <BookOpen color={MUTED} size={42} />
          <Text style={styles.emptyTitle}>No hay materias todavía</Text>
          <Text style={styles.emptyText}>
            Crea una materia para guardar audios, resúmenes y chats por usuario.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={abrirFormulario}
          >
            <Plus color="#fff" size={18} />
            <Text style={styles.emptyButtonText}>Crear primera materia</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredMaterias}
          keyExtractor={(item) => item.id}
          renderItem={renderMateria}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <X size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editingSubject ? "Editar materia" : "Crear materia"}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FieldLabel text="Nombre de la materia" />
              <TextInput
                style={styles.input}
                placeholder="Ej. Bases de Datos"
                value={form.name}
                onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
                editable={!loading}
              />

              <FieldLabel text="Docente" />
              <TextInput
                style={styles.input}
                placeholder="Ej. Valeria Cevallos"
                value={form.teacher}
                onChangeText={(teacher) =>
                  setForm((prev) => ({ ...prev, teacher }))
                }
                editable={!loading}
              />

              <FieldLabel text="Color de materia" />
              <View style={styles.colorsRow}>
                {SUBJECT_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color },
                      form.color === color && styles.colorButtonActive,
                    ]}
                    onPress={() => setForm((prev) => ({ ...prev, color }))}
                    disabled={loading}
                  />
                ))}
              </View>

              <FieldLabel text="Descripción" />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripción breve de la materia..."
                value={form.description}
                onChangeText={(description) =>
                  setForm((prev) => ({ ...prev, description }))
                }
                multiline
                textAlignVertical="top"
                editable={!loading}
              />

              <View
                style={[
                  styles.previewBox,
                  {
                    borderColor: `${form.color}55`,
                    backgroundColor: `${form.color}12`,
                  },
                ]}
              >
                <Text style={styles.previewLabel}>Vista previa</Text>
                <View style={styles.previewRow}>
                  <View
                    style={[
                      styles.previewIcon,
                      { backgroundColor: form.color },
                    ]}
                  >
                    <Text style={styles.previewEmoji}>📚</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewTitle}>
                      {form.name || "Nombre de materia"}
                    </Text>
                    <Text style={styles.previewSubtitle}>
                      {form.teacher || "Docente"}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!form.name.trim() || loading) && styles.disabledButton,
                ]}
                onPress={guardarMateria}
                disabled={!form.name.trim() || loading}
              >
                <Text style={styles.createButtonText}>
                  {editingSubject ? "Guardar cambios" : "Crear materia"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomItemActive}>
          <BookOpen color={BLUE} size={20} />
          <Text style={styles.bottomActiveText}>Materias</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.bottomItem}
          onPress={() => {
            if (materias[0]?.id)
              navigation.navigate("Audio", { subjectId: materias[0].id });
            else
              Alert.alert(
                "Primero crea una materia",
                "Necesitas una materia para subir o procesar un audio.",
              );
          }}
        >
          <Mic color={MUTED} size={20} />
          <Text style={styles.bottomText}>Grabar</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.bottomItem}
          onPress={() => navigation.navigate("Chatbot")}
        >
          <Brain color={MUTED} size={20} />
          <Text style={styles.bottomText}>Tutor IA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bottomItem}
          onPress={() => navigation.navigate("Profile")}
        >
          <UserRound color={MUTED} size={20} />
          <Text style={styles.bottomText}>Perfil</Text>
        </TouchableOpacity>
      </View>

      <LoadingModal visible={loading} text="Procesando..." />
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  headerPanel: { padding: 20, paddingBottom: 10, backgroundColor: BG },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  greeting: { fontSize: 23, fontWeight: "900", color: TEXT },
  headerSubtitle: { fontSize: 13, color: MUTED, marginTop: 2 },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
  profileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    height: 46,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  searchInput: { flex: 1, marginLeft: 8, color: TEXT, fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47.9%",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  statValue: { fontSize: 24, fontWeight: "900" },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: "700", marginTop: 1 },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  primaryAction: {
    flex: 1,
    height: 50,
    backgroundColor: BLUE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  secondaryAction: {
    flex: 1,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryActionText: { color: PURPLE, fontWeight: "900", fontSize: 14 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 17, color: TEXT, fontWeight: "900" },
  sectionCounter: { fontSize: 12, color: MUTED, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 92 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  subjectIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIcon: { fontSize: 23 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, color: TEXT, fontWeight: "900" },
  cardSubtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
  cardDescription: {
    color: "#475569",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  badgesRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  cardActionsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  miniActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  miniActionText: { color: BLUE, fontSize: 10, fontWeight: "900" },
  miniDangerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  miniDangerText: { color: RED, fontSize: 10, fontWeight: "900" },
  badgeMuted: {
    fontSize: 10,
    color: PURPLE,
    backgroundColor: "#F3E8FF",
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeBlue: {
    fontSize: 10,
    color: BLUE,
    backgroundColor: "#DBEAFE",
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  emptyBox: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: { fontSize: 18, color: TEXT, fontWeight: "900", marginTop: 14 },
  emptyText: {
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 18,
  },
  emptyButton: {
    height: 48,
    backgroundColor: BLUE,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emptyButtonText: { color: "#fff", fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: BG,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 22, fontWeight: "900", color: TEXT },
  modalSubtitle: { color: MUTED, fontSize: 12, marginTop: 4 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },
  label: {
    fontSize: 12,
    color: MUTED,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 4,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    fontSize: 14,
    color: TEXT,
    marginBottom: 14,
  },
  textArea: { height: 96, paddingTop: 12, paddingBottom: 12 },
  colorsRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
  colorButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorButtonActive: { borderColor: TEXT },
  previewBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT,
    marginBottom: 10,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  previewIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmoji: { fontSize: 20 },
  previewTitle: { fontSize: 15, color: TEXT, fontWeight: "900" },
  previewSubtitle: { color: MUTED, fontSize: 12, marginTop: 2 },
  createButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  createButtonText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  disabledButton: { opacity: 0.55 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 8,
  },
  bottomItem: { alignItems: "center", width: 82 },
  bottomItemActive: { alignItems: "center", width: 82 },
  bottomText: { color: MUTED, fontSize: 11, fontWeight: "800", marginTop: 2 },
  bottomActiveText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  recordButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -24,
  },
});
