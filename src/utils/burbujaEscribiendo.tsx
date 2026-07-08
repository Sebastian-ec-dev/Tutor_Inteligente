import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Bot } from "lucide-react-native";
import { COLORS } from "../components/ui/Colors";

export default function TypingIndicator() {
  const dot1Ref = useRef<Animated.Value | null>(null);
  const dot2Ref = useRef<Animated.Value | null>(null);
  const dot3Ref = useRef<Animated.Value | null>(null);

  if (!dot1Ref.current) dot1Ref.current = new Animated.Value(0);
  if (!dot2Ref.current) dot2Ref.current = new Animated.Value(0);
  if (!dot3Ref.current) dot3Ref.current = new Animated.Value(0);

  const dot1 = dot1Ref.current;
  const dot2 = dot2Ref.current;
  const dot3 = dot3Ref.current;

  useEffect(() => {
    const animations = [dot1, dot2, dot3].map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(value, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.delay(450 - index * 150),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  });

  return (
    <View style={[styles.messageRow, styles.botRow, { marginTop: 4 }]}>
      <View style={styles.avatarPlaceholder}>
        <Bot color="#fff" size={18} strokeWidth={2.2} />
      </View>
      <View
        style={[styles.messageBubble, styles.botBubble, styles.typingBubble]}
      >
        <Animated.View style={[styles.typingDot, dotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, dotStyle(dot3)]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Lista de mensajes */

  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },

  botRow: {
    justifyContent: "flex-start",
  },

  /* Avatares */
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.12)",
  },

  /* Burbujas */
  messageBubble: {
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.08)",
  },

  botBubble: {
    backgroundColor: COLORS.surface,
  },

  /* Indicador de "escribiendo..." */
  typingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 16,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.placeholder,
  },
});
