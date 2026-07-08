import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthSession } from '../domain/entities/AuthSession';
import { getSessionUseCase, observeAuthStateUseCase } from '../application/container';
import { ThemeProvider, useAppTheme } from '../components/ui/ThemeContext';

import LoginScreen from '../screens/LoginScreen';
import HomeDashboardScreen from '../screens/HomeDashboardScreen';
import HomeScreen from '../screens/HomeScreen';
import ResumenScreen from '../screens/ResumenScreen';
import AudioScreen from '../screens/AudioScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import SplashScreen from '../screens/SplashScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MembersScreen from '../screens/MembersScreen';
import JoinSubjectScreen from '../screens/JoinSubjectScreen';

export type PropsList = {
  Login: undefined;
  Home: undefined;
  Materias: undefined;
  Resumen: { subjectId: string; subjectName: string };
  Audio: { subjectId: string; audioNoteId?: string; audioNoteTitle?: string };
  Chatbot: { subjectId?: string; subjectName?: string; classId?: string; className?: string } | undefined;
  Profile: undefined;
  Members: { subjectId: string; subjectName: string };
  JoinSubject: undefined;
};

const Stack = createNativeStackNavigator<PropsList>();
const MIN_SPLASH_MS = 3000;

function AppNavigatorInner() {
  const appTheme = useAppTheme();

  const [session, setSession] = useState<AuthSession>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  const navigationTheme = {
    ...(appTheme.isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(appTheme.isDark ? DarkTheme : DefaultTheme).colors,
      background: appTheme.colors.background,
      card: appTheme.colors.surface,
      text: appTheme.colors.text,
      border: appTheme.colors.border,
      primary: appTheme.colors.primary,
    },
  };

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

  return (
    <NavigationContainer theme={navigationTheme}>
      {!splashDone || !sessionChecked ? (
        <SplashScreen />
      ) : (
        <Stack.Navigator>
          {session?.user ? (
            <>
              <Stack.Screen
                name="Home"
                component={HomeDashboardScreen}
                options={{ title: 'Home' }}
              />
              <Stack.Screen
                name="Materias"
                component={HomeScreen}
                options={{ title: 'Materias' }}
              />
              <Stack.Screen
                name="Resumen"
                component={ResumenScreen}
                options={({ route }) => ({ title: route.params.subjectName })}
              />
              <Stack.Screen
                name="Audio"
                component={AudioScreen}
                options={{ title: 'Nuevo Apunte' }}
              />
              <Stack.Screen
                name="Chatbot"
                component={ChatbotScreen}
                options={{ title: 'Tutor IA' }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Mi perfil' }}
              />
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
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
          )}
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <AppNavigatorInner />
    </ThemeProvider>
  );
}
