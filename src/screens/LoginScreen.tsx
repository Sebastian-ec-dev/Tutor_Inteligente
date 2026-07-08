import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import LoadingModal from '../components/ui/LoadingModal';
import { loginUseCase, registerUseCase } from '../application/container';

type AuthMode = 'welcome' | 'login' | 'register';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

export default function LoginScreen() {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    university: '',
  });

  function goTo(nextMode: AuthMode) {
    setMode(nextMode);
    setShowPass(false);
    setShowConfirmPass(false);
  }

  async function iniciarSesion() {
    try {
      setLoading(true);
      await loginUseCase.execute(loginForm.email, loginForm.password);
    } catch (error: any) {
      Alert.alert('Error al iniciar sesión', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  async function crearCuenta() {
    try {
      if (!registerForm.displayName.trim()) {
        Alert.alert('Validación', 'Ingrese su nombre completo');
        return;
      }

      if (registerForm.password !== registerForm.confirmPassword) {
        Alert.alert('Validación', 'Las contraseñas no coinciden');
        return;
      }

      setLoading(true);
      await registerUseCase.execute(registerForm.email, registerForm.password, {
        displayName: registerForm.displayName,
        university: registerForm.university,
      });

      Alert.alert(
        'Usuario creado',
        'La cuenta se registró en Supabase Auth. Si tu proyecto exige confirmación de correo, confirma el email antes de iniciar sesión.',
      );
      setLoginForm({ email: registerForm.email, password: '' });
      setRegisterForm({ displayName: '', email: '', password: '', confirmPassword: '', university: '' });
      goTo('login');
    } catch (error: any) {
      Alert.alert('Error al crear usuario', error.message || String(error));
    } finally {
      setLoading(false);
    }
  }

  function googlePendiente() {
    Alert.alert(
      'Google pendiente',
      'El botón está visible como en el prototipo de Figma Maker, pero todavía no se conectó OAuth de Google en Supabase.',
    );
  }

  if (mode === 'welcome') {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeHero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>A</Text>
          </View>
          <Text style={styles.welcomeTitle}>AulaIA</Text>
          <Text style={styles.welcomeSubtitle}>Tu tutor inteligente por materia</Text>
        </View>

        <View style={styles.welcomePanel}>
          <Text style={styles.panelTitle}>Convierte tus clases en conocimiento inteligente</Text>
          <Text style={styles.panelText}>
            Graba, transcribe, resume y pregunta a un tutor IA entrenado con tus propias clases.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => goTo('login')}>
            <Text style={styles.primaryButtonText}>Comenzar</Text>
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => goTo('login')}>
            <Text style={styles.linkButtonText}>Ya tengo cuenta</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isLoginMode = mode === 'login';
  const loginDisabled = loading || !loginForm.email.trim() || !loginForm.password.trim();
  const registerDisabled =
    loading ||
    !registerForm.displayName.trim() ||
    !registerForm.email.trim() ||
    !registerForm.password.trim() ||
    !registerForm.confirmPassword.trim();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Pressable style={styles.backButton} onPress={() => goTo('welcome')} disabled={loading}>
          <ArrowLeft size={22} color={TEXT} />
        </Pressable>

        <Text style={styles.brand}>AulaIA</Text>
        <Text style={styles.title}>{isLoginMode ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        <Text style={styles.subtitle}>
          {isLoginMode
            ? 'Accede a tus materias y clases grabadas.'
            : 'Registra tu perfil académico.'}
        </Text>

        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, isLoginMode && styles.tabActive]}
            onPress={() => goTo('login')}
            disabled={loading}
          >
            <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>Iniciar sesión</Text>
          </Pressable>
          <Pressable
            style={[styles.tab, !isLoginMode && styles.tabActive]}
            onPress={() => goTo('register')}
            disabled={loading}
          >
            <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>Crear usuario</Text>
          </Pressable>
        </View>

        {isLoginMode ? (
          <View>
            <FieldLabel text="Correo electrónico" />
            <TextInput
              style={styles.input}
              placeholder="correo@universidad.edu"
              value={loginForm.email}
              onChangeText={(email) => setLoginForm((prev) => ({ ...prev, email }))}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <FieldLabel text="Contraseña" />
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                value={loginForm.password}
                onChangeText={(password) => setLoginForm((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
              </Pressable>
            </View>

            <Pressable onPress={() => Alert.alert('Pendiente', 'Primero hay que activar recuperación de contraseña en Supabase Auth.')}>
              <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
            </Pressable>

            <Pressable
              style={[styles.primaryButton, loginDisabled && styles.disabledButton]}
              onPress={iniciarSesion}
              disabled={loginDisabled}
            >
              <Text style={styles.primaryButtonText}>Ingresar</Text>
            </Pressable>

            <Pressable style={styles.googleButton} onPress={googlePendiente} disabled={loading}>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>Continuar con Google</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <FieldLabel text="Nombre completo" />
            <TextInput
              style={styles.input}
              placeholder="Mateo Andrade"
              value={registerForm.displayName}
              onChangeText={(displayName) => setRegisterForm((prev) => ({ ...prev, displayName }))}
              editable={!loading}
            />

            <FieldLabel text="Correo" />
            <TextInput
              style={styles.input}
              placeholder="correo@universidad.edu"
              value={registerForm.email}
              onChangeText={(email) => setRegisterForm((prev) => ({ ...prev, email }))}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <FieldLabel text="Contraseña" />
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Mínimo 6 caracteres"
                value={registerForm.password}
                onChangeText={(password) => setRegisterForm((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
              </Pressable>
            </View>

            <FieldLabel text="Confirmar contraseña" />
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Repite la contraseña"
                value={registerForm.confirmPassword}
                onChangeText={(confirmPassword) => setRegisterForm((prev) => ({ ...prev, confirmPassword }))}
                secureTextEntry={!showConfirmPass}
                editable={!loading}
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPass(!showConfirmPass)}>
                {showConfirmPass ? <EyeOff size={18} color={MUTED} /> : <Eye size={18} color={MUTED} />}
              </Pressable>
            </View>

            <FieldLabel text="Universidad / Instituto" />
            <TextInput
              style={styles.input}
              placeholder="Universidad Central del Ecuador"
              value={registerForm.university}
              onChangeText={(university) => setRegisterForm((prev) => ({ ...prev, university }))}
              editable={!loading}
            />

            <Pressable
              style={[styles.primaryButton, registerDisabled && styles.disabledButton]}
              onPress={crearCuenta}
              disabled={registerDisabled}
            >
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            </Pressable>

            <Text style={styles.termsText}>
              Al crear una cuenta aceptas el uso responsable de grabaciones académicas.
            </Text>
          </View>
        )}
      </ScrollView>
      <LoadingModal visible={loading} text="Procesando..." />
    </KeyboardAvoidingView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  welcomeContainer: { flex: 1, backgroundColor: BLUE },
  welcomeHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  logoCircle: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  logoLetter: { fontSize: 42, fontWeight: '900', color: '#fff' },
  welcomeTitle: { fontSize: 34, fontWeight: '900', color: '#fff' },
  welcomeSubtitle: { fontSize: 14, color: '#DBEAFE', marginTop: 4, fontWeight: '600' },
  welcomePanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },
  panelTitle: { fontSize: 25, lineHeight: 32, fontWeight: '900', color: TEXT, marginBottom: 12 },
  panelText: { fontSize: 14, lineHeight: 22, color: MUTED, marginBottom: 24 },
  container: { flex: 1, backgroundColor: BG },
  scrollContent: { padding: 24, paddingTop: 48 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 18,
  },
  brand: { fontSize: 27, fontWeight: '900', color: BLUE, marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: TEXT, marginBottom: 6 },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 24 },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#E9EEF8', borderRadius: 16, padding: 4, marginBottom: 22 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 13, alignItems: 'center' },
  tabActive: { backgroundColor: BLUE },
  tabText: { color: MUTED, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  label: { fontSize: 12, fontWeight: '800', color: MUTED, marginBottom: 7, marginTop: 2 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    fontSize: 14,
    color: TEXT,
    marginBottom: 15,
  },
  passwordWrapper: { position: 'relative', marginBottom: 15 },
  passwordInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 14,
    color: TEXT,
  },
  eyeButton: { position: 'absolute', right: 14, top: 16 },
  forgotText: { textAlign: 'right', color: BLUE, fontWeight: '800', fontSize: 12, marginBottom: 24 },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    boxShadow: '0px 5px 12px rgba(37, 99, 235, 0.22)',
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  linkButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkButtonText: { color: BLUE, fontWeight: '900', fontSize: 14 },
  googleButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  googleG: { color: PURPLE, fontWeight: '900', fontSize: 18, marginRight: 10 },
  googleText: { color: TEXT, fontSize: 14, fontWeight: '800' },
  termsText: { color: MUTED, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 2 },
});
