import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import LoadingModal from '../components/ui/LoadingModal';
import { useAppTheme } from '../components/ui/ThemeContext';
import { loginUseCase, registerUseCase } from '../application/container';

type AuthMode = 'welcome' | 'login' | 'register';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const BG = '#F8FAFC';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';

export default function LoginScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          <TouchableOpacity style={styles.primaryButton} onPress={() => goTo('login')}>
            <Text style={styles.primaryButtonText}>Comenzar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => goTo('login')}>
            <Text style={styles.linkButtonText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.backButton} onPress={() => goTo('welcome')} disabled={loading}>
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.brand}>AulaIA</Text>
        <Text style={styles.title}>{isLoginMode ? 'Iniciar sesión' : 'Crear cuenta'}</Text>
        <Text style={styles.subtitle}>
          {isLoginMode
            ? 'Accede a tus materias y clases grabadas.'
            : 'Registra tu perfil académico.'}
        </Text>

        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, isLoginMode && styles.tabActive]}
            onPress={() => goTo('login')}
            disabled={loading}
          >
            <Text style={[styles.tabText, isLoginMode && styles.tabTextActive]}>Iniciar sesión</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, !isLoginMode && styles.tabActive]}
            onPress={() => goTo('register')}
            disabled={loading}
          >
            <Text style={[styles.tabText, !isLoginMode && styles.tabTextActive]}>Crear usuario</Text>
          </TouchableOpacity>
        </View>

        {isLoginMode ? (
          <View>
            <FieldLabel text="Correo electrónico" />
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.muted}
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
                placeholderTextColor={colors.muted}
                placeholder="••••••••"
                value={loginForm.password}
                onChangeText={(password) => setLoginForm((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => Alert.alert('Pendiente', 'Primero hay que activar recuperación de contraseña en Supabase Auth.')}>
              <Text style={styles.forgotText}>Olvidé mi contraseña</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loginDisabled && styles.disabledButton]}
              onPress={iniciarSesion}
              disabled={loginDisabled}
            >
              <Text style={styles.primaryButtonText}>Ingresar</Text>
            </TouchableOpacity>

          </View>
        ) : (
          <View>
            <FieldLabel text="Nombre completo" />
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.muted}
              placeholder="Mateo Andrade"
              value={registerForm.displayName}
              onChangeText={(displayName) => setRegisterForm((prev) => ({ ...prev, displayName }))}
              editable={!loading}
            />

            <FieldLabel text="Correo" />
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.muted}
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
                placeholderTextColor={colors.muted}
                placeholder="Mínimo 6 caracteres"
                value={registerForm.password}
                onChangeText={(password) => setRegisterForm((prev) => ({ ...prev, password }))}
                secureTextEntry={!showPass}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPass(!showPass)}>
                {showPass ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
              </TouchableOpacity>
            </View>

            <FieldLabel text="Confirmar contraseña" />
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholderTextColor={colors.muted}
                placeholder="Repite la contraseña"
                value={registerForm.confirmPassword}
                onChangeText={(confirmPassword) => setRegisterForm((prev) => ({ ...prev, confirmPassword }))}
                secureTextEntry={!showConfirmPass}
                editable={!loading}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPass(!showConfirmPass)}>
                {showConfirmPass ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
              </TouchableOpacity>
            </View>

            <FieldLabel text="Universidad / Instituto" />
            <TextInput
              style={styles.input}
              placeholderTextColor={colors.muted}
              placeholder="Universidad Central del Ecuador"
              value={registerForm.university}
              onChangeText={(university) => setRegisterForm((prev) => ({ ...prev, university }))}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.primaryButton, registerDisabled && styles.disabledButton]}
              onPress={crearCuenta}
              disabled={registerDisabled}
            >
              <Text style={styles.primaryButtonText}>Crear cuenta</Text>
            </TouchableOpacity>

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
  const { colors } = useAppTheme();
  return (
    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 7, marginTop: 2 }}>
      {text}
    </Text>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
  welcomeContainer: { flex: 1, backgroundColor: colors.primary },
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
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 30,
  },
  panelTitle: { fontSize: 25, lineHeight: 32, fontWeight: '900', color: colors.text, marginBottom: 12 },
  panelText: { fontSize: 14, lineHeight: 22, color: colors.muted, marginBottom: 24 },
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24, paddingTop: 48 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  brand: { fontSize: 27, fontWeight: '900', color: colors.primary, marginBottom: 18 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted, marginBottom: 24 },
  tabsContainer: { flexDirection: 'row', backgroundColor: colors.input, borderRadius: 16, padding: 4, marginBottom: 22 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 13, alignItems: 'center' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.muted, fontWeight: '800' },
  tabTextActive: { color: '#fff' },
  label: { fontSize: 12, fontWeight: '800', color: colors.muted, marginBottom: 7, marginTop: 2 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text,
    marginBottom: 15,
  },
  passwordWrapper: { position: 'relative', marginBottom: 15 },
  passwordInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingLeft: 16,
    paddingRight: 48,
    fontSize: 14,
    color: colors.text,
  },
  eyeButton: { position: 'absolute', right: 14, top: 16 },
  forgotText: { textAlign: 'right', color: colors.primary, fontWeight: '800', fontSize: 12, marginBottom: 24 },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  disabledButton: { opacity: 0.55 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  linkButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
  linkButtonText: { color: colors.primary, fontWeight: '900', fontSize: 14 },
  termsText: { color: colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 2 },
  });
}
