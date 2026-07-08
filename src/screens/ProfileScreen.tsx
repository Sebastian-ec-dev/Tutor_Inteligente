import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  Switch,
} from 'react-native';
import { User, Save, Users, Mail, GraduationCap, BookOpen, QrCode, Moon, Sun } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import { PropsList } from '../navigation/AppNavigator';
import { UserProfile } from '../domain/entities/Profile';
import { SubjectMembership, CLASSROOM_ROLE_LABELS } from '../domain/entities/ClassroomMember';
import {
  getProfileUseCase,
  listMyMembershipsUseCase,
  updateProfileUseCase,
} from '../application/container';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#22C55E';
const ORANGE = '#F59E0B';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [memberships, setMemberships] = useState<SubjectMembership[]>([]);
  const [loading, setLoading] = useState(false);
  const appTheme = useAppTheme();
  const darkMode = appTheme.isDark;
  const colors = appTheme.colors;
  const theme = {
    bg: colors.background,
    card: colors.card,
    soft: colors.soft,
    text: colors.text,
    muted: colors.muted,
    border: colors.border,
  };

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    try {
      setLoading(true);
      const [profileData, membershipData] = await Promise.all([
        getProfileUseCase.execute(),
        listMyMembershipsUseCase.execute(),
      ]);
      setProfile(profileData);
      setDisplayName(profileData.displayName || '');
      setUniversity(profileData.university || '');
      setMemberships(membershipData);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function guardarPerfil() {
    try {
      setLoading(true);
      const updated = await updateProfileUseCase.execute({ displayName, university });
      setProfile(updated);
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron en public.profiles.');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}> 
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.heroCard, { backgroundColor: theme.soft, borderColor: theme.border }]}>
        <View style={styles.avatar}>
          <User color="#fff" size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: theme.text }]}>{displayName || 'Mi perfil'}</Text>
          <Text style={[styles.heroSubtitle, { color: theme.muted }]}>{profile?.email || 'Correo no disponible'}</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Datos personales</Text>

        <View style={styles.fieldHeader}>
          <User color={MUTED} size={16} />
          <Text style={styles.label}>Nombre visible</Text>
        </View>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ej. Mateo Andrade"
          placeholderTextColor={MUTED}
        />

        <View style={styles.fieldHeader}>
          <GraduationCap color={MUTED} size={16} />
          <Text style={styles.label}>Universidad / Instituto</Text>
        </View>
        <TextInput
          style={styles.input}
          value={university}
          onChangeText={setUniversity}
          placeholder="Ej. Universidad Central del Ecuador"
          placeholderTextColor={MUTED}
        />

        <View style={styles.infoRow}>
          <Mail color={BLUE} size={16} />
          <Text style={styles.infoText}>{profile?.email || 'correo no encontrado'}</Text>
        </View>

        <Pressable style={styles.saveButton} onPress={guardarPerfil}>
          <Save color="#fff" size={18} />
          <Text style={styles.saveText}>Guardar cambios</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.titleRow}>
          {darkMode ? <Moon color={BLUE} size={19} /> : <Sun color={ORANGE} size={19} />}
          <Text style={[styles.sectionTitleNoMargin, { color: theme.text }]}>Descanso visual</Text>
        </View>
        <Text style={[styles.helperText, { color: theme.muted }]}>
          Activa el modo noche para reducir brillo cuando estudies por la noche.
        </Text>
        <View style={[styles.settingRow, { backgroundColor: theme.soft, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Modo noche</Text>
            <Text style={[styles.settingSubtitle, { color: theme.muted }]}>Interfaz más oscura para descansar la vista.</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={appTheme.toggleMode}
            thumbColor={darkMode ? BLUE : '#F8FAFC'}
            trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.titleRow}>
          <Users color={PURPLE} size={19} />
          <Text style={[styles.sectionTitleNoMargin, { color: theme.text }]}>Aulas, amigos y roles</Text>
        </View>
        <Text style={styles.helperText}>
          Aquí ves las materias compartidas donde participas. Los amigos/integrantes se agregan desde la opción “Integrantes” dentro de cada materia.
        </Text>

        <Pressable style={styles.joinButton} onPress={() => navigation.navigate('JoinSubject')}>
          <QrCode color="#fff" size={18} />
          <Text style={styles.joinText}>Unirme con QR o enlace</Text>
        </Pressable>

        {memberships.length === 0 ? (
          <View style={styles.emptyBox}>
            <BookOpen color={MUTED} size={30} />
            <Text style={styles.emptyText}>Todavía no perteneces a aulas compartidas.</Text>
          </View>
        ) : (
          <FlatList
            data={memberships}
            keyExtractor={(item) => `${item.subjectId}-${item.role}`}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.membershipCard}>
                <View style={[styles.subjectDot, { backgroundColor: item.color || BLUE }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.membershipTitle}>{item.subjectName}</Text>
                  <Text style={styles.membershipRole}>{CLASSROOM_ROLE_LABELS[item.role]}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      </ScrollView>
      <AppBottomBar activeTab="Profile" />
      <LoadingModal visible={loading} text="Cargando perfil..." />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: BG, padding: 16, paddingBottom: 30 },
  heroCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: TEXT, fontSize: 19, fontWeight: '900' },
  heroSubtitle: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: BORDER, marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '900', marginBottom: 14 },
  sectionTitleNoMargin: { color: TEXT, fontSize: 16, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 6 },
  label: { color: MUTED, fontSize: 12, fontWeight: '900' },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, paddingHorizontal: 14, fontSize: 14, color: TEXT, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 14, marginTop: 4, marginBottom: 14 },
  infoText: { color: BLUE, fontWeight: '800', fontSize: 12 },
  saveButton: { height: 50, borderRadius: 15, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  helperText: { color: MUTED, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  joinButton: { height: 48, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  joinText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  emptyBox: { borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, padding: 18, alignItems: 'center' },
  emptyText: { color: MUTED, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  membershipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderColor: BORDER, borderRadius: 15, marginBottom: 8, backgroundColor: BG },
  subjectDot: { width: 12, height: 36, borderRadius: 10 },
  membershipTitle: { color: TEXT, fontWeight: '900', fontSize: 14 },
  membershipRole: { color: GREEN, fontWeight: '900', fontSize: 11, marginTop: 2 },
  settingRow: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  settingTitle: { fontWeight: '900', fontSize: 14 },
  settingSubtitle: { fontWeight: '600', fontSize: 12, marginTop: 3, maxWidth: 200 },
});
