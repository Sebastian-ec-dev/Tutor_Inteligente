import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MailPlus, UserRoundCog, Users, X } from 'lucide-react-native';
import LoadingModal from '../components/ui/LoadingModal';
import { PropsList } from '../navigation/AppNavigator';
import {
  inviteClassroomMemberUseCase,
  listClassroomMembersUseCase,
  updateClassroomMemberRoleUseCase,
} from '../application/container';
import {
  CLASSROOM_ROLE_LABELS,
  ClassroomInvite,
  ClassroomMember,
  ClassroomRole,
} from '../domain/entities/ClassroomMember';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const GREEN = '#22C55E';
const ORANGE = '#F59E0B';

const ROLE_OPTIONS: Exclude<ClassroomRole, 'owner'>[] = ['admin', 'teacher', 'student'];

export default function MembersScreen() {
  const route = useRoute<RouteProp<PropsList, 'Members'>>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { subjectId, subjectName } = route.params;

  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [invites, setInvites] = useState<ClassroomInvite[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<ClassroomRole, 'owner'>>('student');
  const [loading, setLoading] = useState(false);

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
      Alert.alert('Invitación registrada', 'El correo quedó guardado en subject_invites con el rol asignado.');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Users color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Integrantes</Text>
          <Text style={styles.heroSubtitle}>{subjectName}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.inviteButton} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
        <MailPlus color="#fff" size={19} />
        <Text style={styles.inviteText}>Agregar amigo / invitar integrante</Text>
      </TouchableOpacity>

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
              <View style={styles.rolePickerWrapper}>
                <Picker
                  selectedValue={item.role}
                  onValueChange={(value) => cambiarRol(item, value)}
                  style={styles.rolePicker}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <Picker.Item key={r} label={CLASSROOM_ROLE_LABELS[r]} value={r} />
                  ))}
                </Picker>
              </View>
            )}
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Invitaciones pendientes</Text>
      <ScrollView style={{ maxHeight: 180 }}>
        {invites.length === 0 ? (
          <Text style={styles.emptyText}>No hay invitaciones pendientes.</Text>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={styles.inviteCard}>
              <Text style={styles.inviteEmail}>{invite.invitedEmail}</Text>
              <Text style={styles.inviteRole}>{CLASSROOM_ROLE_LABELS[invite.role]} · {invite.status}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Invitar integrante</Text>
                <Text style={styles.modalSubtitle}>Agrega amigos por correo y asigna su rol.</Text>
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
              placeholder="amigo@correo.com"
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
  inviteButton: { height: 50, borderRadius: 16, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 16 },
  inviteText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  sectionTitle: { color: TEXT, fontWeight: '900', fontSize: 16, marginBottom: 8, marginTop: 4 },
  emptyText: { color: MUTED, fontWeight: '700', textAlign: 'center', padding: 14 },
  memberCard: { backgroundColor: '#fff', borderRadius: 17, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  memberName: { color: TEXT, fontWeight: '900', fontSize: 13 },
  memberEmail: { color: MUTED, fontWeight: '700', fontSize: 11, marginTop: 2 },
  roleBadge: { color: GREEN, fontWeight: '900', fontSize: 11, marginTop: 4 },
  rolePickerWrapper: { width: 118, height: 42, borderWidth: 1, borderColor: BORDER, borderRadius: 12, overflow: 'hidden', backgroundColor: BG, justifyContent: 'center' },
  rolePicker: { width: 128, height: 42 },
  inviteCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 12, marginBottom: 8 },
  inviteEmail: { color: TEXT, fontWeight: '900' },
  inviteRole: { color: ORANGE, fontWeight: '800', fontSize: 11, marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.42)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  modalTitle: { color: TEXT, fontWeight: '900', fontSize: 21 },
  modalSubtitle: { color: MUTED, fontWeight: '700', fontSize: 12, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  label: { color: MUTED, fontSize: 12, fontWeight: '900', marginBottom: 7, marginTop: 6 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', paddingHorizontal: 14, color: TEXT, marginBottom: 12 },
  pickerWrapper: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', overflow: 'hidden', marginBottom: 16 },
  picker: { height: 52, width: '100%' },
  createButton: { height: 50, borderRadius: 15, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
