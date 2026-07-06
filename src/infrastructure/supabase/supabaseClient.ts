import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { env, requireEnv } from '../../shared/config/env';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  requireEnv(env.supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL'),
  requireEnv(env.supabaseAnonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  {
    auth: {
      storage: secureStoreAdapter as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
