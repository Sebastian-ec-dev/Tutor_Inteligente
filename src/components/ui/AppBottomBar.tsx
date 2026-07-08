import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Bot, Home, Mic, UserRound } from 'lucide-react-native';
import { PropsList } from '../../navigation/AppNavigator';
import { Subject } from '../../domain/entities/Subject';
import { listSubjectsUseCase } from '../../application/container';
import { useAppTheme } from './ThemeContext';

type ActiveTab = 'Home' | 'Materias' | 'Audio' | 'Chatbot' | 'Profile';

type Props = {
  activeTab: ActiveTab;
  subjectId?: string;
};

const MUTED = '#94A3B8';

export default function AppBottomBar({ activeTab, subjectId }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const appTheme = useAppTheme();
  const colors = appTheme.colors;

  useEffect(() => {
    let mounted = true;
    listSubjectsUseCase
      .execute()
      .then((data) => mounted && setSubjects(data))
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  const targetSubjectId = subjectId || subjects[0]?.id;

  function goAudio() {
    if (!targetSubjectId) {
      Alert.alert('Primero crea una materia', 'Necesitas una materia para grabar o subir un audio.');
      return;
    }

    navigation.navigate('Audio', { subjectId: targetSubjectId });
  }

  function tabIconColor(tab: ActiveTab) {
    return activeTab === tab ? colors.primary : MUTED;
  }

  function TabItem({
    tab,
    label,
    icon,
    onPress,
  }: {
    tab: ActiveTab;
    label: string;
    icon: React.ReactNode;
    onPress: () => void;
  }) {
    const active = activeTab === tab;
    return (
      <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.8}>
        {icon}
        <Text style={[styles.label, { color: active ? colors.primary : MUTED }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface }]}>
        <TabItem
          tab="Home"
          label="Home"
          icon={<Home color={tabIconColor('Home')} size={24} strokeWidth={activeTab === 'Home' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Home')}
        />

        <TabItem
          tab="Materias"
          label="Materias"
          icon={<BookOpen color={tabIconColor('Materias')} size={24} strokeWidth={activeTab === 'Materias' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Materias')}
        />

        <TouchableOpacity style={[styles.micButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={goAudio} activeOpacity={0.86}>
          <Mic color="#fff" size={32} strokeWidth={2.7} />
        </TouchableOpacity>

        <TabItem
          tab="Chatbot"
          label="Tutor IA"
          icon={<Bot color={tabIconColor('Chatbot')} size={24} strokeWidth={activeTab === 'Chatbot' ? 3 : 2.3} />}
          onPress={() => navigation.navigate('Chatbot')}
        />

        <TabItem
          tab="Profile"
          label="Perfil"
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
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
