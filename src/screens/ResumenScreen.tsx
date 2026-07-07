import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PropsList } from '../navigation/AppNavigator';
import { FileAudio, Plus, ChevronDown, ChevronUp, Mic, Users, MessageSquare, Pencil, Trash2 } from 'lucide-react-native';
import Markdown from 'react-native-markdown-display';
import LoadingModal from '../components/ui/LoadingModal';
import { AudioNote } from '../domain/entities/AudioNote';
import { deleteAudioNoteUseCase, listAudioNotesUseCase, updateAudioNoteUseCase } from '../application/container';
import { supabase } from '../infrastructure/supabase/supabaseClient';

export default function ResumenScreen() {
  const route = useRoute<RouteProp<PropsList, 'Resumen'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId, subjectName } = route.params;
  const [resumenes, setResumenes] = useState<AudioNote[]>([]);
  const [resumenId, setResumenId] = useState<string | null>(null);
  const [transcriptId, setTranscriptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [myRole, setMyRole] = useState<string>('student');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<AudioNote | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
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
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function cargarPermisos() {
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
  }

  function canManageClass(item: AudioNote): boolean {
    return item.userId === currentUserId || ['owner', 'admin', 'teacher'].includes(myRole);
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
      await updateAudioNoteUseCase.execute({ id: editingClass.id, title: editingTitle });
      setEditModalVisible(false);
      setEditingClass(null);
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

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpandir(item.id)}
        >
          <View style={styles.cardTitleRow}>
            <FileAudio color="#007AFF" size={24} />
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          {isExpanded ? (
            <ChevronUp color="#666" />
          ) : (
            <ChevronDown color="#666" />
          )}
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.cardContent}>
            <View style={styles.classActionsRow}>
              <TouchableOpacity
                style={styles.classChatButton}
                onPress={() => navigation.navigate('Chatbot', { subjectId, subjectName, classId: item.id, className: item.title })}
                activeOpacity={0.85}
              >
                <MessageSquare color="#fff" size={16} />
                <Text style={styles.classChatButtonText}>Preguntar esta clase</Text>
              </TouchableOpacity>

              {canManageClass(item) && (
                <>
                  <TouchableOpacity
                    style={styles.classIconButton}
                    onPress={() => abrirEditarClase(item)}
                    activeOpacity={0.85}
                  >
                    <Pencil color="#2563EB" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.classIconButton}
                    onPress={() => navigation.navigate('Audio', { subjectId, audioNoteId: item.id, audioNoteTitle: item.title })}
                    activeOpacity={0.85}
                  >
                    <Plus color="#2563EB" size={18} />
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
                  <Text style={styles.transcriptToggleText}>Transcripción literal del audio</Text>
                  <View style={styles.transcriptToggleRight}>
                    <Text style={styles.transcriptToggleHint}>{isTranscriptOpen ? 'Ocultar' : 'Mostrar'}</Text>
                    {isTranscriptOpen ? <ChevronUp color="#2563EB" size={18} /> : <ChevronDown color="#2563EB" size={18} />}
                  </View>
                </TouchableOpacity>

                {isTranscriptOpen ? (
                  <View style={styles.transcriptBox}>
                    <Markdown style={markdownStyles}>{cleanTranscript}</Markdown>
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
    <View style={styles.container}>

      <View style={styles.actionsPanel}>
        <TouchableOpacity style={styles.primaryAction} onPress={() => navigation.navigate('Audio', { subjectId })}>
          <Mic color="#fff" size={17} />
          <Text style={styles.primaryActionText}>Grabar / subir audio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('Members', { subjectId, subjectName })}>
          <Users color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Integrantes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={() => navigation.navigate('Chatbot', { subjectId, subjectName })}>
          <MessageSquare color="#7C3AED" size={17} />
          <Text style={styles.secondaryActionText}>Chat</Text>
        </TouchableOpacity>
      </View>

      {resumenes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay apuntes en esta materia.</Text>
        </View>
      ) : (
        <FlatList
          data={resumenes}
          keyExtractor={(item) => item.id}
          renderItem={renderResumen}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Audio', { subjectId })}
      >
        <Plus color="#fff" size={30} />
      </TouchableOpacity>
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
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={guardarNombreClase}>
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
  return (text || '')
    .replace(/\[DATO SENSIBLE ELIMINADO\]/gi, '')
    .replace(/informaci[oó]n sensible (bloqueada|eliminada|omitida)/gi, '')
    .replace(/dato sensible (bloqueado|eliminado|omitido)/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  actionsPanel: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', padding: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryAction: { flexGrow: 1, height: 44, borderRadius: 13, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 },
  primaryActionText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  secondaryAction: { height: 44, borderRadius: 13, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 10 },
  secondaryActionText: { color: '#7C3AED', fontWeight: '900', fontSize: 12 },
  list: { padding: 15 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardTitle: {
    fontSize: 18,
    marginLeft: 15,
    fontWeight: '500',
    color: '#333',
    flexShrink: 1,
  },
  cardContent: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  section: { marginTop: 15 },
  transcriptToggle: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptToggleText: { color: '#0F172A', fontWeight: '900', fontSize: 14, flex: 1 },
  transcriptToggleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  transcriptToggleHint: { color: '#2563EB', fontWeight: '900', fontSize: 12 },
  transcriptBox: { marginTop: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  transcriptHelp: { marginTop: 8, color: '#64748B', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  classActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 4 },
  classChatButton: { flex: 1, height: 42, borderRadius: 13, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  classChatButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  classIconButton: { width: 42, height: 42, borderRadius: 13, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  classDangerButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalTitle: { color: '#0F172A', fontWeight: '900', fontSize: 20, marginBottom: 12 },
  modalInput: { height: 50, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 14 },
  modalActionsRow: { flexDirection: 'row', gap: 10 },
  modalCancelButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  modalSaveButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: '#475569', fontWeight: '900' },
  modalSaveText: { color: '#fff', fontWeight: '900' },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15.5,
    lineHeight: 24,
    color: '#444',
  },
  heading1: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#222',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#222',
  },
  strong: { fontWeight: 'bold', color: '#222' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginVertical: 6 },
  ordered_list: { marginVertical: 6 },
  list_item: { marginVertical: 4 },
  paragraph: { marginVertical: 8 },
});
