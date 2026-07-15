import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import {
  ClassContentType,
  CLASS_CONTENT_LABELS,
} from '../domain/entities/ClassContentType';
import { Subject } from '../domain/entities/Subject';
import { AudioNote } from '../domain/entities/AudioNote';
import { DetectedTaskCandidate, detectTaskCandidates } from '../application/taskDetection';
import {
  findActiveClassScheduleUseCase,
  listSubjectsUseCase,
  processAudioNoteUseCase,
  createSubjectUseCase,
  saveDetectedTasksUseCase,
} from '../application/container';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import { getPickerItemColor } from '../components/ui/pickerColors';

const CONTENT_TYPES: ClassContentType[] = ['theory', 'math', 'image', 'general'];

// Audio liviano para subir y transcribir con menor latencia.
const FAST_SPEECH_RECORDING_OPTIONS = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 32000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 32000,
  },
} as any;

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function AudioScreen() {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pickerItemColor = getPickerItemColor(isDark, colors.text);
  const route = useRoute<RouteProp<PropsList, 'Audio'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const params = route.params || {};
  const quickRecord = !!params.quickRecord;
  const isAppendingToClass = !!params.audioNoteId;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(params.subjectId || '');
  const [title, setTitle] = useState(params.audioNoteTitle || '');
  const [contentType, setContentType] = useState<ClassContentType>('theory');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('audio/m4a');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [newSubjectVisible, setNewSubjectVisible] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTeacher, setNewSubjectTeacher] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [taskReviewVisible, setTaskReviewVisible] = useState(false);
  const [taskCandidates, setTaskCandidates] = useState<Array<DetectedTaskCandidate & { selected: boolean }>>([]);
  const [pendingProcessed, setPendingProcessed] = useState<{
    note: AudioNote;
    subjectId: string;
    subjectName: string;
  } | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingStartedAtRef = useRef<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    listSubjectsUseCase
      .execute()
      .then((data) => {
        setSubjects(data);
        if (!selectedSubjectId && params.subjectId) setSelectedSubjectId(params.subjectId);
      })
      .catch((error) => console.log('[AudioScreen] Materias:', error));
  }, [params.subjectId]);

  useEffect(() => {
    if (!quickRecord || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const timeout = setTimeout(() => iniciarGrabacion(), 450);
    return () => clearTimeout(timeout);
  }, [quickRecord]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => setSeconds((value) => value + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, isRecording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      const recording = recordingRef.current;
      recordingRef.current = null;
      recording?.stopAndUnloadAsync().catch(() => undefined);
    };
  }, []);

  async function iniciarGrabacion() {
    if (recordingRef.current || isRecording) return;
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso de micrófono', 'Active el permiso de micrófono para grabar la clase.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        FAST_SPEECH_RECORDING_OPTIONS,
      );
      recordingRef.current = recording;
      recordingStartedAtRef.current = new Date();
      setAudioUri(null);
      setSeconds(0);
      setIsPaused(false);
      setIsRecording(true);
    } catch (error: any) {
      setIsRecording(false);
      Alert.alert('No se pudo grabar', error.message || String(error));
    }
  }

  async function pausarOContinuar() {
    const recording = recordingRef.current;
    if (!recording) return;
    try {
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  }

  function confirmarCancelarGrabacion() {
    Alert.alert(
      'Cancelar grabación',
      '¿Desea descartar esta grabación? El audio no se procesará ni se guardará.',
      [
        { text: 'Continuar grabando', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: cancelarGrabacion,
        },
      ],
    );
  }

  async function cancelarGrabacion() {
    try {
      const recording = recordingRef.current;
      recordingRef.current = null;
      if (recording) {
        await recording.stopAndUnloadAsync().catch(() => undefined);
        const discardedUri = recording.getURI();
        if (discardedUri) {
          await FileSystem.deleteAsync(discardedUri, { idempotent: true }).catch(() => undefined);
        }
      }
    } finally {
      setIsRecording(false);
      setIsPaused(false);
      setSeconds(0);
      setAudioUri(null);
      recordingStartedAtRef.current = null;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => undefined);
      if (quickRecord) navigation.navigate('Home');
    }
  }

  async function detenerGrabacion() {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      recordingRef.current = null;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setIsPaused(false);

      if (!uri) {
        Alert.alert('No se pudo guardar', 'La grabación no generó un archivo válido.');
        return;
      }

      setAudioUri(uri);
      setMimeType('audio/m4a');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      }).catch(() => undefined);
      if (quickRecord) await suggestDestination(uri);
    } catch (error: any) {
      setIsRecording(false);
      setIsPaused(false);
      Alert.alert('No se pudo finalizar', error.message || String(error));
    }
  }

  async function suggestDestination(uri: string) {
    try {
      const finishedAt = new Date();
      let detected = await findActiveClassScheduleUseCase.execute(finishedAt);
      if (!detected && recordingStartedAtRef.current) {
        detected = await findActiveClassScheduleUseCase.execute(recordingStartedAtRef.current);
      }

      if (!detected) {
        Alert.alert(
          'Seleccione una materia',
          'No existe una materia programada para esta hora. Puede seleccionar una materia existente o crear una nueva.',
          [
            { text: 'Crear materia', onPress: () => setNewSubjectVisible(true) },
            { text: 'Seleccionar materia', onPress: () => setSubjectPickerVisible(true) },
          ],
        );
        return;
      }

      Alert.alert(
        'Materia detectada',
        `Según su horario, esta grabación corresponde a “${detected.subjectName}” (${detected.startTime} – ${detected.endTime}).\n\n¿Desea guardarla en esta materia?`,
        [
          {
            text: 'No, elegir otra',
            style: 'cancel',
            onPress: () => setSubjectPickerVisible(true),
          },
          {
            text: 'Sí, procesar',
            onPress: () => processAndSave(detected.subjectId, uri, detected.subjectName),
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(
        'Seleccione una materia',
        error.message || 'No fue posible consultar el horario.',
        [
          { text: 'Crear materia', onPress: () => setNewSubjectVisible(true) },
          { text: 'Seleccionar', onPress: () => setSubjectPickerVisible(true) },
        ],
      );
    }
  }

  async function seleccionarAudio() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setAudioUri(asset.uri);
      setMimeType(asset.mimeType || 'audio/m4a');
      if (!title.trim()) setTitle(asset.name?.replace(/\.[^/.]+$/, '') || 'Clase');
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el archivo de audio.');
    }
  }

  async function processAndSave(
    subjectId: string,
    uri: string | null = audioUri,
    subjectName?: string,
  ) {
    if (!uri) {
      Alert.alert('Falta el audio', 'Grabe o seleccione un audio primero.');
      return;
    }
    if (!subjectId) {
      setSubjectPickerVisible(true);
      return;
    }

    try {
      setSubjectPickerVisible(false);
      setLoading(true);
      setLoadingText('Preparando audio liviano...');
      const automaticTitle = `${subjectName || 'Clase'} · ${new Date().toLocaleDateString()}`;
      const savedNote = await processAudioNoteUseCase.execute({
        title: title.trim() || params.audioNoteTitle || automaticTitle,
        subjectId,
        audioNoteId: params.audioNoteId,
        audioUri: uri,
        mimeType,
        contentType,
        onProgress: setLoadingText,
      });

      setLoading(false);
      setLoadingText('');
      setAudioUri(null);
      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);

      const resolvedSubjectName =
        subjectName || subjects.find((subject) => subject.id === subjectId)?.name || 'Materia';
      const candidates = detectTaskCandidates({ deberes: savedNote.deberes });

      if (candidates.length) {
        setPendingProcessed({ note: savedNote, subjectId, subjectName: resolvedSubjectName });
        setTaskCandidates(candidates.map((candidate) => ({ ...candidate, selected: true })));
        setTaskReviewVisible(true);
        return;
      }

      openProcessedClass(savedNote, subjectId, resolvedSubjectName);
    } catch (error: any) {
      Alert.alert('No se pudo procesar', error.message || String(error));
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }

  function openProcessedClass(note: AudioNote, subjectId: string, subjectName: string) {
    navigation.navigate('Resumen', {
      subjectId,
      subjectName,
      focusAudioNoteId: note.id,
    });
  }

  function toggleDetectedTask(index: number) {
    const current = taskCandidates[index];
    if (!current) return;

    const apply = () =>
      setTaskCandidates((items) =>
        items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, selected: !item.selected } : item,
        ),
      );

    if (current.selected) {
      Alert.alert(
        'Quitar posible tarea',
        '¿Desea quitar esta tarea de la lista de pendientes?',
        [
          { text: 'Mantener', style: 'cancel' },
          { text: 'Quitar', style: 'destructive', onPress: apply },
        ],
      );
      return;
    }

    apply();
  }

  async function confirmDetectedTasks() {
    const pending = pendingProcessed;
    if (!pending) return;

    try {
      setLoading(true);
      setLoadingText('Guardando tareas confirmadas...');
      const subject = subjects.find((item) => item.id === pending.subjectId);
      await saveDetectedTasksUseCase.execute(
        taskCandidates
          .filter((candidate) => candidate.selected)
          .map((candidate) => ({
            subjectId: pending.subjectId,
            subjectName: pending.subjectName,
            subjectColor: subject?.color || null,
            audioNoteId: pending.note.id,
            classTitle: pending.note.title,
            text: candidate.text,
            details: candidate.details || null,
            confidence: candidate.confidence ?? null,
            dueAt: candidate.dueAt,
            completed: false,
          })),
      );
      setTaskReviewVisible(false);
      setTaskCandidates([]);
      setPendingProcessed(null);
      openProcessedClass(pending.note, pending.subjectId, pending.subjectName);
    } catch (error: any) {
      Alert.alert('No se pudieron guardar las tareas', error.message || String(error));
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  }

  function skipDetectedTasks() {
    const pending = pendingProcessed;
    if (!pending) return;
    setTaskReviewVisible(false);
    setTaskCandidates([]);
    setPendingProcessed(null);
    openProcessedClass(pending.note, pending.subjectId, pending.subjectName);
  }

  function selectDestination(subject: Subject) {
    setSelectedSubjectId(subject.id);
    processAndSave(subject.id, audioUri, subject.name);
  }

  async function createSubjectAndSave() {
    if (!newSubjectName.trim()) {
      Alert.alert('Falta el nombre', 'Escriba el nombre de la nueva materia.');
      return;
    }

    try {
      setLoading(true);
      setLoadingText('Creando materia...');
      const subject = await createSubjectUseCase.execute({
        name: newSubjectName,
        teacher: newSubjectTeacher,
        icon: '📚',
      });
      setSubjects((current) => [subject, ...current.filter((item) => item.id !== subject.id)]);
      setSelectedSubjectId(subject.id);
      setNewSubjectVisible(false);
      setNewSubjectName('');
      setNewSubjectTeacher('');
      setLoading(false);
      setLoadingText('');
      await processAndSave(subject.id, audioUri, subject.name);
    } catch (error: any) {
      setLoading(false);
      setLoadingText('');
      Alert.alert('No se pudo crear la materia', error.message || String(error));
    }
  }

  const audioReady = !!audioUri;
  const selectedSubject = subjects.find((subject) => subject.id === selectedSubjectId);

  if (quickRecord) {
    return (
      <View style={styles.screen}>
        <View style={styles.quickContent}>
          <View style={styles.quickHeader}>
            <Text style={styles.quickTitle}>Grabación de clase</Text>
            <Text style={styles.quickSubtitle}>
              AulaIA procesará el audio y generará el texto cuando finalice la grabación.
            </Text>
          </View>

          <RecorderVisual active={isRecording && !isPaused} paused={isPaused} />

          <Text style={styles.quickTimer}>{formatTime(seconds)}</Text>
          <Text style={styles.recordingStatus}>
            {isRecording
              ? isPaused
                ? 'Grabación pausada'
                : 'Grabando la clase...'
              : audioReady
                ? 'Audio listo para procesar'
                : 'Preparando micrófono...'}
          </Text>

          <View style={styles.quickControls}>
            {!isRecording && !audioReady && (
              <Pressable style={styles.mainRecordButton} onPress={iniciarGrabacion}>
                <Mic color="#fff" size={23} />
                <Text style={styles.mainRecordText}>Iniciar grabación</Text>
              </Pressable>
            )}

            {isRecording && (
              <View style={styles.threeControlRow}>
                <Pressable style={styles.cancelButton} onPress={confirmarCancelarGrabacion}>
                  <Trash2 color={colors.danger} size={19} />
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.pauseButton} onPress={pausarOContinuar}>
                  {isPaused ? <Play color="#fff" size={20} /> : <Pause color="#fff" size={20} />}
                  <Text style={styles.controlText}>{isPaused ? 'Continuar' : 'Pausar'}</Text>
                </Pressable>
                <Pressable style={styles.stopButton} onPress={detenerGrabacion}>
                  <Square color="#fff" size={19} />
                  <Text style={styles.controlText}>Finalizar</Text>
                </Pressable>
              </View>
            )}

            {!isRecording && audioReady && (
              <Pressable style={styles.chooseButton} onPress={() => setSubjectPickerVisible(true)}>
                <BookOpen color={colors.primary} size={21} />
                <Text style={styles.chooseButtonText}>Elegir materia para procesar</Text>
              </Pressable>
            )}
          </View>
        </View>

        <SubjectPickerModal
          visible={subjectPickerVisible}
          subjects={subjects}
          onClose={() => setSubjectPickerVisible(false)}
          onSelect={selectDestination}
          onCreate={() => {
            setSubjectPickerVisible(false);
            setNewSubjectVisible(true);
          }}
        />
        <NewSubjectModal
          visible={newSubjectVisible}
          name={newSubjectName}
          teacher={newSubjectTeacher}
          onChangeName={setNewSubjectName}
          onChangeTeacher={setNewSubjectTeacher}
          onClose={() => setNewSubjectVisible(false)}
          onSave={createSubjectAndSave}
        />
        <TaskReviewModal
          visible={taskReviewVisible}
          tasks={taskCandidates}
          onToggle={toggleDetectedTask}
          onConfirm={confirmDetectedTasks}
          onSkip={skipDetectedTasks}
        />
        <LoadingModal visible={loading} text={loadingText || 'Procesando clase...'} />
        <AppBottomBar activeTab="Audio" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.screenTitle}>
            {isAppendingToClass ? 'Agregar audio a la clase' : 'Nuevo apunte de audio'}
          </Text>
          <Text style={styles.screenSubtitle}>
            Grabe una clase o suba un archivo. La transcripción se genera una sola vez al procesarlo.
          </Text>

          {!params.subjectId && (
            <>
              <Text style={styles.label}>Materia</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  <Picker.Item label="Seleccione una materia" value="" color={pickerItemColor} />
                  {subjects.map((subject) => (
                    <Picker.Item key={subject.id} label={subject.name} value={subject.id} color={pickerItemColor} />
                  ))}
                </Picker>
              </View>
            </>
          )}

          <View style={styles.manualRecorder}>
            <RecorderVisual active={isRecording && !isPaused} paused={isPaused} compact />
            <Text style={styles.manualTimer}>{formatTime(seconds)}</Text>
            <Text style={styles.recordingStatus}>
              {isRecording ? (isPaused ? 'Pausada' : 'Grabando...') : audioReady ? 'Audio listo' : 'Lista para grabar'}
            </Text>

            {!isRecording ? (
              <Pressable style={styles.mainRecordButton} onPress={iniciarGrabacion}>
                <Mic color="#fff" size={22} />
                <Text style={styles.mainRecordText}>Grabar clase</Text>
              </Pressable>
            ) : (
              <View style={styles.threeControlRow}>
                <Pressable style={styles.cancelButton} onPress={confirmarCancelarGrabacion}>
                  <Trash2 color={colors.danger} size={18} />
                  <Text style={styles.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.pauseButton} onPress={pausarOContinuar}>
                  {isPaused ? <Play color="#fff" size={19} /> : <Pause color="#fff" size={19} />}
                  <Text style={styles.controlText}>{isPaused ? 'Continuar' : 'Pausar'}</Text>
                </Pressable>
                <Pressable style={styles.stopButton} onPress={detenerGrabacion}>
                  <Square color="#fff" size={18} />
                  <Text style={styles.controlText}>Finalizar</Text>
                </Pressable>
              </View>
            )}
          </View>

          <Pressable style={styles.uploadButton} onPress={seleccionarAudio}>
            <Upload color={colors.purple} size={21} />
            <Text style={styles.uploadText}>Subir archivo de audio</Text>
          </Pressable>

          <Pressable style={styles.advancedButton} onPress={() => setShowAdvanced(!showAdvanced)}>
            <Text style={styles.advancedText}>Opciones del apunte</Text>
            <ChevronDown
              color={colors.muted}
              size={19}
              style={{ transform: [{ rotate: showAdvanced ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showAdvanced && (
            <View style={styles.advancedPanel}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Opcional: la app puede generarlo"
                placeholderTextColor={colors.muted}
              />
              <Text style={styles.label}>Tipo de contenido</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={contentType}
                  onValueChange={setContentType}
                  style={{ color: colors.text }}
                  dropdownIconColor={colors.text}
                >
                  {CONTENT_TYPES.map((type) => (
                    <Picker.Item key={type} label={CLASS_CONTENT_LABELS[type]} value={type} color={pickerItemColor} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {audioReady && (
            <View style={styles.readyBox}>
              <CheckCircle2 color={colors.success} size={20} />
              <Text style={styles.readyText}>Audio listo para transcribir, resumir y guardar</Text>
            </View>
          )}

          <Pressable
            style={[styles.processButton, (!audioReady || !selectedSubjectId) && styles.disabledButton]}
            disabled={!audioReady || !selectedSubjectId}
            onPress={() => processAndSave(selectedSubjectId, audioUri, selectedSubject?.name)}
          >
            <Text style={styles.processText}>
              {isAppendingToClass ? 'Agregar a la clase' : 'Generar resumen y guardar'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <SubjectPickerModal
        visible={subjectPickerVisible}
        subjects={subjects}
        onClose={() => setSubjectPickerVisible(false)}
        onSelect={selectDestination}
        onCreate={() => {
          setSubjectPickerVisible(false);
          setNewSubjectVisible(true);
        }}
      />
      <NewSubjectModal
        visible={newSubjectVisible}
        name={newSubjectName}
        teacher={newSubjectTeacher}
        onChangeName={setNewSubjectName}
        onChangeTeacher={setNewSubjectTeacher}
        onClose={() => setNewSubjectVisible(false)}
        onSave={createSubjectAndSave}
      />
      <TaskReviewModal
        visible={taskReviewVisible}
        tasks={taskCandidates}
        onToggle={toggleDetectedTask}
        onConfirm={confirmDetectedTasks}
        onSkip={skipDetectedTasks}
      />
      <LoadingModal visible={loading} text={loadingText || 'Procesando clase...'} />
      <AppBottomBar activeTab="Audio" />
    </View>
  );
}

function TaskReviewModal({
  visible,
  tasks,
  onToggle,
  onConfirm,
  onSkip,
}: {
  visible: boolean;
  tasks: Array<DetectedTaskCandidate & { selected: boolean }>;
  onToggle: (index: number) => void;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>Confirme las tareas detectadas</Text>
              <Text style={styles.modalSubtitle}>
                Las opciones vienen activadas. Desmarque cualquier falso positivo antes de continuar.
              </Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {tasks.map((task, index) => (
              <Pressable
                key={`${task.text}_${index}`}
                style={[styles.taskReviewRow, task.selected && styles.taskReviewRowSelected]}
                onPress={() => onToggle(index)}
              >
                <CheckCircle2
                  color={task.selected ? colors.success : colors.muted}
                  size={22}
                  fill={task.selected ? `${colors.success}22` : 'transparent'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskReviewText}>{task.text}</Text>
                  {!!task.details && (
                    <Text style={styles.taskReviewDetails}>{task.details}</Text>
                  )}
                  <Text style={styles.taskReviewDate}>
                    {task.dueAt
                      ? `Entrega: ${new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(new Date(task.dueAt))}`
                      : 'Sin fecha detectada'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.taskReviewActions}>
            <Pressable style={styles.taskSkipButton} onPress={onSkip}>
              <Text style={styles.taskSkipText}>Continuar sin guardar</Text>
            </Pressable>
            <Pressable style={styles.taskConfirmButton} onPress={onConfirm}>
              <Text style={styles.taskConfirmText}>Guardar seleccionadas</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RecorderVisual({
  active,
  paused,
  compact = false,
}: {
  active: boolean;
  paused: boolean;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pulseOne = useRef(new Animated.Value(0)).current;
  const pulseTwo = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const bars = useRef([0, 1, 2, 3, 4, 5, 6].map(() => new Animated.Value(0.35))).current;

  useEffect(() => {
    if (!active) {
      pulseOne.setValue(0);
      pulseTwo.setValue(0);
      floatValue.setValue(0);
      bars.forEach((bar) => bar.setValue(0.35));
      return;
    }

    const pulse = Animated.loop(
      Animated.stagger(420, [
        Animated.sequence([
          Animated.timing(pulseOne, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseOne, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseTwo, { toValue: 1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseTwo, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatValue, { toValue: 0, duration: 850, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const barAnimations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 60),
          Animated.timing(bar, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(bar, { toValue: 0.35, duration: 320, useNativeDriver: true }),
        ]),
      ),
    );

    pulse.start();
    floating.start();
    barAnimations.forEach((animation) => animation.start());
    return () => {
      pulse.stop();
      floating.stop();
      barAnimations.forEach((animation) => animation.stop());
    };
  }, [active, bars, floatValue, pulseOne, pulseTwo]);

  const pulseStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0] }),
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.35] }) }],
  });

  return (
    <View style={[styles.visualStage, compact && styles.visualStageCompact]}>
      <Animated.View style={[styles.pulseRing, pulseStyle(pulseOne)]} />
      <Animated.View style={[styles.pulseRing, pulseStyle(pulseTwo)]} />
      <Animated.View
        style={[
          styles.micOrb,
          paused && styles.micOrbPaused,
          {
            transform: [
              {
                translateY: floatValue.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }),
              },
            ],
          },
        ]}
      >
        {paused ? <Pause color="#fff" size={compact ? 30 : 40} /> : <Mic color="#fff" size={compact ? 32 : 44} />}
      </Animated.View>
      <View style={styles.waveBars}>
        {bars.map((bar, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                backgroundColor: active ? colors.primary : colors.muted,
                transform: [{ scaleY: bar }],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.visualLabel}>{paused ? 'Grabación en pausa' : active ? 'AulaIA está escuchando' : 'Micrófono listo'}</Text>
    </View>
  );
}

function SubjectPickerModal({
  visible,
  subjects,
  onClose,
  onSelect,
  onCreate,
}: {
  visible: boolean;
  subjects: Subject[];
  onClose: () => void;
  onSelect: (subject: Subject) => void;
  onCreate: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>¿Dónde desea guardarla?</Text>
              <Text style={styles.modalSubtitle}>Seleccione una materia o cree una nueva.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X color={colors.text} size={22} />
            </Pressable>
          </View>

          <FlatList
            data={subjects}
            keyExtractor={(item) => item.id}
            style={styles.subjectList}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay materias creadas.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.subjectRow} onPress={() => onSelect(item)}>
                <View style={[styles.subjectDot, { backgroundColor: item.color || colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  {!!item.teacher && <Text style={styles.subjectTeacher}>{item.teacher}</Text>}
                </View>
                <BookOpen color={colors.primary} size={19} />
              </Pressable>
            )}
          />

          <Pressable style={styles.createSubjectButton} onPress={onCreate}>
            <Text style={styles.createSubjectText}>Crear una materia nueva</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function NewSubjectModal({
  visible,
  name,
  teacher,
  onChangeName,
  onChangeTeacher,
  onClose,
  onSave,
}: {
  visible: boolean;
  name: string;
  teacher: string;
  onChangeName: (value: string) => void;
  onChangeTeacher: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva materia</Text>
            <Pressable onPress={onClose} style={styles.iconButton}>
              <X color={colors.text} size={22} />
            </Pressable>
          </View>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            value={name}
            onChangeText={onChangeName}
            style={styles.input}
            placeholder="Ej. Cálculo diferencial"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Docente (opcional)</Text>
          <TextInput
            value={teacher}
            onChangeText={onChangeTeacher}
            style={styles.input}
            placeholder="Nombre del docente"
            placeholderTextColor={colors.muted}
          />
          <Pressable style={styles.processButton} onPress={onSave}>
            <Text style={styles.processText}>Crear y guardar grabación</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flexGrow: 1, padding: 15, paddingBottom: 25 },
    quickContent: { flex: 1, paddingHorizontal: 18, paddingTop: 20, justifyContent: 'space-between', paddingBottom: 16 },
    quickHeader: { alignItems: 'center' },
    quickTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
    quickSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6, maxWidth: 340 },
    quickTimer: { color: colors.danger, fontSize: 43, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    recordingStatus: { color: colors.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', marginTop: 4 },
    quickControls: { marginTop: 10, marginBottom: 4 },
    card: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 16 },
    screenTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
    screenSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 16 },
    label: { color: colors.text, fontSize: 12, fontWeight: '900', marginBottom: 7, marginTop: 9 },
    pickerWrapper: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.input, justifyContent: 'center' },
    manualRecorder: { backgroundColor: colors.soft, borderRadius: 20, padding: 15, marginTop: 15, borderWidth: 1, borderColor: colors.border },
    manualTimer: { color: colors.text, fontSize: 35, fontWeight: '900', textAlign: 'center' },
    visualStage: { minHeight: 260, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
    visualStageCompact: { minHeight: 185 },
    pulseRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.primary },
    micOrb: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 28px rgba(37,99,235,0.28)' },
    micOrbPaused: { backgroundColor: colors.purple },
    waveBars: { height: 42, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 20 },
    waveBar: { width: 5, height: 34, borderRadius: 99 },
    visualLabel: { color: colors.muted, fontSize: 11.5, fontWeight: '800', marginTop: 5 },
    mainRecordButton: { minHeight: 54, borderRadius: 17, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
    mainRecordText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    threeControlRow: { flexDirection: 'row', gap: 8 },
    cancelButton: { flex: 1, minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: colors.danger, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4 },
    cancelText: { color: colors.danger, fontSize: 10.5, fontWeight: '900' },
    pauseButton: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', gap: 4 },
    stopButton: { flex: 1, minHeight: 54, borderRadius: 16, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', gap: 4 },
    controlText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
    chooseButton: { minHeight: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    chooseButtonText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
    uploadButton: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 13 },
    uploadText: { color: colors.purple, fontSize: 13, fontWeight: '900' },
    advancedButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 7 },
    advancedText: { color: colors.text, fontSize: 12.5, fontWeight: '900' },
    advancedPanel: { backgroundColor: colors.soft, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.border },
    input: { height: 49, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.text, paddingHorizontal: 13, fontSize: 13 },
    readyBox: { minHeight: 50, borderRadius: 15, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, marginTop: 13 },
    readyText: { flex: 1, color: colors.text, fontSize: 11.5, fontWeight: '800' },
    processButton: { minHeight: 54, borderRadius: 17, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
    disabledButton: { opacity: 0.42 },
    processText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.58)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    modalCard: { width: '100%', maxHeight: '78%', backgroundColor: colors.card, borderRadius: 23, padding: 16, borderWidth: 1, borderColor: colors.border },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    modalSubtitle: { color: colors.muted, fontSize: 11.5, marginTop: 3 },
    iconButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
    subjectList: { maxHeight: 360 },
    subjectRow: { minHeight: 62, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
    subjectDot: { width: 8, height: 39, borderRadius: 99 },
    subjectName: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
    subjectTeacher: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
    createSubjectButton: { minHeight: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    createSubjectText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
    emptyText: { color: colors.muted, textAlign: 'center', padding: 20 },
    taskReviewRow: {
      marginTop: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    taskReviewRowSelected: { borderColor: colors.success, backgroundColor: colors.soft },
    taskReviewText: { color: colors.text, fontSize: 12.5, lineHeight: 18, fontWeight: '800' },
    taskReviewDetails: { color: colors.muted, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
    taskReviewDate: { color: colors.muted, fontSize: 10.5, marginTop: 4 },
    taskReviewActions: { flexDirection: 'row', gap: 9, marginTop: 15 },
    taskSkipButton: {
      flex: 1,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    taskSkipText: { color: colors.muted, fontSize: 11, fontWeight: '900', textAlign: 'center' },
    taskConfirmButton: {
      flex: 1.25,
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    taskConfirmText: { color: '#fff', fontSize: 11, fontWeight: '900', textAlign: 'center' },
  });
}
