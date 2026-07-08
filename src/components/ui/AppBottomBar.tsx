import React, { useEffect, useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Bot, Home, Mic, UserRound } from 'lucide-react-native';
import { PropsList } from '../../navigation/AppNavigator';
import { listSubjectsUseCase } from '../../application/container';
import { useAppTheme } from './ThemeContext';

type ActiveTab = 'Home' | 'Materias' | 'Audio' | 'Chatbot' | 'Profile';

type Props = {
  activeTab: ActiveTab;
  subjectId?: string;
};

type TabItemProps = {
  tab: ActiveTab;
  activeTab: ActiveTab;
  label: string;
  icon: React.ReactNode;
  primaryColor: string;
  onPress: () => void;
};

const MUTED = '#94A3B8';

function TabItem({ tab, activeTab, label, icon, primaryColor, onPress }: TabItemProps) {
  const active = activeTab === tab;

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.label, { color: active ? primaryColor : MUTED }]}>{label}</Text>
    </Pressable>
  );
}

export default function AppBottomBar({ activeTab, subjectId }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const firstSubjectIdRef = useRef<string | undefined>(undefined);
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  useEffect(() => {
    let mounted = true;
    listSubjectsUseCase
      .execute()
      .then((data) => {
        if (mounted) {
          firstSubjectIdRef.current = data[0]?.id;
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  function goAudio() {
    const targetSubjectId = subjectId || firstSubjectIdRef.current;

    if (!targetSubjectId) {
      Alert.alert('Primero crea una materia', 'Necesitas una materia para grabar o subir un audio.');
      return;
    }

    navigation.navigate('Audio', { subjectId: targetSubjectId });
  }

  function tabIconColor(tab: ActiveTab) {
    return activeTab === tab ? colors.primary : MUTED;
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}> 
      <View style={[styles.bar, { backgroundColor: colors.surface }]}> 
        <TabItem
          tab="Home"
          activeTab={activeTab}
          label="Home"
          primaryColor={colors.primary}
          icon={<Home color={tabIconColor('Home')} size={24} strokeWidth={activeTab === 'Home' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Home')}
        />

        <TabItem
          tab="Materias"
          activeTab={activeTab}
          label="Materias"
          primaryColor={colors.primary}
          icon={<BookOpen color={tabIconColor('Materias')} size={24} strokeWidth={activeTab === 'Materias' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Materias')}
        />

        <Pressable
          style={({ pressed }) => [
            styles.micButton,
            { backgroundColor: colors.primary },
            pressed && styles.micButtonPressed,
          ]}
          onPress={goAudio}
        >
          <Mic color="#fff" size={32} strokeWidth={2.7} />
        </Pressable>

        <TabItem
          tab="Chatbot"
          activeTab={activeTab}
          label="Tutor IA"
          primaryColor={colors.primary}
          icon={<Bot color={tabIconColor('Chatbot')} size={24} strokeWidth={activeTab === 'Chatbot' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Chatbot')}
        />

        <TabItem
          tab="Profile"
          activeTab={activeTab}
          label="Perfil"
          primaryColor={colors.primary}
          icon={<UserRound color={tabIconColor('Profile')} size={24} strokeWidth={activeTab === 'Profile' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
  },
  bar: {
    minHeight: 68,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 58,
  },
  itemPressed: {
    opacity: 0.72,
  },
  label: {
    fontWeight: '800',
    fontSize: 11,
  },
  micButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    marginTop: -26,
    boxShadow: '0px 6px 12px rgba(37, 99, 235, 0.28)',
  },
  micButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
