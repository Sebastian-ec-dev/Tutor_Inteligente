import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PropsList } from '../navigation/AppNavigator';
import { FileAudio, Plus, ChevronDown, ChevronUp, Mic, Users, MessageSquare, Pencil, Trash2, BookOpen, CheckCircle2, CircleHelp, CalendarClock, Lightbulb, ClipboardList } from 'lucide-react-native';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import { AudioNote } from '../domain/entities/AudioNote';
import { deleteAudioNoteUseCase, listAudioNotesUseCase, updateAudioNoteUseCase } from '../application/container';
import { supabase } from '../infrastructure/supabase/supabaseClient';

type SummarySection = {
  title: string;
  accent: string;
  icon: 'book' | 'check' | 'question' | 'tasks' | 'calendar' | 'tips';
  items: string[];
  emptyMessage?: string;
};

export default function ResumenScreen() {
  const route = useRoute<RouteProp<PropsList, 'Resumen'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId, subjectName } = route.params;
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const [resumenes, setResumenes] = useState<AudioNote[]>([]);
  const [resumenId, setResumenId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('student');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const editingClassRef = useRef<AudioNote | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const leerResumenes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listAudioNotesUseCase.execute(subjectId);
      setResumenes(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  const cargarPermisos = useCallback(async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id || '';
      setCurrentUserId(uid);
      if (!uid) return;

      const { data } = await supabase
        .from('subject_members')
        .select('role')
        .eq('subject_id', subjectId)
        .eq('user_id', uid)
        .maybeSingle();

      setMyRole((data?.role as string) || 'student');
    } catch (error) {
      console.log('[ResumenScreen] No se pudo cargar permisos:', error);
    }
  }, [subjectId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      leerResumenes();
      cargarPermisos();
    });

    return () => {
      unsubscribe();
    };
  }, [navigation, leerResumenes, cargarPermisos]);

  function canManageClass(item: AudioNote): boolean {
    return item.userId === currentUserId || ['owner', 'admin', 'teacher'].includes(myRole);
  }

  function abrirEditarClase(item: AudioNote) {
    editingClassRef.current = item;
    setEditingTitle(item.title);
    setEditModalVisible(true);
  }

  async function guardarNombreClase() {
    try {
      const editingClass = editingClassRef.current;
      if (!editingClass) return;
      setLoading(true);
      await updateAudioNoteUseCase.execute({ id: editingClass.id, title: editingTitle });
      setEditModalVisible(false);
      editingClassRef.current = null;
      setEditingTitle('');
      await leerResumenes();
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function eliminarClase(item: AudioNote) {
    Alert.alert(
      'Eliminar clase',
      `¿Seguro que deseas eliminar "${item.title}"? También se eliminará su resumen y transcripción.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteAudioNoteUseCase.execute(item.id);
              await leerResumenes();
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
    const cleanSummary = sanitizeDisplayText(item.summary || '');
    const cleanTranscript = sanitizeDisplayText(item.transcript || '');
    const structuredSummary = buildSummarySections(cleanSummary, cleanTranscript, item.title);

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable style={styles.cardHeader} onPress={() => toggleExpandir(item.id)}>
          <View style={styles.cardTitleRow}>
            <View style={styles.fileIconBox}>
              <FileAudio color="#2563EB" size={22} />
            </View>
            <View style={styles.cardHeaderTextWrap}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Clase procesada y lista para estudiar</Text>
            </View>
          </View>
          {isExpanded ? <ChevronUp color="#64748B" /> : <ChevronDown color="#64748B" />}
        </Pressable>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={[styles.heroBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
              <View style={styles.heroBadge}><BookOpen size={14} color="#2563EB" /><Text style={styles.heroBadgeText}>Resumen listo</Text></View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Vista de estudio</Text>
              <Text style={[styles.heroDescription, { color: colors.muted }]}>Revisa primero las ideas clave y luego abre la transcripción completa si necesitas más detalle.</Text>
            </View>

            <View style={styles.classActionsRow}>
              <Pressable
                style={styles.classChatButton}
                onPress={() => navigation.navigate('Chatbot', { subjectId, subjectName, classId: item.id, className: item.title })}
              >
                <MessageSquare color="#fff" size={16} />
                <Text style={styles.classChatButtonText}>Preguntar esta clase</Text>
              </Pressable>

              {canManageClass(item) && (
                <>
                  <Pressable style={styles.classIconButton} onPress={() => abrirEditarClase(item)}>
                    <Pencil color="#2563EB" size={16} />
                  </Pressable>
                  <Pressable
                    style={styles.classIconButton}
                    onPress={() => navigation.navigate('Audio', { subjectId, audioNoteId: item.id, audioNoteTitle: item.title })}
                  >
                    <Plus color="#2563EB" size={18} />
                  </Pressable>
                  <Pressable
                    style={[styles.classIconButton, styles.classDangerButton]}
                    onPress={() => eliminarClase(item)}
                  >
                    <Trash2 color="#EF4444" size={16} />
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.summaryGrid}>
              {structuredSummary.map((section, index) => (
                <SummarySectionCard key={`${item.id}-section-${index}`} section={section} colors={colors} />
              ))}
            </View>

            {cleanTranscript ? (
              <View style={styles.section}>
                <Pressable style={styles.transcriptToggle} onPress={() => toggleTranscript(item.id)}>
                  <Text style={styles.transcriptToggleText}>Transcripción literal del audio</Text>
                  <View style={styles.transcriptToggleRight}>
                    <Text style={styles.transcriptToggleHint}>{isTranscriptOpen ? 'Ocultar' : 'Mostrar'}</Text>
                    {isTranscriptOpen ? <ChevronUp color="#2563EB" size={18} /> : <ChevronDown color="#2563EB" size={18} />}
                  </View>
                </Pressable>

                {isTranscriptOpen ? (
                  <View style={styles.transcriptBox}>
                    <Text style={[styles.transcriptText, { color: colors.text }]}>{cleanTranscript}</Text>
                  </View>
                ) : (
                  <Text style={styles.transcriptHelp}>
                    La transcripción está oculta para que el resumen sea más fácil de revisar.
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.actionsPanel, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable style={styles.primaryAction} onPress={() => navigation.navigate('Audio', { subjectId })}>
          <Mic color="#fff" size={17} />
          <Text style={styles.primaryActionText}>Grabar / subir audio</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('Members', { subjectId, subjectName })}>
          <Users color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Integrantes</Text>
        </Pressable>
        <Pressable style={styles.secondaryAction} onPress={() => navigation.navigate('Chatbot', { subjectId, subjectName })}>
          <MessageSquare color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Chat</Text>
        </Pressable>
      </View>

      {resumenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay apuntes en esta materia.</Text>
        </View>
      ) : (
        <FlatList data={resumenes} keyExtractor={(item) => item.id} renderItem={renderResumen} contentContainerStyle={styles.list} />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Audio', { subjectId })}>
        <Plus color="#fff" size={30} />
      </Pressable>

      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar nombre de la clase</Text>
            <TextInput
              style={styles.modalInput}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Ej. Test 1 - Dispositivos móviles"
              placeholderTextColor="#64748B"
            />
            <View style={styles.modalActionsRow}>
              <Pressable style={styles.modalCancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalSaveButton} onPress={guardarNombreClase}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AppBottomBar activeTab="Materias" subjectId={subjectId} />
      <LoadingModal visible={loading} text="Procesando..." />
    </View>
  );
}

function SummarySectionCard({ section, colors }: { section: SummarySection; colors: any }) {
  const Icon = getSectionIcon(section.icon);
  const items = section.items.filter((item) => item.trim().length > 0).slice(0, 8);

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.summaryCardAccent, { backgroundColor: section.accent }]} />
      <View style={styles.summaryCardHeader}>
        <View style={[styles.summaryIconWrap, { backgroundColor: `${section.accent}14` }]}>
          <Icon color={section.accent} size={16} />
        </View>
        <Text style={[styles.summaryCardTitle, { color: colors.text }]}>{section.title}</Text>
      </View>

      {items.length > 0 ? (
        items.map((item, index) => (
          <View key={`${section.title}-${index}`} style={styles.summaryBulletRow}>
            <View style={[styles.summaryBulletDot, { backgroundColor: section.accent }]} />
            <Text style={[styles.summaryBulletText, { color: colors.text }]}>{item}</Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptySectionText, { color: colors.muted }]}>{section.emptyMessage || 'No se detectó información en esta sección.'}</Text>
      )}
    </View>
  );
}

function getSectionIcon(icon: SummarySection['icon']) {
  switch (icon) {
    case 'check':
      return CheckCircle2;
    case 'question':
      return CircleHelp;
    case 'tasks':
      return ClipboardList;
    case 'calendar':
      return CalendarClock;
    case 'tips':
      return Lightbulb;
    case 'book':
    default:
      return BookOpen;
  }
}

function sanitizeDisplayText(text: string): string {
  return (text || '')
    .replace(/\[DATO SENSIBLE ELIMINADO\]/gi, '')
    .replace(/informaci[oó]n sensible (bloqueada|eliminada|omitida)/gi, '')
    .replace(/dato sensible (bloqueado|eliminado|omitido)/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildSummarySections(summary: string, transcript: string, title: string): SummarySection[] {
  const cleanedSummary = cleanRawSummary(summary);
  const parsed = parseMarkdownLikeSections(cleanedSummary);

  if (parsed.length > 0) {
    return parsed;
  }

  return buildFallbackSections(cleanedSummary || transcript, transcript, title);
}

function cleanRawSummary(text: string): string {
  return (text || '')
    .replace(/resumen preliminar generado localmente:?/gi, '')
    .replace(/segmento\s+\d+\s*[·\-:]\s*/gi, '')
    .replace(/#\s*resumen estructurado/gi, '')
    .trim();
}

function parseMarkdownLikeSections(text: string): SummarySection[] {
  if (!text) return [];

  const headingMap: Array<{ matcher: RegExp; title: string; accent: string; icon: SummarySection['icon']; emptyMessage?: string }> = [
    { matcher: /resumen general/i, title: 'Resumen general', accent: '#2563EB', icon: 'book' },
    { matcher: /conceptos clave/i, title: 'Conceptos clave', accent: '#7C3AED', icon: 'check' },
    { matcher: /puntos importantes/i, title: 'Puntos importantes', accent: '#16A34A', icon: 'check' },
    { matcher: /(posibles preguntas|preguntas de prueba|preguntas de examen)/i, title: 'Preguntas para estudiar', accent: '#F59E0B', icon: 'question' },
    { matcher: /refuerzo para aprender/i, title: 'Refuerzo para aprender', accent: '#0EA5E9', icon: 'tips' },
    { matcher: /ejemplos pr[aá]cticos/i, title: 'Ejemplos prácticos', accent: '#22C55E', icon: 'check' },
    { matcher: /tareas detectadas/i, title: 'Tareas detectadas', accent: '#EF4444', icon: 'tasks', emptyMessage: 'No se detectaron tareas.' },
    { matcher: /fecha de entrega detectada/i, title: 'Fecha de entrega', accent: '#0EA5E9', icon: 'calendar', emptyMessage: 'No se detectó fecha de entrega.' },
    { matcher: /recomendaciones de estudio/i, title: 'Recomendaciones de estudio', accent: '#8B5CF6', icon: 'tips' },
  ];

  const lines = text.split(/\n+/).flatMap((line) => {
    const trimmed = line.trim();
    return trimmed ? [trimmed] : [];
  });
  const sections: Array<SummarySection & { raw: string[] }> = [];
  let current: (SummarySection & { raw: string[] }) | null = null;

  for (const line of lines) {
    const normalizedLine = line.replace(/^#+\s*/, '').replace(/[:：]$/, '').trim();
    const match = headingMap.find((item) => item.matcher.test(normalizedLine));

    if (match) {
      current = { ...match, items: [], raw: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { title: 'Resumen general', accent: '#2563EB', icon: 'book', items: [], raw: [] };
      sections.push(current);
    }

    current.raw.push(line);
  }

  return sections.map((section) => ({
    title: section.title,
    accent: section.accent,
    icon: section.icon,
    emptyMessage: section.emptyMessage,
    items: linesToBulletItems(section.raw),
  }));
}

function linesToBulletItems(lines: string[]): string[] {
  const text = lines
    .map((line) => line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  if (lines.some((line) => /^[-*•]|^\d+[.)]/.test(line.trim()))) {
    return lines.flatMap((line) => {
      const item = line.replace(/^[-*•]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
      return item ? [item] : [];
    });
  }

  return splitIntoStudyBullets(text);
}

function splitIntoStudyBullets(text: string, limit = 5): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[-*•]\s*/, '').trim())
    .filter((sentence) => sentence.length > 18)
    .slice(0, limit);
}

function buildFallbackSections(sourceText: string, transcript: string, title: string): SummarySection[] {
  const baseText = sanitizeDisplayText(sourceText || transcript || title);
  const sentences = baseText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 18);

  const resumenGeneral = sentences.slice(0, 3);
  const puntosImportantes = sentences.slice(3, 8);
  const conceptosClave = extractKeyPhrases(baseText, title);
  const preguntas = buildStudyQuestions(title, conceptosClave, puntosImportantes);

  return [
    { title: 'Resumen general', accent: '#2563EB', icon: 'book', items: resumenGeneral.length ? resumenGeneral : ['Se generó un resumen automático de esta clase para una lectura rápida.'] },
    { title: 'Conceptos clave', accent: '#7C3AED', icon: 'check', items: conceptosClave.length ? conceptosClave : ['Revisa la transcripción para identificar conceptos principales.'] },
    { title: 'Puntos importantes', accent: '#16A34A', icon: 'check', items: puntosImportantes.length ? puntosImportantes : ['No se detectaron puntos importantes adicionales.'] },
    { title: 'Preguntas para estudiar', accent: '#F59E0B', icon: 'question', items: preguntas },
    { title: 'Refuerzo para aprender', accent: '#0EA5E9', icon: 'tips', items: ['Relaciona este tema con ejemplos cotidianos y repasa los conceptos que no quedaron claros en la transcripción.'] },
    { title: 'Ejemplos prácticos', accent: '#22C55E', icon: 'check', items: ['Pide al Tutor IA un ejemplo aplicado sobre esta clase para reforzar el aprendizaje.'] },
    { title: 'Tareas detectadas', accent: '#EF4444', icon: 'tasks', items: [], emptyMessage: 'No se detectaron tareas en esta clase.' },
    { title: 'Recomendaciones de estudio', accent: '#8B5CF6', icon: 'tips', items: ['Repasa primero el resumen general y luego abre la transcripción para profundizar.', 'Usa el botón “Preguntar esta clase” para aclarar dudas solo sobre este tema.', 'Si agregas más audios a la clase, el resumen se actualizará con el nuevo contenido.'] },
  ];
}

function extractKeyPhrases(text: string, title: string): string[] {
  const cleaned = `${title}. ${text}`.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s]/g, ' ');
  const tokens = cleaned.split(/\s+/).map((word) => word.trim()).filter((word) => word.length > 4);
  const stopWords = new Set(['sobre', 'desde', 'hasta', 'entre', 'donde', 'porque', 'vamos', 'tener', 'tiene', 'todas', 'todos', 'estas', 'estos', 'clase', 'audio', 'parte', 'puede', 'pueden', 'sería', 'como', 'para', 'este', 'esta', 'primeros', 'pasos', 'resumen']);
  const freq = new Map<string, number>();
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (stopWords.has(key)) continue;
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
}

function buildStudyQuestions(title: string, concepts: string[], points: string[]): string[] {
  const mainConcept = concepts[0] || title;
  const secondary = concepts[1] || 'los conceptos principales';
  const questionSeed = points[0] || title;

  return [
    `¿Qué explica la clase sobre ${mainConcept}?`,
    `¿Cómo se relaciona ${secondary} con el tema principal?`,
    `¿Cuáles fueron las ideas más importantes vistas en esta clase?`,
    `¿Cómo explicarías con tus palabras este punto: ${questionSeed.slice(0, 60)}...?`,
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  actionsPanel: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', padding: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryAction: { flexGrow: 1, height: 50, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  secondaryAction: { height: 50, borderRadius: 16, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 14 },
  secondaryActionText: { color: '#7C3AED', fontWeight: '900', fontSize: 14 },
  list: { padding: 14, paddingBottom: 100 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', padding: 18, alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  fileIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  cardHeaderTextWrap: { flex: 1, marginLeft: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  cardSubtitle: { fontSize: 12.5, color: '#64748B', marginTop: 2, fontWeight: '600' },
  cardContent: { paddingHorizontal: 16, paddingBottom: 18, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  heroBox: { marginTop: 16, backgroundColor: '#F8FAFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#DBEAFE' },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroBadgeText: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
  heroTitle: { marginTop: 12, color: '#0F172A', fontWeight: '900', fontSize: 18 },
  heroDescription: { marginTop: 6, color: '#475569', fontSize: 13.5, lineHeight: 20 },
  classActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 12 },
  classChatButton: { flex: 1, height: 46, borderRadius: 15, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  classChatButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  classIconButton: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  classDangerButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  summaryGrid: { gap: 12 },
  summaryCard: { position: 'relative', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, overflow: 'hidden' },
  summaryCardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  summaryCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 6 },
  summaryIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryCardTitle: { marginLeft: 10, color: '#0F172A', fontWeight: '900', fontSize: 16 },
  summaryBulletRow: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 6, marginBottom: 9 },
  summaryBulletDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7, marginRight: 10 },
  summaryBulletText: { flex: 1, color: '#334155', fontSize: 14.5, lineHeight: 22 },
  emptySectionText: { color: '#64748B', fontSize: 14, lineHeight: 21, paddingLeft: 6 },
  section: { marginTop: 16 },
  transcriptToggle: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transcriptToggleText: { color: '#0F172A', fontWeight: '900', fontSize: 14, flex: 1 },
  transcriptToggleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transcriptToggleHint: { color: '#2563EB', fontWeight: '900', fontSize: 12 },
  transcriptBox: { marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  transcriptText: { color: '#334155', fontSize: 14.5, lineHeight: 23 },
  transcriptHelp: { marginTop: 8, color: '#64748B', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: '#0F172A', fontWeight: '900', fontSize: 20, marginBottom: 12 },
  modalInput: { height: 50, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 14 },
  modalActionsRow: { flexDirection: 'row', gap: 10 },
  modalCancelButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalSaveButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#475569', fontWeight: '900' },
  modalSaveText: { color: '#fff', fontWeight: '900' },
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.18)' },
});
