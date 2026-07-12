import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Bot, Home, Mic, UserRound } from 'lucide-react-native';
import { PropsList } from '../../navigation/AppNavigator';
import { useAppTheme } from './ThemeContext';

type ActiveTab = 'Home' | 'Subjects' | 'Audio' | 'Chatbot' | 'Profile';

type Props = {
  activeTab: ActiveTab;
};

export default function AppBottomBar({ activeTab }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<PropsList>>();
  const { colors } = useAppTheme();
  const muted = colors.muted;

  function tabIconColor(tab: ActiveTab) {
    return activeTab === tab ? colors.primary : muted;
  }

  function goQuickRecord() {
    if (activeTab === 'Audio') return;
    navigation.navigate('Audio', { quickRecord: true });
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
      <Pressable style={styles.item} onPress={onPress} accessibilityRole="button">
        {icon}
        <Text style={[styles.label, { color: active ? colors.primary : muted }]}>{label}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface }]}>
        <TabItem
          tab="Home"
          label="Inicio"
          icon={<Home color={tabIconColor('Home')} size={23} strokeWidth={activeTab === 'Home' ? 3 : 2.2} />}
          onPress={() => navigation.navigate('Home')}
        />
        <TabItem
          tab="Subjects"
          label="Materias"
          icon={<BookOpen color={tabIconColor('Subjects')} size={23} strokeWidth={activeTab === 'Subjects' ? 3 : 2.2} />}
          onPress={() => navigation.navigate('Subjects')}
        />
        <Pressable
          style={[styles.micButton, { backgroundColor: colors.primary }]}
          onPress={goQuickRecord}
          accessibilityRole="button"
          accessibilityLabel="Grabar clase"
        >
          <Mic color="#fff" size={31} strokeWidth={2.7} />
        </Pressable>
        <TabItem
          tab="Chatbot"
          label="Tutor IA"
          icon={<Bot color={tabIconColor('Chatbot')} size={23} strokeWidth={activeTab === 'Chatbot' ? 3 : 2.2} />}
          onPress={() => navigation.navigate('Chatbot')}
        />
        <TabItem
          tab="Profile"
          label="Perfil"
          icon={<UserRound color={tabIconColor('Profile')} size={23} strokeWidth={activeTab === 'Profile' ? 3 : 2.2} />}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingTop: 7,
    paddingBottom: 8,
    paddingHorizontal: 9,
  },
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 55,
  },
  label: {
    fontWeight: '800',
    fontSize: 10.5,
  },
  micButton: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    marginTop: -24,
    boxShadow: '0 7px 16px rgba(37, 99, 235, 0.28)',
  },
});
