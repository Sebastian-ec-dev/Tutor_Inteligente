import React, { useMemo, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// @ts-ignore - instalar con: npx expo install expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Link2, QrCode } from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import AppBottomBar from '../components/ui/AppBottomBar';
import { useAppTheme } from '../components/ui/ThemeContext';
import { joinSubjectByTokenUseCase } from '../application/container';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

export default function JoinSubjectScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(false);
  const [tokenOrLink, setTokenOrLink] = useState('');
  const [processing, setProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);

  async function joinWithValue(value: string) {
    if (processing) return;
    try {
      setProcessing(true);
      const result = await joinSubjectByTokenUseCase.execute(value);
      Alert.alert('Listo', result.message || 'Te uniste correctamente al aula.');
      navigation.navigate('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
      setScanned(false);
    } finally {
      setProcessing(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permiso requerido', 'Activa la cámara para escanear el QR del aula.');
        return;
      }
    }
    setScanned(false);
    setScanMode(true);
  }

  function handleBarcodeScanned(event: { data: string }) {
    if (scanned || processing) return;
    setScanned(true);
    setScanMode(false);
    joinWithValue(event.data);
  }

  if (scanMode) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.scanPanel}>
          <QrCode color="#fff" size={34} />
          <Text style={styles.scanTitle}>Escanea el QR del aula</Text>
          <Text style={styles.scanText}>Apunta la cámara al código generado por el creador o administrador.</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setScanMode(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <QrCode color="#fff" size={28} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>Unirme a una materia</Text>
          <Text style={styles.heroSubtitle}>Escanea un QR o pega el enlace compartido por el creador del aula.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.scanButton} onPress={openScanner} activeOpacity={0.85}>
        <Camera color="#fff" size={20} />
        <Text style={styles.scanButtonText}>Escanear QR</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Link2 color={colors.purple} size={18} />
          <Text style={styles.cardTitle}>Unirme con enlace o token</Text>
        </View>
        <Text style={styles.helperText}>Pega un enlace tipo aulaia://join?token=... o solo el token de invitación.</Text>
        <TextInput
          style={styles.input}
          placeholder="Pega aquí el enlace o token"
          placeholderTextColor={colors.muted}
          value={tokenOrLink}
          onChangeText={setTokenOrLink}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.joinButton, (!tokenOrLink.trim() || processing) && styles.disabledButton]}
          disabled={!tokenOrLink.trim() || processing}
          onPress={() => joinWithValue(tokenOrLink)}
          activeOpacity={0.85}
        >
          <Text style={styles.joinButtonText}>{processing ? 'Uniendo...' : 'Unirme al aula'}</Text>
        </TouchableOpacity>
      </View>
      <AppBottomBar activeTab="Subjects" />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  heroCard: { backgroundColor: colors.soft, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontWeight: '900', fontSize: 18 },
  heroSubtitle: { color: colors.muted, fontWeight: '700', fontSize: 12, lineHeight: 18, marginTop: 3 },
  scanButton: { height: 52, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 14 },
  scanButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  helperText: { color: colors.muted, fontWeight: '700', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, color: colors.text, marginBottom: 14 },
  joinButton: { height: 50, borderRadius: 15, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  joinButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  scanPanel: { position: 'absolute', left: 20, right: 20, bottom: 40, borderRadius: 22, padding: 18, backgroundColor: 'rgba(15,23,42,0.9)', alignItems: 'center' },
  scanTitle: { color: '#fff', fontWeight: '900', fontSize: 18, marginTop: 10 },
  scanText: { color: '#CBD5E1', fontWeight: '700', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  cancelButton: { height: 44, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.text, fontWeight: '900' },
  });
}
