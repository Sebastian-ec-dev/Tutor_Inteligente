import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Pasamos la ruta de las pantallas
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import ResumenScreen from "../screens/ResumenScreen";
import AudioScreen from "../screens/AudioScreen";
import ChatbotScreen from "../screens/ChatbotScreen";

export type PropsList = {
  Login: undefined;
  Home: undefined;
  Resumen: { subjectId: string; subjectName: string };
  Audio: { subjectId: string };
  Chatbot: undefined;
};

const Stack = createNativeStackNavigator<PropsList>();

export default function AppNavigator() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Mantiene actualizada la sesión de autenticación de supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Mis Materias" }}
            />
            <Stack.Screen
              name="Resumen"
              component={ResumenScreen}
              options={({ route }) => ({ title: route.params.subjectName })}
            />
            <Stack.Screen
              name="Audio"
              component={AudioScreen}
              options={{ title: "Nuevo Apunte" }}
            />
            <Stack.Screen
              name="Chatbot"
              component={ChatbotScreen}
              options={{ title: "Tutor IA" }}
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
