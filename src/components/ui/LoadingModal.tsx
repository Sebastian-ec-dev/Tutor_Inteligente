import React from "react";
import { Modal, View, Text, ActivityIndicator, StyleSheet } from "react-native";

type Props = {
  visible: boolean;
  text?: string;
  transparent?: boolean;
};

export default function LoadingModal({
  visible,
  text = "Cargando...",
  transparent = true,
}: Props) {
  return (
    <Modal
      transparent={transparent}
      animationType="fade"
      visible={visible}
      statusBarTranslucent
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <ActivityIndicator size="large" color="#0066ff" />
          {text && <Text style={styles.text}>{text}</Text>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
});
