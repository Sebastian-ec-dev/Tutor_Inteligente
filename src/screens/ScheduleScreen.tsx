import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { Subject } from '../domain/entities/Subject';
import {
  ClassSchedule,
  getWeekDayLabel,
  normalizeTimeString,
} from '../domain/entities/ClassSchedule';
import {
  createClassScheduleUseCase,
  deleteClassScheduleUseCase,
  listClassScheduleUseCase,
  listSubjectsUseCase,
  updateClassScheduleUseCase,
} from '../application/container';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import MultiDayScheduleFields, {
  DayScheduleDraft,
} from '../components/schedule/MultiDayScheduleFields';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F6F8FC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const RED = '#DC2626';
const NEW_SUBJECT = '__new_subject__';

export default function ScheduleScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [entries, setEntries] = useState<ClassSchedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClassSchedule | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(NEW_SUBJECT);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [teacher, setTeacher] = useState('');
  const [daySchedules, setDaySchedules] = useState<DayScheduleDraft[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [scheduleData, subjectData] = await Promise.all([
        listClassScheduleUseCase.execute(),
        listSubjectsUseCase.execute(),
      ]);
      setEntries(scheduleData);
      setSubjects(subjectData);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const groupedEntries = useMemo(() => {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.flatMap((day) =>
      entries
        .filter((entry) => Number(entry.dayOfWeek) === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    );
  }, [entries]);

  function openCreate() {
    setEditing(null);
    setSelectedSubjectId(subjects[0]?.id || NEW_SUBJECT);
    setNewSubjectName('');
    setTeacher('');
    setDaySchedules([]);
    setModalVisible(true);
  }

  function openEdit(entry: ClassSchedule) {
    setEditing(entry);
    setSelectedSubjectId(entry.subjectId);
    setNewSubjectName('');
    setTeacher(entry.teacher || '');
    setDaySchedules([
      {
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
      },
    ]);
    setExpandedId(null);
    setModalVisible(true);
  }

  async function saveSchedule() {
    if (!daySchedules.length) {
      Alert.alert('Falta el horario', 'Seleccione al menos un día de la semana.');
      return;
    }
    if (selectedSubjectId === NEW_SUBJECT && !newSubjectName.trim()) {
      Alert.alert('Falta la materia', 'Escriba el nombre de la nueva materia.');
      return;
    }

    try {
      setLoading(true);

      if (editing) {
        const onlyDay = daySchedules[0];
        await updateClassScheduleUseCase.execute({
          id: editing.id,
          subjectId: selectedSubjectId,
          dayOfWeek: onlyDay.dayOfWeek,
          startTime: normalizeTimeString(onlyDay.startTime),
          endTime: normalizeTimeString(onlyDay.endTime),
        });
      } else {
        let createdSubjectId =
          selectedSubjectId === NEW_SUBJECT ? undefined : selectedSubjectId;

        for (const schedule of daySchedules) {
          const result = await createClassScheduleUseCase.execute({
            subjectId: createdSubjectId,
            subjectName: createdSubjectId ? undefined : newSubjectName,
            teacher,
            dayOfWeek: schedule.dayOfWeek,
            startTime: normalizeTimeString(schedule.startTime),
            endTime: normalizeTimeString(schedule.endTime),
          });
          createdSubjectId = result.subject.id;
        }
      }

      setModalVisible(false);
      await loadData();
      Alert.alert(
        editing ? 'Horario actualizado' : 'Horario guardado',
        editing
          ? 'La clase quedó actualizada.'
          : `${daySchedules.length} horario(s) quedaron vinculados a la materia.`,
      );
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(entry: ClassSchedule) {
    Alert.alert(
      'Eliminar horario',
      `¿Desea quitar ${entry.subjectName} del ${getWeekDayLabel(entry.dayOfWeek)}? La materia no se eliminará.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteClassScheduleUseCase.execute(entry.id);
              setExpandedId(null);
              await loadData();
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
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <CalendarDays color="#fff" size={24} />
          </View>
          <View style={styles.introTextBox}>
            <Text style={styles.introTitle}>Horario inteligente</Text>
            <Text style={styles.introText}>
              Una materia puede repetirse varios días y tener horas diferentes en cada día.
            </Text>
          </View>
        </View>

        <Pressable style={styles.addButton} onPress={openCreate}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Agregar materia y horarios</Text>
        </Pressable>

        <FlatList
          data={groupedEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Clock3 color={colors.purple} size={34} />
              <Text style={styles.emptyTitle}>Horario vacío</Text>
              <Text style={styles.emptyText}>
                Cree una materia y seleccione todos los días en que recibe esa clase.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const previous = groupedEntries[index - 1];
            const showDay = !previous || Number(previous.dayOfWeek) !== Number(item.dayOfWeek);
            const expanded = expandedId === item.id;
            const color = item.color || BLUE;

            return (
              <View>
                {showDay && (
                  <Text style={styles.dayHeading}>{getWeekDayLabel(item.dayOfWeek)}</Text>
                )}
                <View style={styles.scheduleCard}>
                  <Pressable
                    style={styles.scheduleMain}
                    onPress={() => setExpandedId(expanded ? null : item.id)}
                  >
                    <View style={[styles.colorBar, { backgroundColor: color }]} />
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.subjectName}>{item.subjectName}</Text>
                      <Text style={styles.scheduleTime}>
                        {item.startTime} – {item.endTime}
                      </Text>
                      {!!item.teacher && (
                        <Text style={styles.teacherText}>{item.teacher}</Text>
                      )}
                    </View>
                    <ChevronDown
                      color={colors.muted}
                      size={20}
                      style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                    />
                  </Pressable>

                  {expanded && (
                    <View style={styles.cardActions}>
                      <Pressable style={styles.editButton} onPress={() => openEdit(item)}>
                        <Pencil color={colors.primary} size={17} />
                        <Text style={styles.editText}>Editar</Text>
                      </Pressable>
                      <Pressable style={styles.deleteButton} onPress={() => confirmDelete(item)}>
                        <Trash2 color={RED} size={17} />
                        <Text style={styles.deleteText}>Eliminar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      </View>

      <AppBottomBar activeTab="Home" />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {editing ? 'Editar clase del horario' : 'Materia y horarios'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {editing
                    ? 'Cambie la materia, el día o la hora de esta clase.'
                    : 'Seleccione varios días y defina una hora diferente para cada uno.'}
                </Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <X color={colors.text} size={23} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Materia</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  {subjects.map((subject) => (
                    <Picker.Item key={subject.id} label={subject.name} value={subject.id} color={colors.text} />
                  ))}
                  {!editing && (
                    <Picker.Item label="Crear una nueva materia" value={NEW_SUBJECT} color={colors.text} />
                  )}
                </Picker>
              </View>

              {!editing && selectedSubjectId === NEW_SUBJECT && (
                <>
                  <Text style={styles.label}>Nombre de la nueva materia</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Base de datos"
                    value={newSubjectName}
                    onChangeText={setNewSubjectName}
                  />
                  <Text style={styles.label}>Docente</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Opcional"
                    value={teacher}
                    onChangeText={setTeacher}
                  />
                </>
              )}

              <Text style={styles.label}>{editing ? 'Día y hora' : 'Días y horas'}</Text>
              <MultiDayScheduleFields
                value={daySchedules}
                onChange={(next) => {
                  if (editing && next.length > 1) {
                    setDaySchedules([next[next.length - 1]]);
                  } else {
                    setDaySchedules(next);
                  }
                }}
              />

              <Pressable style={styles.saveButton} onPress={saveSchedule}>
                <Text style={styles.saveButtonText}>
                  {editing ? 'Guardar cambios' : 'Guardar horarios'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={loading} text="Actualizando horario..." />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  introCard: {
    borderRadius: 20,
    backgroundColor: colors.soft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introTextBox: { flex: 1 },
  introTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  introText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  addButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  listContent: { paddingTop: 14, paddingBottom: 40 },
  dayHeading: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 12, marginBottom: 7 },
  scheduleCard: {
    backgroundColor: colors.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scheduleMain: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  colorBar: { width: 6, height: 54, borderRadius: 99, marginRight: 12 },
  scheduleInfo: { flex: 1 },
  subjectName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  scheduleTime: { color: colors.primary, fontSize: 13, fontWeight: '800', marginTop: 4 },
  teacherText: { color: colors.muted, fontSize: 11, marginTop: 3 },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  editButton: {
    flex: 1,
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  editText: { color: colors.primary, fontWeight: '900', fontSize: 12 },
  deleteButton: {
    flex: 1,
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  deleteText: { color: colors.danger, fontWeight: '900', fontSize: 12 },
  emptyCard: {
    marginTop: 38,
    padding: 28,
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 12 },
  emptyText: { color: colors.muted, textAlign: 'center', lineHeight: 19, marginTop: 5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 13,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '900', marginTop: 10, marginBottom: 6 },
  pickerWrapper: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: 'hidden' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    color: colors.text,
    backgroundColor: colors.card,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  });
}
