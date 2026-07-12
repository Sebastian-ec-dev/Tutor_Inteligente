import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ListTodo,
  MoreVertical,
  Pencil,
  Trash2,
  X,
} from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import {
  deleteClassTaskUseCase,
  getProfileUseCase,
  listClassScheduleUseCase,
  listClassTasksUseCase,
  updateClassTaskUseCase,
} from '../application/container';
import {
  ClassSchedule,
  findNextSchedule,
  getWeekDayLabel,
  isScheduleActive,
} from '../domain/entities/ClassSchedule';
import { ClassTask } from '../domain/entities/ClassTask';
import { formatEditableDueDate, parseEditableDueDate } from '../application/taskDetection';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import OnboardingTutorial, { hasSeenOnboardingTutorial } from '../components/tutorial/OnboardingTutorial';
import { migrateLocalDataToSupabaseOnce } from '../infrastructure/supabase/SupabaseLocalDataMigration';

export default function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const route = useRoute<RouteProp<PropsList, 'Home'>>();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [displayName, setDisplayName] = useState('');
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [tasks, setTasks] = useState<ClassTask[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [scheduleTargetY, setScheduleTargetY] = useState(330);
  const [taskAction, setTaskAction] = useState<ClassTask | null>(null);
  const [editTask, setEditTask] = useState<ClassTask | null>(null);
  const [editText, setEditText] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const requested = route.params?.showTutorial === true;

    if (requested) {
      // Mostrarlo de inmediato y conservar el parámetro hasta que la guía
      // se cierre. Así no se cancela el tutorial durante la navegación.
      setTutorialVisible(true);
    } else {
      hasSeenOnboardingTutorial()
        .then((seen) => {
          if (active && !seen) {
            timeout = setTimeout(() => {
              if (active) setTutorialVisible(true);
            }, 550);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, [navigation, route.params?.showTutorial]);

  const loadHome = useCallback(async () => {
    await migrateLocalDataToSupabaseOnce().catch((error) => {
      console.log('[HomeScreen] Migración local pendiente:', error?.message || error);
    });
    const currentDate = new Date();
    setNow(currentDate);
    const [profile, scheduleEntries, pendingTasks] = await Promise.all([
      getProfileUseCase.execute(),
      listClassScheduleUseCase.execute(),
      loadPendingTasks(),
    ]);
    setDisplayName(profile.displayName || profile.email?.split('@')[0] || '');
    setSchedules(scheduleEntries);
    setTasks(pendingTasks);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadHome().catch((error) => {
        if (active) console.log('[HomeScreen] No se pudo cargar el inicio:', error?.message || error);
      });
      const interval = setInterval(() => setNow(new Date()), 30_000);
      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [loadHome]),
  );

  const activeSchedule = useMemo(
    () => schedules.find((entry) => isScheduleActive(entry, now)) || null,
    [now, schedules],
  );
  const nextSchedule = useMemo(() => findNextSchedule(schedules, now), [now, schedules]);
  const dateLabel = capitalize(
    new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(now),
  );

  function openTaskEditor(task: ClassTask) {
    setTaskAction(null);
    setEditTask(task);
    setEditText(task.text);
    setEditDate(formatEditableDueDate(task.dueAt));
  }

  async function saveTaskEdit() {
    if (!editTask) return;
    try {
      const dueAt = parseEditableDueDate(editDate);
      await updateClassTaskUseCase.execute(editTask.id, { text: editText, dueAt });
      setEditTask(null);
      await loadHome();
    } catch (error: any) {
      Alert.alert('No se pudo editar', error.message || String(error));
    }
  }

  async function completeTask(task: ClassTask) {
    try {
      await updateClassTaskUseCase.execute(task.id, { completed: true });
      setTaskAction(null);
      await loadHome();
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  }

  function deleteTask(task: ClassTask) {
    Alert.alert('Eliminar tarea', '¿Desea quitar esta tarea de la lista?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClassTaskUseCase.execute(task.id);
            setTaskAction(null);
            await loadHome();
          } catch (error: any) {
            Alert.alert('Error', error.message || String(error));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>Aula<Text style={styles.brandIA}>IA</Text></Text>
            <Text style={styles.greeting}>{displayName ? `Hola, ${displayName}` : 'Tu aula inteligente'}</Text>
          </View>
        </View>

        <Text style={styles.dateText}>{dateLabel}</Text>

        {activeSchedule ? (
          <>
            <View style={styles.currentCard}>
              <View style={styles.highlightTopRow}>
                <View style={styles.currentBadge}>
                  <View style={styles.currentDot} />
                  <Text style={styles.currentBadgeText}>Clase en curso</Text>
                </View>
                <Clock3 color="#86EFAC" size={19} />
              </View>
              <Text style={styles.currentSubject}>{activeSchedule.subjectName}</Text>
              <Text style={styles.currentTime}>{activeSchedule.startTime} – {activeSchedule.endTime}</Text>
              {!!activeSchedule.teacher && <Text style={styles.currentTeacher}>{activeSchedule.teacher}</Text>}
            </View>

            {nextSchedule && (
              <View style={styles.nextCompactCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextCompactLabel}>Próxima clase</Text>
                  <Text style={styles.nextCompactSubject} numberOfLines={1}>{nextSchedule.entry.subjectName}</Text>
                  <Text style={styles.nextCompactTime}>
                    {formatNextDay(nextSchedule.date, now)} · {nextSchedule.entry.startTime} – {nextSchedule.entry.endTime}
                  </Text>
                </View>
                <Clock3 color={colors.primary} size={19} />
              </View>
            )}
          </>
        ) : nextSchedule ? (
          <View style={styles.nextMainCard}>
            <View style={styles.highlightTopRow}>
              <View style={styles.nextBadge}>
                <View style={styles.nextDot} />
                <Text style={styles.nextBadgeText}>Próxima clase</Text>
              </View>
              <Clock3 color="#93C5FD" size={20} />
            </View>
            <Text style={styles.nextMainSubject}>{nextSchedule.entry.subjectName}</Text>
            <Text style={styles.nextMainTime}>{nextSchedule.entry.startTime} – {nextSchedule.entry.endTime}</Text>
            <Text style={styles.nextMainDay}>{formatNextDay(nextSchedule.date, now)}</Text>
          </View>
        ) : (
          <View style={styles.emptyHighlightCard}>
            <CalendarDays color={colors.primary} size={28} />
            <View style={styles.emptyHighlightCopy}>
              <Text style={styles.emptyHighlightTitle}>Aún no tiene un horario</Text>
              <Text style={styles.emptyHighlightText}>Cree su horario para que AulaIA detecte automáticamente la materia.</Text>
            </View>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.scheduleShortcut, pressed && styles.scheduleShortcutPressed]}
          onLayout={(event) => setScheduleTargetY(event.nativeEvent.layout.y + event.nativeEvent.layout.height / 2 + 42)}
          onPress={() => navigation.navigate('Schedule')}
        >
          <View style={styles.scheduleShortcutIcon}><CalendarDays color={colors.primary} size={23} /></View>
          <View style={styles.scheduleShortcutCopy}>
            <Text style={styles.scheduleShortcutTitle}>{schedules.length ? 'Ver horario' : 'Crear horario'}</Text>
            <Text style={styles.scheduleShortcutText}>Consulta, edita o agrega tus clases de la semana.</Text>
          </View>
          <View style={styles.scheduleShortcutArrow}><ChevronRight color={colors.primary} size={20} /></View>
        </Pressable>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Tareas pendientes</Text>
            <Text style={styles.sectionSubtitle}>{tasks.length ? 'Confirma, edita o completa tus tareas' : 'Detectadas desde sus clases'}</Text>
          </View>
          <View style={styles.taskHeaderIcon}><ListTodo color={colors.purple} size={19} /></View>
        </View>

        <View style={styles.taskList}>
          {tasks.slice(0, 6).map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <Pressable
                style={styles.taskMain}
                onPress={() => navigation.navigate('Resumen', {
                  subjectId: task.subjectId,
                  subjectName: task.subjectName,
                  focusAudioNoteId: task.audioNoteId,
                  focusTaskId: task.id,
                  initialTab: 'deberes',
                })}
              >
                <View style={[styles.taskColor, { backgroundColor: task.subjectColor || colors.purple }]} />
                <View style={styles.taskCopy}>
                  <Text style={styles.taskText} numberOfLines={2}>{task.text}</Text>
                </View>
                <View style={styles.taskDueBadge}><Text style={styles.taskDueText}>{formatDueDate(task.dueAt)}</Text></View>
              </Pressable>
              <Pressable style={styles.taskMore} onPress={() => setTaskAction(task)}>
                <MoreVertical color={colors.text} size={20} />
              </Pressable>
            </View>
          ))}

          {!tasks.length && (
            <View style={styles.emptyTasksCard}>
              <ListTodo color={colors.muted} size={27} />
              <Text style={styles.emptyTasksTitle}>No se detectaron tareas pendientes</Text>
              <Text style={styles.emptyTasksText}>Cuando una clase mencione un deber, consulta o fecha de entrega, aparecerá aquí.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AppBottomBar activeTab="Home" />
      <OnboardingTutorial
        visible={tutorialVisible}
        scheduleTargetY={scheduleTargetY}
        onClose={() => {
          setTutorialVisible(false);
          if (route.params?.showTutorial) {
            navigation.setParams({ showTutorial: undefined });
          }
        }}
      />

      <Modal visible={!!taskAction} transparent animationType="fade" onRequestClose={() => setTaskAction(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Opciones de la tarea</Text>
                <Text style={styles.modalSubtitle} numberOfLines={2}>{taskAction?.text}</Text>
              </View>
              <Pressable onPress={() => setTaskAction(null)}><X color={colors.text} size={22} /></Pressable>
            </View>
            {taskAction && (
              <>
                <Pressable style={styles.actionRow} onPress={() => completeTask(taskAction)}>
                  <CheckCircle2 color={colors.success} size={20} />
                  <Text style={styles.actionText}>Marcar como completada</Text>
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => openTaskEditor(taskAction)}>
                  <Pencil color={colors.primary} size={20} />
                  <Text style={styles.actionText}>Editar tarea o fecha</Text>
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => deleteTask(taskAction)}>
                  <Trash2 color={colors.danger} size={20} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Eliminar tarea</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!editTask} transparent animationType="fade" onRequestClose={() => setEditTask(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.actionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar tarea</Text>
              <Pressable onPress={() => setEditTask(null)}><X color={colors.text} size={22} /></Pressable>
            </View>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput style={[styles.input, styles.multiline]} value={editText} onChangeText={setEditText} multiline />
            <Text style={styles.inputLabel}>Fecha de entrega</Text>
            <TextInput
              style={styles.input}
              value={editDate}
              onChangeText={setEditDate}
              placeholder="DD/MM/AAAA (opcional)"
              placeholderTextColor={colors.muted}
              keyboardType="numbers-and-punctuation"
            />
            <Pressable style={styles.saveButton} onPress={saveTaskEdit}>
              <Text style={styles.saveButtonText}>Guardar cambios</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

async function loadPendingTasks(): Promise<ClassTask[]> {
  const stored = await listClassTasksUseCase.execute();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return stored.filter((task) => {
    if (task.completed) return false;
    if (!task.dueAt) return true;
    const due = new Date(task.dueAt);
    return Number.isNaN(due.getTime()) || due.getTime() >= today.getTime();
  });
}

function formatNextDay(date: Date, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const difference = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return 'Hoy';
  if (difference === 1) return 'Mañana';
  return getWeekDayLabel(target.getDay());
}

function formatDueDate(value?: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(date);
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 18, paddingTop: 42, paddingBottom: 26 },
    brandRow: { flexDirection: 'row', alignItems: 'center' },
    logo: { width: 54, height: 54, borderRadius: 16 },
    brandCopy: { flex: 1, marginLeft: 11 },
    brandName: { color: colors.primary, fontSize: 27, fontWeight: '900', letterSpacing: -0.8 },
    brandIA: { color: colors.purple },
    greeting: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: -1 },
    dateText: { color: colors.muted, fontSize: 13, fontWeight: '800', marginTop: 18 },
    highlightTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    currentCard: { borderRadius: 22, backgroundColor: '#14532D', padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#22C55E' },
    currentBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, backgroundColor: '#166534', paddingHorizontal: 10, paddingVertical: 5 },
    currentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
    currentBadgeText: { color: '#BBF7D0', fontSize: 10.5, fontWeight: '900' },
    currentSubject: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 12 },
    currentTime: { color: '#DCFCE7', fontSize: 14, fontWeight: '900', marginTop: 4 },
    currentTeacher: { color: '#BBF7D0', fontSize: 11, marginTop: 4 },
    nextCompactCard: { marginTop: 8, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
    nextCompactLabel: { color: colors.primary, fontSize: 9.5, fontWeight: '900' },
    nextCompactSubject: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 2 },
    nextCompactTime: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
    nextMainCard: { borderRadius: 22, backgroundColor: '#1E3A8A', padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#3B82F6' },
    nextBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 99, backgroundColor: '#1D4ED8', paddingHorizontal: 10, paddingVertical: 5 },
    nextDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#60A5FA' },
    nextBadgeText: { color: '#DBEAFE', fontSize: 10.5, fontWeight: '900' },
    nextMainSubject: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 12 },
    nextMainTime: { color: '#DBEAFE', fontSize: 14, fontWeight: '900', marginTop: 4 },
    nextMainDay: { color: '#BFDBFE', fontSize: 11, marginTop: 3 },
    emptyHighlightCard: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.primarySoft, padding: 15, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 13 },
    emptyHighlightCopy: { flex: 1 },
    emptyHighlightTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
    emptyHighlightText: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 4 },
    scheduleShortcut: { minHeight: 72, marginTop: 13, borderRadius: 18, borderWidth: 1, borderColor: isDark ? '#29466B' : '#BFDBFE', backgroundColor: isDark ? '#10263E' : '#EFF6FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 10 },
    scheduleShortcutPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
    scheduleShortcutIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? '#173A63' : '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
    scheduleShortcutCopy: { flex: 1, marginLeft: 11 },
    scheduleShortcutTitle: { color: colors.text, fontSize: 14.5, fontWeight: '900' },
    scheduleShortcutText: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
    scheduleShortcutArrow: { width: 32, height: 32, borderRadius: 11, backgroundColor: isDark ? '#173A63' : '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, marginLeft: 8 },
    sectionHeader: { marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
    taskHeaderIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    taskList: { marginTop: 12, gap: 9 },
    taskCard: { minHeight: 64, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'stretch' },
    taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 11 },
    taskColor: { width: 7, alignSelf: 'stretch', borderRadius: 99, marginRight: 10 },
    taskCopy: { flex: 1 },
    taskText: { color: colors.text, fontSize: 13.5, lineHeight: 19, fontWeight: '900' },
    taskDueBadge: { minWidth: 62, height: 30, borderRadius: 10, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    taskDueText: { color: colors.purple, fontSize: 9.5, fontWeight: '900' },
    taskMore: { width: 38, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.border },
    emptyTasksCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 18, alignItems: 'center' },
    emptyTasksTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 9 },
    emptyTasksText: { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.72)', justifyContent: 'center', padding: 22 },
    actionModal: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 17 },
    modalHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
    modalTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
    modalSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
    actionRow: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginTop: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionText: { color: colors.text, fontSize: 12.5, fontWeight: '800' },
    inputLabel: { color: colors.text, fontSize: 11, fontWeight: '900', marginTop: 15, marginBottom: 6 },
    input: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 12, fontSize: 13 },
    multiline: { minHeight: 92, paddingTop: 12, textAlignVertical: 'top' },
    saveButton: { minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    saveButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  });
}
