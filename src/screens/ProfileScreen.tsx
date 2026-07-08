import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { User, Save, Users, Mail, GraduationCap, BookOpen, QrCode } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LoadingModal from '../components/ui/LoadingModal';
import { useThemeMode } from '../shared/theme/ThemeContext';
import { PropsList } from '../navigation/AppNavigator';
import { UserProfile } from '../domain/entities/Profile';
import { SubjectMembership, CLASSROOM_ROLE_LABELS } from '../domain/entities/ClassroomMember';
import {
  getProfileUseCase,
  listMyMembershipsUseCase,
  updateProfileUseCase,
} from '../application/container';

const GREEN = '#22C55E';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors, isDark } = useThemeMode();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [memberships, setMemberships] = useState<SubjectMembership[]>([]);
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabecera / Hero Card */}
      <View style={[
        styles.heroCard, 
        { 
          backgroundColor: isDark ? `${colors.primary}15` : '#EEF2FF', 
          borderColor: isDark ? `${colors.primary}35` : '#C7D2FE' 
        }
      ]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <User color="#fff" size={30} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{displayName || 'Mi perfil'}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>{profile?.email || 'Correo no disponible'}</Text>
        </View>
      </View>

      {/* Sección: Datos Personales */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Datos personales</Text>

        <View style={styles.fieldHeader}>
          <User color={colors.muted} size={16} />
          <Text style={[styles.label, { color: colors.muted }]}>Nombre visible</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ej. Mateo Andrade"
          placeholderTextColor={colors.muted}
        />

        <View style={styles.fieldHeader}>
          <GraduationCap color={colors.muted} size={16} />
          <Text style={[styles.label, { color: colors.muted }]}>Universidad / Instituto</Text>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={university}
          onChangeText={setUniversity}
          placeholder="Ej. Universidad Central del Ecuador"
          placeholderTextColor={colors.muted}
        />

        <View style={[styles.infoRow, { backgroundColor: isDark ? `${colors.primary}15` : '#EFF6FF' }]}>
          <Mail color={colors.primary} size={16} />
          <Text style={[styles.infoText, { color: colors.primary }]}>{profile?.email || 'correo no encontrado'}</Text>
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={guardarPerfil} activeOpacity={0.85}>
          <Save color="#fff" size={18} />
          <Text style={styles.saveText}>Guardar cambios</Text>
        </TouchableOpacity>
      </View>

      {/* Sección: Aulas e Integración */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Users color={colors.primary} size={19} />
          <Text style={[styles.sectionTitleNoMargin, { color: colors.text }]}>Aulas, amigos y roles</Text>
        </View>
        <Text style={[styles.helperText, { color: colors.muted }]}>
          Aquí ves las materias compartidas donde participas. Los amigos/integrantes se agregan desde la opción “Integrantes” dentro de cada materia.
        </Text>

        <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={() => navigation.navigate('JoinSubject')} activeOpacity={0.85}>
          <QrCode color="#fff" size={18} />
          <Text style={styles.joinText}>Unirme con QR o enlace</Text>
        </TouchableOpacity>

        {memberships.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <BookOpen color={colors.muted} size={30} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Todavía no perteneces a aulas compartidas.</Text>
          </View>
        ) : (
          <FlatList
            data={memberships}
            keyExtractor={(item) => `${item.subjectId}-${item.role}`}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={[styles.membershipCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <View style={[styles.subjectDot, { backgroundColor: item.color || colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.membershipTitle, { color: colors.text }]}>{item.subjectName}</Text>
                  <Text style={styles.membershipRole}>{CLASSROOM_ROLE_LABELS[item.role]}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <LoadingModal visible={loading} text="Cargando perfil..." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 30 },
  heroCard: { borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 19, fontWeight: '900' },
  heroSubtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 14 },
  sectionTitleNoMargin: { fontSize: 16, fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 6 },
  label: { fontSize: 12, fontWeight: '900' },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginTop: 4, marginBottom: 14 },
  infoText: { fontWeight: '800', fontSize: 12 },
  saveButton: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  helperText: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  joinButton: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 12 },
  joinText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 18, alignItems: 'center' },
  emptyText: { fontWeight: '700', textAlign: 'center', marginTop: 8 },
  membershipCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderRadius: 15, marginBottom: 8 },
  subjectDot: { width: 12, height: 36, borderRadius: 10 },
  membershipTitle: { fontWeight: '900', fontSize: 14 },
  membershipRole: { color: GREEN, fontWeight: '900', fontSize: 11, marginTop: 2 },
});