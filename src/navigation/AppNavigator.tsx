import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthSession } from '../domain/entities/AuthSession';
import { getSessionUseCase, observeAuthStateUseCase } from '../application/container';
import { useAppTheme } from '../components/ui/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import SubjectsScreen from '../screens/SubjectsScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ResumenScreen from '../screens/ResumenScreen';
import AudioScreen from '../screens/AudioScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import SplashScreen from '../screens/SplashScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MembersScreen from '../screens/MembersScreen';
import JoinSubjectScreen from '../screens/JoinSubjectScreen';

export type PropsList = {
  Login: undefined;
  Home: { showTutorial?: boolean } | undefined;
  Subjects: undefined;
  Schedule: undefined;
  Resumen: {
    subjectId: string;
    subjectName: string;
    focusAudioNoteId?: string;
    focusTaskId?: string;
    initialTab?: 'apuntes' | 'deberes';
  };
  Audio:
    | {
        subjectId?: string;
        audioNoteId?: string;
        audioNoteTitle?: string;
        quickRecord?: boolean;
      }
    | undefined;
  Chatbot:
    | { subjectId?: string; subjectName?: string; classId?: string; className?: string }
    | undefined;
  Profile: undefined;
  Members: { subjectId: string; subjectName: string };
  JoinSubject: undefined;
};

const Stack = createNativeStackNavigator<PropsList>();
const MIN_SPLASH_MS = 3200;

export default function AppNavigator() {
  const { colors } = useAppTheme();
  const [session, setSession] = useState<AuthSession>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) setSplashDone(true);
    }, MIN_SPLASH_MS);

    getSessionUseCase
      .execute()
      .then((currentSession) => {
        if (mounted) setSession(currentSession);
      })
      .catch((error) => {
        console.log('[AppNavigator] Error consultando sesión inicial:', error?.message || error);
      })
      .finally(() => {
        if (mounted) setSessionChecked(true);
      });

    const subscription = observeAuthStateUseCase.execute(setSession);

    return () => {
      mounted = false;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  if (!splashDone || !sessionChecked) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '900' },
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.background },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {session?.user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Subjects"
              component={SubjectsScreen}
              options={{ title: 'Mis materias' }}
            />
            <Stack.Screen
              name="Schedule"
              component={ScheduleScreen}
              options={{ title: 'Horario de clases' }}
            />
            <Stack.Screen
              name="Resumen"
              component={ResumenScreen}
              options={({ route }) => ({ title: route.params.subjectName })}
            />
            <Stack.Screen
              name="Audio"
              component={AudioScreen}
              options={({ route }) => ({
                title: route.params?.quickRecord ? 'Grabar clase' : 'Nuevo apunte',
              })}
            />
            <Stack.Screen name="Chatbot" component={ChatbotScreen} options={{ title: 'Tutor IA' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mi perfil' }} />
            <Stack.Screen
              name="Members"
              component={MembersScreen}
              options={({ route }) => ({ title: `Integrantes · ${route.params.subjectName}` })}
            />
            <Stack.Screen
              name="JoinSubject"
              component={JoinSubjectScreen}
              options={{ title: 'Unirme a materia' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
