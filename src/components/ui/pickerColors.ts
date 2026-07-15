import { Platform } from 'react-native';

/**
 * Android muestra el menú nativo del Picker sobre un fondo claro, incluso
 * cuando la aplicación está en modo oscuro. En ese menú usamos texto oscuro
 * para que las opciones siempre sean legibles.
 */
export function getPickerItemColor(isDark: boolean, themeTextColor: string) {
  return Platform.OS === 'android' && isDark ? '#0F172A' : themeTextColor;
}
