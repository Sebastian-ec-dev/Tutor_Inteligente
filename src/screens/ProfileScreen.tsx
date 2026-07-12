import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  BookOpen,
  CircleHelp,
  GraduationCap,
  LogOut,
  Mail,
  Moon,
  QrCode,
  Save,
  Sun,
  User,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { PropsList } from '../navigation/AppNavigator';
import { UserProfile } from '../domain/entities/Profile';
import { SubjectMembership, CLASSROOM_ROLE_LABELS } from '../domain/entities/ClassroomMember';
import {
  getProfileUseCase,
  listMyMembershipsUseCase,
  updateProfileUseCase,
  logoutUseCase,
} from '../application/container';
import { useAppTheme } from '../components/ui/ThemeContext';
import { resetOnboardingTutorial } from '../components/tutorial/OnboardingTutorial';

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const theme = useAppTheme();
  const { colors, isDark, toggleMode } = theme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [university, setUniversity] = useState('');
  const [memberships, setMemberships] = useState<SubjectMembership[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
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

  async function saveProfile() {
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

  async function replayTutorial() {
    try {
      await resetOnboardingTutorial();
      navigation.navigate('Home', { showTutorial: true });
    } catch (error: any) {
      Alert.alert('Tutorial', error.message || 'No se pudo reiniciar la guía.');
    }
  }

  function closeSession() {
    Alert.alert('Cerrar sesión', '¿Desea salir de AulaIA?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await logoutUseCase.execute();
          } catch (error: any) {
            Alert.alert('Error', error.message || String(error));
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <User color="#fff" size={30} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{displayName || 'Mi perfil'}</Text>
            <Text style={styles.heroSubtitle}>{profile?.email || 'Correo no disponible'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.appearanceRow}>
            <View style={styles.appearanceIcon}>
              {isDark ? <Moon color={colors.purple} size={21} /> : <Sun color={colors.primary} size={21} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitleNoMargin}>Modo nocturno</Text>
              <Text style={styles.helperText}>
                {isDark ? 'Tema oscuro activado' : 'Tema claro activado'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => toggleMode()}
              trackColor={{ false: '#CBD5E1', true: '#6D5BD0' }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Datos personales</Text>

          <View style={styles.fieldHeader}>
            <User color={colors.muted} size={16} />
            <Text style={styles.label}>Nombre visible</Text>
          </View>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Ej. Mateo Andrade"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.fieldHeader}>
            <GraduationCap color={colors.muted} size={16} />
            <Text style={styles.label}>Universidad / Instituto</Text>
          </View>
          <TextInput
            style={styles.input}
            value={university}
            onChangeText={setUniversity}
            placeholder="Ej. Universidad Central del Ecuador"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.infoRow}>
            <Mail color={colors.primary} size={16} />
            <Text style={styles.infoText}>{profile?.email || 'correo no encontrado'}</Text>
          </View>

          <Pressable style={styles.saveButton} onPress={saveProfile}>
            <Save color="#fff" size={18} />
            <Text style={styles.saveText}>Guardar cambios</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <CircleHelp color={colors.primary} size={19} />
            <Text style={styles.sectionTitleNoMargin}>Guía de la aplicación</Text>
          </View>
          <Text style={styles.helperText}>
            Revisa nuevamente qué hace cada opción principal de AulaIA.
          </Text>
          <Pressable
            style={styles.tutorialButton}
            onPress={replayTutorial}
          >
            <CircleHelp color="#fff" size={18} />
            <Text style={styles.tutorialText}>Volver a ver el tutorial</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Users color={colors.purple} size={19} />
            <Text style={styles.sectionTitleNoMargin}>Aulas, amigos y roles</Text>
          </View>
          <Text style={styles.helperText}>
            Las materias compartidas e integrantes se administran desde cada materia.
          </Text>

          <Pressable style={styles.joinButton} onPress={() => navigation.navigate('JoinSubject')}>
            <QrCode color="#fff" size={18} />
            <Text style={styles.joinText}>Unirme con QR o enlace</Text>
          </Pressable>

          {memberships.length === 0 ? (
            <View style={styles.emptyBox}>
              <BookOpen color={colors.muted} size={30} />
              <Text style={styles.emptyText}>Todavía no perteneces a aulas compartidas.</Text>
            </View>
          ) : (
            <FlatList
              data={memberships}
              keyExtractor={(item) => `${item.subjectId}-${item.role}`}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.membershipCard}>
                  <View style={[styles.subjectDot, { backgroundColor: item.color || colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.membershipTitle}>{item.subjectName}</Text>
                    <Text style={styles.membershipRole}>{CLASSROOM_ROLE_LABELS[item.role]}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={closeSession}>
          <LogOut color={colors.danger} size={18} />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>

        <LoadingModal visible={loading} text="Cargando perfil..." />
      </ScrollView>
      <AppBottomBar activeTab="Profile" />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: { flexGrow: 1, padding: 16, paddingBottom: 30 },
    heroCard: {
      backgroundColor: colors.soft,
      borderRadius: 22,
      borderWidth: 1.3,
      borderColor: colors.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
    heroSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 2 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1.3,
      borderColor: colors.border,
      marginBottom: 14,
    },
    appearanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    appearanceIcon: {
      width: 45,
      height: 45,
      borderRadius: 15,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 14 },
    sectionTitleNoMargin: { color: colors.text, fontSize: 16, fontWeight: '900' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    helperText: { color: colors.muted, fontSize: 11.5, lineHeight: 17, marginTop: 3 },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7, marginTop: 6 },
    label: { color: colors.muted, fontSize: 12, fontWeight: '900' },
    input: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.input,
      paddingHorizontal: 14,
      fontSize: 14,
      color: colors.text,
      marginBottom: 10,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: colors.primarySoft,
      borderRadius: 14,
      marginTop: 4,
      marginBottom: 14,
    },
    infoText: { color: colors.primary, fontWeight: '800', fontSize: 12 },
    saveButton: {
      height: 50,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    saveText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    tutorialButton: {
      minHeight: 48,
      borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 13,
    },
    tutorialText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    joinButton: {
      minHeight: 48,
      borderRadius: 15,
      backgroundColor: colors.purple,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      marginTop: 13,
      marginBottom: 12,
    },
    joinText: { color: '#fff', fontSize: 13, fontWeight: '900' },
    emptyBox: { alignItems: 'center', padding: 18, borderRadius: 15, backgroundColor: colors.soft },
    emptyText: { color: colors.muted, fontSize: 11.5, marginTop: 8, textAlign: 'center' },
    membershipCard: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    subjectDot: { width: 7, height: 37, borderRadius: 99 },
    membershipTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
    membershipRole: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
    logoutButton: {
      minHeight: 50,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.card,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    logoutText: { color: colors.danger, fontSize: 13, fontWeight: '900' },
  });
}
