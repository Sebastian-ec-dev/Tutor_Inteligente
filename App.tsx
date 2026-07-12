import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/components/ui/ThemeContext';

function AppContent() {
  const { isDark } = useAppTheme();
  return (
    <SafeAreaProvider style={{ flex: 1 }}>
      <AppNavigator />
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        translucent={false}
        backgroundColor={isDark ? '#0F172A' : '#F8FAFC'}
      />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
