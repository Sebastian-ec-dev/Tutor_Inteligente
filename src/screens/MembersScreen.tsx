import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// @ts-ignore - instalar con: npm install react-native-qrcode-svg
import QRCode from 'react-native-qrcode-svg';
import { Link, MailPlus, QrCode, Share2, Trash2, UserRoundCog, Users, X } from 'lucide-react-native';
import LoadingModal from '../components/ui/LoadingModal';
import AppBottomBar from '../components/ui/AppBottomBar';
import { PropsList } from '../navigation/AppNavigator';
import {
  createJoinInviteUseCase,
  deleteClassroomInviteUseCase,
  inviteClassroomMemberUseCase,
  listClassroomMembersUseCase,
  removeClassroomMemberUseCase,
  updateClassroomMemberRoleUseCase,
} from '../application/container';
import {
  CLASSROOM_ROLE_LABELS,
  ClassroomInvite,
  ClassroomMember,
  ClassroomRole,
} from '../domain/entities/ClassroomMember';
import { buildSubjectInviteLink } from '../shared/inviteLinks';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#22C55E';
const ORANGE = '#F59E0B';
const RED = '#EF4444';

const ROLE_OPTIONS: Exclude<ClassroomRole, 'owner'>[] = ['admin', 'teacher', 'student'];

export default function MembersScreen() {
  const route = useRoute<RouteProp<PropsList, 'Members'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId, subjectName } = route.params;

  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [invites, setInvites] = useState<ClassroomInvite[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<ClassroomRole, 'owner'>>('student');
  const [joinInvite, setJoinInvite] = useState<ClassroomInvite | null>(null);
  const [loading, setLoading] = useState(false);

  const joinLink = useMemo(() => {
    if (!joinInvite?.token) return '';
    return buildSubjectInviteLink(joinInvite.token);
  }, [joinInvite]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', cargarIntegrantes);
    return unsubscribe;
  }, [navigation]);

  async function cargarIntegrantes() {
    try {
      setLoading(true);
      const data = await listClassroomMembersUseCase.execute(subjectId);
      setMembers(data.members);
      setInvites(data.invites);

      const reusableInvite = data.invites.find((item) => item.inviteType === 'qr' || item.inviteType === 'link');
      if (reusableInvite?.token) setJoinInvite(reusableInvite);
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function enviarInvitacion() {
    try {
      setLoading(true);
      await inviteClassroomMemberUseCase.execute({ subjectId, invitedEmail: email, role });
      setEmail('');
      setRole('student');
      setModalVisible(false);
      await cargarIntegrantes();
      Alert.alert('Invitación registrada', 'El estudiante quedó guardado como invitación pendiente.');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function generarQrOEnlace() {
    try {
      setLoading(true);
      const invite = joinInvite?.token
        ? joinInvite
        : await createJoinInviteUseCase.execute({ subjectId, role: 'student', maxUses: 50, inviteType: 'qr' });

      setJoinInvite(invite);
      setQrVisible(true);
      await cargarIntegrantes();
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function compartirEnlace() {
    try {
      const invite = joinInvite?.token
        ? joinInvite
        : await createJoinInviteUseCase.execute({ subjectId, role: 'student', maxUses: 50, inviteType: 'link' });

      setJoinInvite(invite);
      const link = buildSubjectInviteLink(invite.token || '');
      await Share.share({
        message: `Únete a la materia "${subjectName}" en AulaIA: ${link}`,
      });
      await cargarIntegrantes();
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    }
  }

  async function cambiarRol(member: ClassroomMember, nextRole: Exclude<ClassroomRole, 'owner'>) {
    if (member.role === 'owner') return;
    try {
      setLoading(true);
      await updateClassroomMemberRoleUseCase.execute({
        subjectId,
        memberUserId: member.userId,
        role: nextRole,
      });
      await cargarIntegrantes();
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function eliminarIntegrante(member: ClassroomMember) {
    if (member.role === 'owner') {
      Alert.alert('Acción no permitida', 'No se puede eliminar al creador del aula.');
      return;
    }

    Alert.alert('Eliminar integrante', `¿Eliminar a ${member.displayName || member.email || 'este usuario'} del aula?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await removeClassroomMemberUseCase.execute({ subjectId, memberUserId: member.userId });
            await cargarIntegrantes();
          } catch (error: any) {
            Alert.alert('Error', error.message || String(error));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  async function eliminarInvitacion(invite: ClassroomInvite) {
    Alert.alert('Eliminar invitación', `¿Eliminar la invitación de ${invite.invitedEmail}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteClassroomInviteUseCase.execute(invite.id);
            if (joinInvite?.id === invite.id) setJoinInvite(null);
            await cargarIntegrantes();
          } catch (error: any) {
            Alert.alert('Error', error.message || String(error));
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Users color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Integrantes del aula</Text>
          <Text style={styles.heroSubtitle}>{subjectName}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.inviteButton} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
          <MailPlus color="#fff" size={18} />
          <Text style={styles.inviteText}>Agregar estudiante</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={generarQrOEnlace} activeOpacity={0.85}>
          <QrCode color={PURPLE} size={18} />
          <Text style={styles.outlineText}>QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.outlineButton} onPress={compartirEnlace} activeOpacity={0.85}>
          <Share2 color={PURPLE} size={18} />
          <Text style={styles.outlineText}>Enlace</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Miembros del aula</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay integrantes registrados todavía.</Text>}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <UserRoundCog color={BLUE} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{item.displayName || item.email || 'Usuario registrado'}</Text>
              <Text style={styles.memberEmail}>{item.email || item.userId}</Text>
              <Text style={styles.roleBadge}>{CLASSROOM_ROLE_LABELS[item.role]}</Text>
            </View>
            {item.role !== 'owner' && (
              <View style={styles.memberActions}>
                <View style={styles.rolePickerWrapper}>
                  <Picker selectedValue={item.role} onValueChange={(value) => cambiarRol(item, value)} style={styles.rolePicker}>
                    {ROLE_OPTIONS.map((r) => (
                      <Picker.Item key={r} label={CLASSROOM_ROLE_LABELS[r]} value={r} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity style={styles.deleteMemberButton} onPress={() => eliminarIntegrante(item)}>
                  <Trash2 color={RED} size={17} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Invitaciones pendientes</Text>
      <ScrollView style={{ maxHeight: 190 }}>
        {invites.length === 0 ? (
          <Text style={styles.emptyText}>No hay invitaciones pendientes.</Text>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inviteEmail}>{invite.invitedEmail}</Text>
                <Text style={styles.inviteRole}>
                  {CLASSROOM_ROLE_LABELS[invite.role]} · {invite.status} · {invite.inviteType || 'email'}
                  {invite.maxUses ? ` · ${invite.usesCount || 0}/${invite.maxUses} usos` : ''}
                </Text>
              </View>
              <TouchableOpacity style={styles.deleteInviteButton} onPress={() => eliminarInvitacion(invite)}>
                <Trash2 color={RED} size={16} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Agregar estudiante</Text>
                <Text style={styles.modalSubtitle}>Invita por correo y asigna su rol.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                <X size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Correo del invitado</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="estudiante@correo.com"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor={MUTED}
            />

            <Text style={styles.label}>Rol dentro del aula</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={role} onValueChange={(value) => setRole(value)} style={styles.picker}>
                {ROLE_OPTIONS.map((r) => (
                  <Picker.Item key={r} label={CLASSROOM_ROLE_LABELS[r]} value={r} />
                ))}
              </Picker>
            </View>

            <TouchableOpacity style={styles.createButton} onPress={enviarInvitacion} activeOpacity={0.85}>
              <Text style={styles.createButtonText}>Guardar invitación</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={qrVisible} transparent animationType="slide" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>QR para unirse</Text>
                <Text style={styles.modalSubtitle}>Los estudiantes se unirán como Estudiante.</Text>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={() => setQrVisible(false)}>
                <X size={20} color={TEXT} />
              </TouchableOpacity>
            </View>

            {joinLink ? (
              <View style={styles.qrBox}>
                <QRCode value={joinLink} size={220} />
              </View>
            ) : null}
            <Text style={styles.linkText}>{joinLink || 'Generando enlace...'}</Text>

            <TouchableOpacity style={styles.createButton} onPress={compartirEnlace} activeOpacity={0.85}>
              <Share2 color="#fff" size={18} />
              <Text style={styles.createButtonText}>Compartir enlace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppBottomBar activeTab="Materias" subjectId={subjectId} />
      <LoadingModal visible={loading} text="Actualizando integrantes..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  heroCard: { backgroundColor: '#EEF2FF', borderRadius: 20, borderWidth: 1, borderColor: '#C7D2FE', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: TEXT, fontWeight: '900', fontSize: 18 },
  heroSubtitle: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  inviteButton: { flex: 1.4, height: 50, borderRadius: 16, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  inviteText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  outlineButton: { flex: 0.8, height: 50, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  outlineText: { color: PURPLE, fontWeight: '900', fontSize: 12 },
  sectionTitle: { color: TEXT, fontWeight: '900', fontSize: 16, marginBottom: 8, marginTop: 4 },
  emptyText: { color: MUTED, fontWeight: '700', textAlign: 'center', padding: 14 },
  memberCard: { backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  memberName: { color: TEXT, fontWeight: '900', fontSize: 13 },
  memberEmail: { color: MUTED, fontWeight: '700', fontSize: 11, marginTop: 2 },
  roleBadge: { color: GREEN, fontWeight: '900', fontSize: 11, marginTop: 4 },
  memberActions: { alignItems: 'flex-end', gap: 6 },
  rolePickerWrapper: { width: 118, height: 42, borderWidth: 1, borderColor: BORDER, borderRadius: 12, overflow: 'hidden', backgroundColor: BG, justifyContent: 'center' },
  rolePicker: { width: 128, height: 42 },
  deleteMemberButton: { width: 38, height: 34, borderRadius: 11, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', alignItems: 'center', justifyContent: 'center' },
  inviteCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteEmail: { color: TEXT, fontWeight: '900' },
  inviteRole: { color: ORANGE, fontWeight: '800', fontSize: 11, marginTop: 3 },
  deleteInviteButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  qrCard: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, alignItems: 'stretch' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  modalTitle: { color: TEXT, fontWeight: '900', fontSize: 21 },
  modalSubtitle: { color: MUTED, fontWeight: '700', fontSize: 12, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  label: { color: MUTED, fontSize: 12, fontWeight: '900', marginBottom: 7, marginTop: 6 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', paddingHorizontal: 14, color: TEXT, marginBottom: 12 },
  pickerWrapper: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 16 },
  picker: { height: 52, width: '100%' },
  createButton: { height: 50, borderRadius: 15, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  createButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  qrBox: { alignSelf: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 12 },
  linkText: { color: MUTED, fontWeight: '700', textAlign: 'center', fontSize: 12, lineHeight: 18, marginBottom: 14 },
});
