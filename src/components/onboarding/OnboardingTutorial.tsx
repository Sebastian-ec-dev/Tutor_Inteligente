import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  MessageSquare,
  Mic,
  Sparkles,
} from 'lucide-react-native';
import { useAppTheme } from '../ui/ThemeContext';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const GREEN = '#16A34A';
const ORANGE = '#F59E0B';
const MUTED = '#64748B';

type Props = {
  visible: boolean;
  onFinish: () => void;
  onSkip: () => void;
};

type TutorialStep = {
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
};

export default function OnboardingTutorial({ visible, onFinish, onSkip }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  const steps = useMemo<TutorialStep[]>(() => [
    {
      title: 'Bienvenido a AulaIA',
      description: 'Esta app te ayuda a grabar o subir clases, generar resúmenes y estudiar con un Tutor IA por materia y clase.',
      accent: BLUE,
      icon: <Sparkles color="#fff" size={30} />,
    },
    {
      title: 'Organiza tus materias',
      description: 'En Materias puedes crear asignaturas, revisar clases procesadas, abrir resúmenes y administrar integrantes con QR.',
      accent: PURPLE,
      icon: <BookOpen color="#fff" size={30} />,
    },
    {
      title: 'Graba o sube una clase',
      description: 'Desde el botón central puedes crear un apunte. El audio se convierte en texto y luego en un resumen estructurado.',
      accent: ORANGE,
      icon: <Mic color="#fff" size={30} />,
    },
    {
      title: 'Pregunta al Tutor IA',
      description: 'El Tutor IA responde usando el contexto de la clase seleccionada y refuerza el aprendizaje con ejemplos y explicaciones.',
      accent: GREEN,
      icon: <Bot color="#fff" size={30} />,
    },
    {
      title: 'Continúa tus conversaciones',
      description: 'Los chats se guardan por materia y clase, así puedes volver a una conversación anterior o crear una nueva.',
      accent: BLUE,
      icon: <MessageSquare color="#fff" size={30} />,
    },
  ], []);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  function closeAndReset(callback: () => void) {
    setCurrentStep(0);
    callback();
  }

  function nextStep() {
    if (isLastStep) {
      closeAndReset(onFinish);
      return;
    }

    setCurrentStep((value) => value + 1);
  }

  function previousStep() {
    setCurrentStep((value) => Math.max(0, value - 1));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <View style={[styles.iconCircle, { backgroundColor: step.accent }]}> 
            {step.icon}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.description, { color: colors.muted }]}>{step.description}</Text>

          <View style={styles.dotsRow}>
            {steps.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentStep ? step.accent : colors.border },
                  index === currentStep && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
              onPress={() => closeAndReset(onSkip)}
            >
              <Text style={styles.skipText}>Saltar</Text>
            </Pressable>

            <View style={styles.navActions}>
              {currentStep > 0 && (
                <Pressable
                  style={({ pressed }) => [styles.backButton, { borderColor: colors.border }, pressed && styles.pressed]}
                  onPress={previousStep}
                >
                  <Text style={[styles.backText, { color: colors.text }]}>Atrás</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [styles.nextButton, { backgroundColor: step.accent }, pressed && styles.pressed]}
                onPress={nextStep}
              >
                {isLastStep && <CheckCircle2 color="#fff" size={17} />}
                <Text style={styles.nextText}>{isLastStep ? 'Finalizar' : 'Siguiente'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    boxShadow: '0px 12px 28px rgba(15, 23, 42, 0.24)',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  dotActive: {
    width: 24,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  navActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skipButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  skipText: {
    color: MUTED,
    fontWeight: '900',
    fontSize: 13,
  },
  backButton: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  backText: {
    fontWeight: '900',
    fontSize: 13,
  },
  nextButton: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
  },
  nextText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.78,
  },
});
