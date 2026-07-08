import React, { useState } from 'react';
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
import { useThemeMode } from '../shared/theme/ThemeContext';
import { PropsList } from '../navigation/AppNavigator';
import { joinSubjectByTokenUseCase } from '../application/container';

export default function JoinSubjectScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors, isDark } = useThemeMode();
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tarjeta Informativa Superior */}
      <View style={[
        styles.heroCard, 
        { 
          backgroundColor: isDark ? `${colors.primary}15` : '#EEF2FF', 
          borderColor: isDark ? `${colors.primary}35` : '#C7D2FE' 
        }
      ]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
          <QrCode color="#fff" size={28} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Unirme a una materia</Text>
          <Text style={[styles.heroSubtitle, { color: colors.muted }]}>Escanea un QR o pega el enlace compartido por el creador del aula.</Text>
        </View>
      </View>

      {/* Botón de Escáner QR */}
      <TouchableOpacity 
        style={[styles.scanButton, { backgroundColor: colors.primary }]} 
        onPress={openScanner} 
        activeOpacity={0.85}
      >
        <Camera color="#fff" size={20} />
        <Text style={styles.scanButtonText}>Escanear QR</Text>
      </TouchableOpacity>

      {/* Formulario de Entrada Manual */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardTitleRow}>
          <Link2 color={colors.primary} size={18} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Unirme con enlace o token</Text>
        </View>
        <Text style={[styles.helperText, { color: colors.muted }]}>Pega un enlace tipo aulaia://join?token=... o solo el token de invitación.</Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          placeholder="Pega aquí el enlace o token"
          placeholderTextColor={colors.muted}
          value={tokenOrLink}
          onChangeText={setTokenOrLink}
          autoCapitalize="none"
        />
        
        <TouchableOpacity
          style={[
            styles.joinButton, 
            { backgroundColor: colors.primary },
            (!tokenOrLink.trim() || processing) && styles.disabledButton
          ]}
          disabled={!tokenOrLink.trim() || processing}
          onPress={() => joinWithValue(tokenOrLink)}
          activeOpacity={0.85}
        >
          <Text style={styles.joinButtonText}>{processing ? 'Uniendo...' : 'Unirme al aula'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heroCard: { borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontWeight: '900', fontSize: 18 },
  heroSubtitle: { fontWeight: '700', fontSize: 12, lineHeight: 18, marginTop: 3 },
  scanButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginBottom: 14 },
  scanButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontWeight: '900', fontSize: 16 },
  helperText: { fontWeight: '700', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, marginBottom: 14 },
  joinButton: { height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  disabledButton: { opacity: 0.45 },
  joinButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  scanPanel: { position: 'absolute', left: 20, right: 20, bottom: 40, borderRadius: 22, padding: 18, backgroundColor: 'rgba(15,23,42,0.9)', alignItems: 'center' },
  scanTitle: { color: '#fff', fontWeight: '900', fontSize: 18, marginTop: 10 },
  scanText: { color: '#CBD5E1', fontWeight: '700', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 14 },
  cancelButton: { height: 44, borderRadius: 14, backgroundColor: '#fff', paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#0F172A', fontWeight: '900' },
});