import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  QrCode,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import { Subject } from '../domain/entities/Subject';
import {
  createClassScheduleUseCase,
  deleteClassScheduleUseCase,
  listClassScheduleUseCase,
  createSubjectUseCase,
  deleteSubjectUseCase,
  listSubjectsUseCase,
  updateSubjectUseCase,
} from '../application/container';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import MultiDayScheduleFields, { DayScheduleDraft } from '../components/schedule/MultiDayScheduleFields';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F6F8FC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const RED = '#DC2626';

type SubjectForm = {
  name: string;
  teacher: string;
  description: string;
  color: string;
};

const EMPTY_FORM: SubjectForm = {
  name: '',
  teacher: '',
  description: '',
  color: BLUE,
};

export default function SubjectsScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(EMPTY_FORM);
  const [linkSchedule, setLinkSchedule] = useState(false);
  const [daySchedules, setDaySchedules] = useState<DayScheduleDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubjects = useCallback(async () => {
    try {
      setLoading(true);
      setSubjects(await listSubjectsUseCase.execute());
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSubjects();
    }, [loadSubjects]),
  );

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subjects;
    return subjects.filter((subject) =>
      [subject.name, subject.teacher || '', subject.description || ''].some(
        (value) => value.toLowerCase().includes(query),
      ),
    );
  }, [search, subjects]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLinkSchedule(false);
    setDaySchedules([]);
    setModalVisible(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setForm({
      name: subject.name,
      teacher: subject.teacher || '',
      description: subject.description || '',
      color: subject.color || BLUE,
    });
    setLinkSchedule(false);
    setDaySchedules([]);
    setModalVisible(true);
  }

  async function saveSubject() {
    if (!form.name.trim()) {
      Alert.alert('Falta información', 'Escriba el nombre de la materia.');
      return;
    }

    try {
      setLoading(true);
      const saved = editing
        ? await updateSubjectUseCase.execute({
            id: editing.id,
            name: form.name,
            teacher: form.teacher,
            description: form.description,
            color: form.color,
            icon: editing.icon || '📚',
          })
        : await createSubjectUseCase.execute({
            name: form.name,
            teacher: form.teacher,
            description: form.description,
            color: form.color,
            icon: '📚',
          });

      if (linkSchedule) {
        if (!daySchedules.length) {
          throw new Error('Seleccione al menos un día para vincular el horario');
        }
        for (const schedule of daySchedules) {
          await createClassScheduleUseCase.execute({
            subjectId: saved.id,
            dayOfWeek: schedule.dayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          });
        }
      }

      setModalVisible(false);
      await loadSubjects();
      Alert.alert(
        editing ? 'Materia actualizada' : 'Materia creada',
        linkSchedule
          ? 'La materia quedó vinculada al horario seleccionado.'
          : 'La materia quedó guardada correctamente.',
      );
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(subject: Subject) {
    Alert.alert(
      'Eliminar materia',
      `¿Desea eliminar “${subject.name}”? También se eliminarán sus apuntes asociados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const schedules = await listClassScheduleUseCase.execute();
              const linkedSchedules = schedules.filter(
                (entry) => entry.subjectId === subject.id,
              );
              await Promise.all(
                linkedSchedules.map((entry) =>
                  deleteClassScheduleUseCase.execute(entry.id),
                ),
              );
              await deleteSubjectUseCase.execute(subject.id);
              setExpandedId(null);
              await loadSubjects();
            } catch (error: any) {
              Alert.alert('Error', error.message || String(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topActions}>
        <Pressable style={styles.primaryAction} onPress={openCreate}>
          <Plus color="#fff" size={20} />
          <Text style={styles.primaryActionText}>Nueva materia</Text>
        </Pressable>
        <Pressable
          style={styles.secondaryAction}
          onPress={() => navigation.navigate('JoinSubject')}
        >
          <QrCode color={colors.purple} size={20} />
          <Text style={styles.secondaryActionText}>Unirme</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search color={colors.muted} size={19} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar materia"
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <BookOpen color={colors.primary} size={34} />
            <Text style={styles.emptyTitle}>Aún no hay materias</Text>
            <Text style={styles.emptyText}>
              Cree una materia aquí o agréguela al construir su horario.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const color = item.color || BLUE;
          return (
            <View style={styles.subjectCard}>
              <Pressable
                style={styles.subjectMain}
                onPress={() =>
                  navigation.navigate('Resumen', {
                    subjectId: item.id,
                    subjectName: item.name,
                  })
                }
              >
                <View style={[styles.subjectIcon, { backgroundColor: `${color}18` }]}>
                  <Text style={styles.subjectEmoji}>{item.icon || '📚'}</Text>
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  <Text style={styles.subjectTeacher} numberOfLines={1}>
                    {item.teacher || 'Docente no especificado'}
                  </Text>
                </View>
                <ChevronRight color={colors.muted} size={21} />
              </Pressable>

              <Pressable
                style={styles.moreButton}
                onPress={() => setExpandedId(expanded ? null : item.id)}
              >
                <Text style={styles.moreText}>Administrar</Text>
                <ChevronDown
                  color={colors.muted}
                  size={18}
                  style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                />
              </Pressable>

              {expanded && (
                <View style={styles.cardActions}>
                  <Pressable style={styles.smallAction} onPress={() => openEdit(item)}>
                    <Pencil color={colors.primary} size={18} />
                    <Text style={styles.smallActionText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    style={styles.smallAction}
                    onPress={() =>
                      navigation.navigate('Members', {
                        subjectId: item.id,
                        subjectName: item.name,
                      })
                    }
                  >
                    <Users color={colors.purple} size={18} />
                    <Text style={styles.smallActionText}>Integrantes</Text>
                  </Pressable>
                  <Pressable style={styles.smallAction} onPress={() => confirmDelete(item)}>
                    <Trash2 color={RED} size={18} />
                    <Text style={[styles.smallActionText, { color: RED }]}>Eliminar</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      <AppBottomBar activeTab="Subjects" />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editing ? 'Editar materia' : 'Crear materia'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  El horario es opcional y puede configurarse después.
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <X color={colors.text} size={23} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Arquitectura de software"
                value={form.name}
                onChangeText={(name) => setForm((current) => ({ ...current, name }))}
              />

              <Text style={styles.label}>Docente</Text>
              <TextInput
                style={styles.input}
                placeholder="Opcional"
                value={form.teacher}
                onChangeText={(teacher) =>
                  setForm((current) => ({ ...current, teacher }))
                }
              />

              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Opcional"
                multiline
                value={form.description}
                onChangeText={(description) =>
                  setForm((current) => ({ ...current, description }))
                }
              />

              <View style={styles.scheduleToggleRow}>
                <View style={styles.scheduleToggleText}>
                  <View style={styles.inlineTitle}>
                    <Clock3 color={colors.purple} size={18} />
                    <Text style={styles.toggleTitle}>Vincular con el horario</Text>
                  </View>
                  <Text style={styles.toggleSubtitle}>Opcional</Text>
                </View>
                <Switch
                  value={linkSchedule}
                  onValueChange={setLinkSchedule}
                  trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                  thumbColor={linkSchedule ? PURPLE : '#fff'}
                />
              </View>

              {linkSchedule && (
                <View style={styles.scheduleFields}>
                  <Text style={styles.label}>Días y horas de la materia</Text>
                  <MultiDayScheduleFields value={daySchedules} onChange={setDaySchedules} />
                </View>
              )}

              <Pressable style={styles.saveButton} onPress={saveSubject}>
                <Text style={styles.saveButtonText}>Guardar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={loading} text="Actualizando materias..." />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  topActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryAction: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  secondaryAction: {
    minWidth: 108,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryActionText: { color: colors.purple, fontWeight: '900', fontSize: 14 },
  searchBox: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 9,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  listContent: { paddingVertical: 14, paddingBottom: 40, gap: 10 },
  subjectCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  subjectMain: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectEmoji: { fontSize: 23 },
  subjectInfo: { flex: 1 },
  subjectName: { color: colors.text, fontWeight: '900', fontSize: 15 },
  subjectTeacher: { color: colors.muted, fontSize: 12, marginTop: 3 },
  moreButton: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 10,
    gap: 8,
  },
  smallAction: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.input,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  smallActionText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  emptyCard: {
    marginTop: 40,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 12 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  multilineInput: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  scheduleToggleRow: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleToggleText: { flex: 1 },
  inlineTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleTitle: { color: colors.text, fontWeight: '900', fontSize: 14 },
  toggleSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3, marginLeft: 26 },
  scheduleFields: { marginTop: 4 },
  pickerWrapper: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeField: { flex: 1 },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  });
}
