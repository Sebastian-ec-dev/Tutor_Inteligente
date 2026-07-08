import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, ChevronRight, MessageSquare, Mic, Plus, Search, Sparkles } from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import LoadingModal from '../components/ui/LoadingModal';
import { AudioNote } from '../domain/entities/AudioNote';
import { Subject } from '../domain/entities/Subject';
import { getProfileUseCase, listAudioNotesUseCase, listSubjectsUseCase } from '../application/container';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#16A34A';

type RecentClass = {
  note: AudioNote;
  subject: Subject;
};

export default function HomeDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const appTheme = useAppTheme();
  const colors = appTheme.colors;
  const [displayName, setDisplayName] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentClasses, setRecentClasses] = useState<RecentClass[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarHome);
    return unsubscribe;
  }, [navigation]);

  async function cargarHome() {
    try {
      setLoading(true);
      const [profile, materias] = await Promise.all([
        getProfileUseCase.execute(),
        listSubjectsUseCase.execute(),
      ]);

      setDisplayName(profile.displayName || profile.email?.split('@')[0] || '');
      setSubjects(materias);

      const allClassesNested = await Promise.all(
        materias.map(async (subject) => {
          try {
            const notes = await listAudioNotesUseCase.execute(subject.id);
            return notes.map((note) => ({ note, subject }));
          } catch {
            return [];
          }
        }),
      );

      const allClasses = allClassesNested
        .flat()
        .sort((a, b) => new Date(b.note.createdAt || 0).getTime() - new Date(a.note.createdAt || 0).getTime());

      setRecentClasses(allClasses.slice(0, 8));
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  const filteredClasses = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return recentClasses;

    return recentClasses.filter(({ note, subject }) => {
      const values = [note.title, subject.name, subject.teacher || '', subject.description || ''];
      return values.some((value) => value.toLowerCase().includes(query));
    });
  }, [recentClasses, search]);

  const continueClass = filteredClasses[0] || recentClasses[0];

  function goRecord() {
    const subjectId = subjects[0]?.id;
    if (!subjectId) {
      Alert.alert('Primero crea una materia', 'Necesitas una materia para grabar o subir una clase.');
      return;
    }

    navigation.navigate('Audio', { subjectId });
  }

  function goResumen(item: RecentClass) {
    navigation.navigate('Resumen', {
      subjectId: item.subject.id,
      subjectName: item.subject.name,
    });
  }

  function goChat(item: RecentClass) {
    navigation.navigate('Chatbot', {
      subjectId: item.subject.id,
      subjectName: item.subject.name,
      classId: item.note.id,
      className: item.note.title,
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>Hola{displayName ? `, ${displayName}` : ''} 👋</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>¿Qué clase quieres estudiar hoy?</Text>

          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Search size={17} color={MUTED} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Buscar materia, clase o docente..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        <View style={styles.quickStatsRow}>
          <MiniInfoCard label="Materias" value={String(subjects.length)} color={BLUE} bg={colors.card} border={colors.border} text={colors.muted} />
          <MiniInfoCard label="Clases" value={String(recentClasses.length)} color={PURPLE} bg={colors.card} border={colors.border} text={colors.muted} />
          <MiniInfoCard label="Tutor IA" value="Activo" color={GREEN} bg={colors.card} border={colors.border} text={colors.muted} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Continuar estudiando</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Último avance</Text>
        </View>

        {continueClass ? (
          <View style={[styles.continueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.continueTopRow}>
              <View style={[styles.continueIcon, { backgroundColor: `${continueClass.subject.color || BLUE}22` }]}>
                <Text style={styles.continueEmoji}>{continueClass.subject.icon || '📘'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.continueTitle, { color: colors.text }]}>{continueClass.note.title}</Text>
                <Text style={[styles.continueSubject, { color: colors.muted }]}>{continueClass.subject.name}</Text>
              </View>
              <ChevronRight color={MUTED} size={20} />
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusBadge}>Resumen listo</Text>
              <Text style={styles.statusBadgeBlue}>Chat activo</Text>
            </View>

            <View style={styles.continueActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => goResumen(continueClass)}>
                <BookOpen size={16} color={BLUE} />
                <Text style={styles.secondaryButtonText}>Ver resumen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={() => goChat(continueClass)}>
                <MessageSquare size={16} color="#fff" />
                <Text style={styles.primaryButtonText}>Preguntar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.emptyContinueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Sparkles color={PURPLE} size={30} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Aún no hay clases procesadas</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Graba o sube tu primera clase para generar resumen y chat contextual.</Text>
            <TouchableOpacity style={styles.primaryButtonLarge} onPress={goRecord}>
              <Mic color="#fff" size={18} />
              <Text style={styles.primaryButtonText}>Grabar primera clase</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Acciones rápidas</Text>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Materias')}>
            <Plus color={BLUE} size={22} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>Nueva materia</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={goRecord}>
            <Mic color={PURPLE} size={22} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>Grabar clase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('Chatbot')}>
            <MessageSquare color={GREEN} size={22} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>Tutor IA</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Últimas clases</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Materias')}>
            <Text style={styles.seeAll}>Ver materias</Text>
          </TouchableOpacity>
        </View>

        {filteredClasses.length === 0 ? (
          <Text style={styles.emptyListText}>No hay clases recientes todavía.</Text>
        ) : (
          filteredClasses.slice(0, 5).map((item) => (
            <TouchableOpacity key={item.note.id} style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => goResumen(item)} activeOpacity={0.86}>
              <View style={[styles.recentDot, { backgroundColor: item.subject.color || BLUE }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentTitle, { color: colors.text }]}>{item.note.title}</Text>
                <Text style={[styles.recentSubject, { color: colors.muted }]}>{item.subject.name}</Text>
              </View>
              <TouchableOpacity style={styles.askSmallButton} onPress={() => goChat(item)}>
                <MessageSquare color={BLUE} size={16} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <AppBottomBar activeTab="Home" subjectId={subjects[0]?.id} />
      <LoadingModal visible={loading} text="Cargando inicio..." />
    </View>
  );
}

function MiniInfoCard({ value, label, color, bg, border, text }: { value: string; label: string; color: string; bg: string; border: string; text: string }) {
  return (
    <View style={[styles.miniInfoCard, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.miniInfoValue, { color }]}>{value}</Text>
      <Text style={[styles.miniInfoLabel, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  container: { padding: 16, paddingBottom: 4 },
  header: { marginBottom: 14 },
  greeting: { color: TEXT, fontSize: 27, fontWeight: '900' },
  subtitle: { color: MUTED, fontSize: 14, fontWeight: '700', marginTop: 2 },
  searchBox: { marginTop: 16, height: 48, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
  quickStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  miniInfoCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 14 },
  miniInfoValue: { fontSize: 21, fontWeight: '900' },
  miniInfoLabel: { color: MUTED, fontSize: 12, fontWeight: '800', marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionTitle: { color: TEXT, fontSize: 18, fontWeight: '900' },
  sectionHint: { color: MUTED, fontSize: 12, fontWeight: '800' },
  continueCard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 18 },
  continueTopRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  continueIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  continueEmoji: { fontSize: 28 },
  continueTitle: { color: TEXT, fontSize: 17, fontWeight: '900', lineHeight: 23 },
  continueSubject: { color: MUTED, fontSize: 13, fontWeight: '800', marginTop: 3 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statusBadge: { color: PURPLE, backgroundColor: '#F5F3FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  statusBadgeBlue: { color: BLUE, backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 11, fontWeight: '900' },
  continueActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryButton: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  secondaryButtonText: { color: BLUE, fontWeight: '900', fontSize: 12 },
  primaryButton: { flex: 1, height: 42, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  primaryButtonLarge: { height: 46, borderRadius: 15, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginTop: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  emptyContinueCard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: BORDER, padding: 18, alignItems: 'center', marginBottom: 18 },
  emptyTitle: { color: TEXT, fontWeight: '900', fontSize: 16, marginTop: 8 },
  emptyText: { color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 5 },
  actionsGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionCard: { flex: 1, minHeight: 84, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10 },
  actionTitle: { color: TEXT, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  seeAll: { color: BLUE, fontWeight: '900', fontSize: 12 },
  recentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, padding: 13, marginBottom: 10 },
  recentDot: { width: 10, height: 42, borderRadius: 999 },
  recentTitle: { color: TEXT, fontWeight: '900', fontSize: 14 },
  recentSubject: { color: MUTED, fontWeight: '700', fontSize: 12, marginTop: 2 },
  askSmallButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center' },
  emptyListText: { color: MUTED, fontWeight: '700', textAlign: 'center', marginVertical: 14 },
  bottomSpace: { height: 10 },
});
