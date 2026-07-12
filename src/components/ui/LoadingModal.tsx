import React, { useMemo } from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppTheme } from './ThemeContext';

type Props = {
  visible: boolean;
  text?: string;
  transparent?: boolean;
};

export default function LoadingModal({
  visible,
  text = 'Cargando...',
  transparent = true,
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      transparent={transparent}
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          {text && <Text style={styles.text}>{text}</Text>}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ReturnType<typeof useAppTheme>['colors']) {
  return StyleSheet.create({
    modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      paddingVertical: 28,
      paddingHorizontal: 40,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      boxShadow: '0 4px 12px rgba(0,0,0,0.30)',
      minWidth: 160,
    },
    text: {
      marginTop: 16,
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },
  });
}
