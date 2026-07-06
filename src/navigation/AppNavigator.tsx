import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthSession } from '../domain/entities/AuthSession';
import { getSessionUseCase, observeAuthStateUseCase } from '../application/container';

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ResumenScreen from '../screens/ResumenScreen';
import AudioScreen from '../screens/AudioScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import SplashScreen from '../screens/SplashScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MembersScreen from '../screens/MembersScreen';

export type PropsList = {
  Login: undefined;
  Home: undefined;
  Resumen: { subjectId: string; subjectName: string };
  Audio: { subjectId: string };
  Chatbot: undefined;
  Profile: undefined;
  Members: { subjectId: string; subjectName: string };
};

const Stack = createNativeStackNavigator<PropsList>();
const MIN_SPLASH_MS = 3000;

export default function AppNavigator() {
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

  if (!splashDone || !sessionChecked) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session?.user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Mis Materias' }}
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
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
