import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mic,
  UserRound,
} from 'lucide-react-native';
import { useAppTheme } from '../ui/ThemeContext';
import { getCloudUserPreferences, saveCloudUserPreferences } from '../../infrastructure/supabase/SupabaseUserPreferences';

export const TUTORIAL_STORAGE_KEY = 'AULAIA_ONBOARDING_TUTORIAL_V1';

export async function hasSeenOnboardingTutorial() {
  const cloud = await getCloudUserPreferences().catch(() => null);
  if (cloud?.onboardingSeen) {
    await SecureStore.setItemAsync(TUTORIAL_STORAGE_KEY, 'seen').catch(() => undefined);
    return true;
  }
  return (await SecureStore.getItemAsync(TUTORIAL_STORAGE_KEY)) === 'seen';
}


export async function resetOnboardingTutorial() {
  await SecureStore.deleteItemAsync(TUTORIAL_STORAGE_KEY);
  await saveCloudUserPreferences({ onboardingSeen: false }).catch(() => undefined);
}


export async function markOnboardingTutorialSeen() {
  await SecureStore.setItemAsync(TUTORIAL_STORAGE_KEY, 'seen');
  await saveCloudUserPreferences({ onboardingSeen: true }).catch(() => undefined);
}


type Props = {
  visible: boolean;
  scheduleTargetY?: number;
  onClose: () => void;
};

export default function OnboardingTutorial({
  visible,
  scheduleTargetY = 330,
  onClose,
}: Props) {
  const { width, height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [index, setIndex] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: 'Ver horario',
        text: 'Aquí puedes crear, consultar y editar tu horario de clases.',
        icon: <CalendarDays color="#fff" size={25} />,
        x: 48,
        y: scheduleTargetY,
        bubbleTop: Math.min(height - 260, scheduleTargetY + 55),
      },
      {
        title: 'Materias',
        text: 'Aquí puedes ver tus materias, clases, audios, resúmenes y tareas.',
        icon: <BookOpen color="#fff" size={25} />,
        x: width * 0.30,
        y: height - 48,
        bubbleTop: height - 300,
      },
      {
        title: 'Grabar clase',
        text: 'Toca el botón central para comenzar a grabar una clase rápidamente.',
        icon: <Mic color="#fff" size={27} />,
        x: width * 0.50,
        y: height - 55,
        bubbleTop: height - 310,
      },
      {
        title: 'Tutor IA',
        text: 'Aquí puedes continuar tus chats y estudiar con un tutor personalizado para cada clase.',
        icon: <Bot color="#fff" size={25} />,
        x: width * 0.70,
        y: height - 48,
        bubbleTop: height - 300,
      },
      {
        title: 'Perfil',
        text: 'Aquí encuentras tus datos, modo nocturno, aulas compartidas y la opción para volver a ver esta guía.',
        icon: <UserRound color="#fff" size={25} />,
        x: width * 0.90,
        y: height - 48,
        bubbleTop: height - 300,
      },
    ],
    [height, scheduleTargetY, width],
  );

  const step = steps[index];

  async function finish() {
    await markOnboardingTutorialSeen().catch(() => undefined);
    setIndex(0);
    onClose();
  }

  function next() {
    if (index >= steps.length - 1) {
      finish();
      return;
    }
    setIndex((value) => value + 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.targetRing,
            {
              left: step.x - 34,
              top: step.y - 34,
            },
          ]}
        >
          <View style={styles.targetInner}>{step.icon}</View>
        </View>

        <View style={[styles.bubble, { top: Math.max(70, step.bubbleTop) }]}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>{index + 1} de {steps.length}</Text>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.text}>{step.text}</Text>

          <View style={styles.actions}>
            <Pressable style={styles.skipButton} onPress={finish}>
              <Text style={styles.skipText}>Omitir</Text>
            </Pressable>
            <View style={styles.navActions}>
              {index > 0 && (
                <Pressable style={styles.backButton} onPress={() => setIndex((value) => value - 1)}>
                  <ChevronLeft color={colors.primary} size={20} />
                </Pressable>
              )}
              <Pressable style={styles.nextButton} onPress={next}>
                <Text style={styles.nextText}>{index === steps.length - 1 ? 'Finalizar' : 'Siguiente'}</Text>
                <ChevronRight color="#fff" size={19} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(2, 8, 23, 0.78)',
    },
    targetRing: {
      position: 'absolute',
      width: 68,
      height: 68,
      borderRadius: 34,
      borderWidth: 3,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 0 24px rgba(96,165,250,0.7)',
    },
    targetInner: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bubble: {
      position: 'absolute',
      left: 18,
      right: 18,
      backgroundColor: colors.card,
      borderRadius: 23,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginBottom: 10,
    },
    stepBadgeText: { color: colors.primary, fontSize: 10.5, fontWeight: '900' },
    title: { color: colors.text, fontSize: 20, fontWeight: '900' },
    text: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 7 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    skipButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 4 },
    skipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    navActions: { flexDirection: 'row', gap: 8 },
    backButton: {
      width: 45,
      height: 45,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextButton: {
      minHeight: 45,
      borderRadius: 14,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      paddingHorizontal: 16,
    },
    nextText: { color: '#fff', fontSize: 12.5, fontWeight: '900' },
  });
}
