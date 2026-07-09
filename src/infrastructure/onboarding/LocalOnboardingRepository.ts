import * as SecureStore from 'expo-secure-store';

const TUTORIAL_KEY = 'aulaia_tutorial_inicial_v1';

export const localOnboardingRepository = {
  async hasSeenTutorial(): Promise<boolean> {
    try {
      const value = await SecureStore.getItemAsync(TUTORIAL_KEY);
      return value === 'true';
    } catch (error) {
      console.log('[Onboarding] No se pudo leer el estado del tutorial:', error);
      return false;
    }
  },

  async markTutorialSeen(): Promise<void> {
    try {
      await SecureStore.setItemAsync(TUTORIAL_KEY, 'true');
    } catch (error) {
      console.log('[Onboarding] No se pudo guardar el estado del tutorial:', error);
    }
  },

  async resetTutorial(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(TUTORIAL_KEY);
    } catch (error) {
      console.log('[Onboarding] No se pudo reiniciar el tutorial:', error);
    }
  },
};
