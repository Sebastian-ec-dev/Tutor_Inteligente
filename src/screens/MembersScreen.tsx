import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
// @ts-ignore - instalar con: npm install react-native-qrcode-svg
import QRCode from "react-native-qrcode-svg";
import {
  QrCode,
  Share2,
  Trash2,
  UserRoundCog,
  Users,
  X,
} from "lucide-react-native";
import LoadingModal from "../components/ui/LoadingModal";
import { useThemeMode } from "../shared/theme/ThemeContext";
import { PropsList } from "../navigation/AppNavigator";
import {
  createJoinInviteUseCase,
  deleteClassroomInviteUseCase,
  listClassroomMembersUseCase,
  removeClassroomMemberUseCase,
} from "../application/container";
import {
  CLASSROOM_ROLE_LABELS,
  ClassroomInvite,
  ClassroomMember,
} from "../domain/entities/ClassroomMember";
import { buildSubjectInviteLink } from "../shared/inviteLinks";

const RED = "#EF4444";
const ORANGE = "#F59E0B";

export default function MembersScreen() {
  const route = useRoute<RouteProp<PropsList, "Members" | "MembersScreen">>();
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors, isDark } = useThemeMode();
  const { subjectId, subjectName } = route.params;

  const [members, setMembers] = useState<ClassroomMember[]>([]);
  const [invites, setInvites] = useState<ClassroomInvite[]>([]);
  const [qrVisible, setQrVisible] = useState(false);
  const [joinInvite, setJoinInvite] = useState<ClassroomInvite | null>(null);
  const [loading, setLoading] = useState(false);

  const joinLink = useMemo(() => {
    if (!joinInvite?.token) return "";
    return buildSubjectInviteLink(joinInvite.token);
  }, [joinInvite]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", cargarIntegrantes);
    return unsubscribe;
  }, [navigation]);

  async function cargarIntegrantes() {
    try {
      setLoading(true);
      const data = await listClassroomMembersUseCase.execute(subjectId);
      setMembers(data.members);
      setInvites(data.invites);

      const reusableInvite = data.invites.find(
        (item) => item.inviteType === "qr" || item.inviteType === "link",
      );
      if (reusableInvite?.token) setJoinInvite(reusableInvite);
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function generarQrOEnlace() {
    try {
      setLoading(true);
      const invite = joinInvite?.token
        ? joinInvite
        : await createJoinInviteUseCase.execute({
            subjectId,
            role: "student",
            maxUses: 50,
            inviteType: "qr",
          });

      setJoinInvite(invite);
      setQrVisible(true);
      await cargarIntegrantes();
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function compartirEnlace() {
    try {
      const invite = joinInvite?.token
        ? joinInvite
        : await createJoinInviteUseCase.execute({
            subjectId,
            role: "student",
            maxUses: 50,
            inviteType: "link",
          });

      setJoinInvite(invite);
      const link = buildSubjectInviteLink(invite.token || "");
      await Share.share({
        message: `Únete a la materia "${subjectName}" en AulaIA: ${link}`,
      });
      await cargarIntegrantes();
    } catch (error: any) {
      Alert.alert("Error", error.message || String(error));
    }
  }

  async function eliminarInvitacion(invite: ClassroomInvite) {
    Alert.alert(
      "Eliminar invitación",
      `¿Eliminar la invitación de ${invite.invitedEmail}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await deleteClassroomInviteUseCase.execute(invite.id);
              if (joinInvite?.id === invite.id) setJoinInvite(null);
              await cargarIntegrantes();
            } catch (error: any) {
              Alert.alert("Error", error.message || String(error));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tarjeta Identificadora Superior */}
      <View style={[
        styles.heroCard, 
        { 
          backgroundColor: isDark ? `${colors.primary}15` : '#EEF2FF', 
          borderColor: isDark ? `${colors.primary}35` : '#C7D2FE' 
        }
      ]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
          <Users color="#fff" size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Integrantes del aula</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>{subjectName}</Text>
        </View>
      </View>

      {/* Fila de acciones para la gestión */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.outlineButton, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#DDD6FE' }]}
          onPress={generarQrOEnlace}
          activeOpacity={0.85}
        >
          <QrCode color={colors.primary} size={18} />
          <Text style={[styles.outlineText, { color: colors.primary }]}>QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.outlineButton, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#DDD6FE' }]}
          onPress={compartirEnlace}
          activeOpacity={0.85}
        >
          <Share2 color={colors.primary} size={18} />
          <Text style={[styles.outlineText, { color: colors.primary }]}>Enlace</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Miembros del aula</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            No hay integrantes registrados todavía.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[styles.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.memberAvatar, { backgroundColor: isDark ? `${colors.primary}15` : '#EFF6FF' }]}>
              <UserRoundCog color={colors.primary} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {item.displayName || item.email || "Usuario registrado"}
              </Text>
              <Text style={[styles.memberEmail, { color: colors.muted }]}>
                {item.email || item.userId}
              </Text>
            </View>
          </View>
        )}
      />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Invitaciones pendientes</Text>
      <ScrollView style={{ maxHeight: 190 }}>
        {invites.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>No hay invitaciones pendientes.</Text>
        ) : (
          invites.map((invite) => (
            <View key={invite.id} style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteEmail, { color: colors.text }]}>{invite.invitedEmail}</Text>
                <Text style={[styles.inviteRole, { color: ORANGE }]}>
                  {CLASSROOM_ROLE_LABELS[invite.role]} · {invite.status} ·{" "}
                  {invite.inviteType || "email"}
                  {invite.maxUses
                    ? ` · ${invite.usesCount || 0}/${invite.maxUses} usos`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteInviteButton}
                onPress={() => eliminarInvitacion(invite)}
              >
                <Trash2 color={RED} size={16} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal del Código QR Dinámico */}
      <Modal
        visible={qrVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setQrVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.qrCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>QR para unirse</Text>
                <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                  Los estudiantes se unirán como Estudiante.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setQrVisible(false)}
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {joinLink ? (
              <View style={[styles.qrBox, { borderColor: colors.border }]}>
                <QRCode value={joinLink} size={220} backgroundColor="#fff" color="#000" />
              </View>
            ) : null}
            <Text style={[styles.linkText, { color: colors.muted }]}>
              {joinLink || "Generando enlace..."}
            </Text>

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={compartirEnlace}
              activeOpacity={0.85}
            >
              <Share2 color="#fff" size={18} />
              <Text style={styles.createButtonText}>Compartir enlace</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={loading} text="Actualizando integrantes..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heroCard: { borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontWeight: "900", fontSize: 18 },
  heroSubtitle: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  actionsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  outlineButton: { flex: 1, height: 50, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 5 },
  outlineText: { fontWeight: "900", fontSize: 14 },
  sectionTitle: { fontWeight: "900", fontSize: 16, marginBottom: 8, marginTop: 4 },
  emptyText: { fontWeight: "700", textAlign: "center", padding: 14 },
  memberCard: { borderRadius: 17, borderWidth: 1, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  memberName: { fontWeight: "900", fontSize: 13 },
  memberEmail: { fontWeight: "700", fontSize: 11, marginTop: 2 },
  inviteCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  inviteEmail: { fontWeight: "900" },
  inviteRole: { fontWeight: "800", fontSize: 11, marginTop: 3 },
  deleteInviteButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.55)", justifyContent: "flex-end" },
  qrCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, alignItems: "stretch" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  modalTitle: { fontWeight: "900", fontSize: 21 },
  modalSubtitle: { fontWeight: "700", fontSize: 12, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  createButton: { height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  createButtonText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  qrBox: { alignSelf: "center", backgroundColor: "#fff", padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  linkText: { fontWeight: "700", textAlign: "center", fontSize: 12, lineHeight: 18, marginBottom: 14 },
});