import React, { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
// @ts-ignore - instalar con: npx expo install expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Link2, QrCode } from 'lucide-react-native';
import { PropsList } from '../navigation/AppNavigator';
import { joinSubjectByTokenUseCase } from '../application/container';
import AppBottomBar from '../components/ui/AppBottomBar';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

export default function JoinSubjectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanMode, setScanMode] = useState(false);
  const [tokenOrLink, setTokenOrLink] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannedRef = useRef(false);

  async function joinWithValue(value: string) {
    if (processing) return;
    try {
      setProcessing(true);
      const result = await joinSubjectByTokenUseCase.execute(value);
      Alert.alert('Listo', result.message || 'Te uniste correctamente al aula.');
      navigation.navigate('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || String(error));
      scannedRef.current = false;
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
    scannedRef.current = false;
    setScanMode(true);
  }

  function handleBarcodeScanned(event: { data: string }) {
    if (scannedRef.current || processing) return;
    scannedRef.current = true;
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
          <Pressable style={styles.cancelButton} onPress={() => setScanMode(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
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

      <Pressable style={styles.scanButton} onPress={openScanner}>
        <Camera color="#fff" size={20} />
        <Text style={styles.scanButtonText}>Escanear QR</Text>
      </Pressable>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Link2 color={PURPLE} size={18} />
          <Text style={styles.cardTitle}>Unirme con enlace o token</Text>
        </View>
        <Text style={styles.helperText}>Pega un enlace tipo aulaia://join?token=... o solo el token de invitación.</Text>
        <TextInput
          style={styles.input}
          placeholder="Pega aquí el enlace o token"
          placeholderTextColor={MUTED}
          value={tokenOrLink}
          onChangeText={setTokenOrLink}
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.joinButton, (!tokenOrLink.trim() || processing) && styles.disabledButton]}
          disabled={!tokenOrLink.trim() || processing}
          onPress={() => joinWithValue(tokenOrLink)}
        >
          <Text style={styles.joinButtonText}>{processing ? 'Uniendo...' : 'Unirme al aula'}</Text>
        </Pressable>
      </View>
      </View>
      <AppBottomBar activeTab="Materias" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, padding: 16 },
  heroCard: { backgroundColor: '#EEF2FF', borderRadius: 22, borderWidth: 1, borderColor: '#C7D2FE', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: TEXT, fontWeight: '900', fontSize: 18 },
  heroSubtitle: { color: MUTED, fontWeight: '700', fontSize: 12, lineHeight: 18, marginTop: 3 },
  scanButton: { height: 52, borderRadius: 16, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 14 },
  scanButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: TEXT, fontWeight: '900', fontSize: 16 },
  helperText: { color: MUTED, fontWeight: '700', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: BORDER, backgroundColor: BG, paddingHorizontal: 14, color: TEXT, marginBottom: 14 },
  joinButton: { height: 50, borderRadius: 15, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  joinButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  scanPanel: { position: 'absolute', left: 20, right: 20, bottom: 40, borderRadius: 22, padding: 18, backgroundColor: 'rgba(15,23,42,0.9)', alignItems: 'center' },
  scanTitle: { color: '#fff', fontWeight: '900', fontSize: 18, marginTop: 10 },
  scanText: { color: '#CBD5E1', fontWeight: '700', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  cancelButton: { height: 44, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: TEXT, fontWeight: '900' },
});
