import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import Markdown from "react-native-markdown-display";
import { Bot, User } from "lucide-react-native";
import { COLORS } from "../components/ui/Colors";
import formateoTime from "../utils/formateoTime";

type Props = {
  id: string;
  text: string;
  sender: "user" | "bot";
};

export default function MessageBubble({
  item,
  isLastInGroup,
}: {
  item: Props;
  isLastInGroup: boolean;
}) {
  const fadeRef = useRef<Animated.Value | null>(null);
  const slideRef = useRef<Animated.Value | null>(null);

  if (!fadeRef.current) fadeRef.current = new Animated.Value(0);
  if (!slideRef.current) slideRef.current = new Animated.Value(10);

  const fade = fadeRef.current;
  const slide = slideRef.current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, slide]);

  const isUser = item.sender === "user";
  const time = formateoTime(item.id);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.userRow : styles.botRow,
        { marginBottom: isLastInGroup ? 18 : 4 },
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      {!isUser && (
        <View
          style={[
            styles.avatarPlaceholder,
            !isLastInGroup && styles.avatarHidden,
          ]}
        >
          {isLastInGroup && <Bot color="#fff" size={18} strokeWidth={2.2} />}
        </View>
      )}

      <View style={{ maxWidth: "78%" }}>
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.botBubble,
            isUser
              ? { borderBottomRightRadius: isLastInGroup ? 6 : 20 }
              : { borderBottomLeftRadius: isLastInGroup ? 6 : 20 },
          ]}
        >
          {isUser ? (
            <Text style={[styles.messageText, styles.userText]}>
              {item.text}
            </Text>
          ) : (
            <Markdown
              style={{
                body: { ...styles.messageText, ...styles.botText },
                heading1: {
                  fontSize: 22,
                  fontWeight: "bold",
                  color: COLORS.text,
                  marginBottom: 8,
                },
                heading2: {
                  fontSize: 20,
                  fontWeight: "bold",
                  color: COLORS.text,
                  marginBottom: 6,
                },
                heading3: {
                  fontSize: 18,
                  fontWeight: "bold",
                  color: COLORS.text,
                  marginBottom: 4,
                },
                strong: { fontWeight: "bold" },
                em: { fontStyle: "italic" },
                paragraph: { marginTop: 0, marginBottom: 8 },
                list_item: { marginBottom: 4 },
                bullet_list: { marginLeft: 0 },
                ordered_list: { marginLeft: 0 },
              }}
            >
              {item.text}
            </Markdown>
          )}
        </View>

        {isLastInGroup && !!time && (
          <Text
            style={[
              styles.timeText,
              isUser ? styles.timeTextUser : styles.timeTextBot,
            ]}
          >
            {time}
          </Text>
        )}
      </View>

      {isUser && (
        <View
          style={[
            styles.avatarPlaceholder,
            styles.userAvatarPlaceholder,
            !isLastInGroup && styles.avatarHidden,
          ]}
        >
          {isLastInGroup && <User color="#000" size={18} strokeWidth={2.2} />}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  userRow: {
    justifyContent: "flex-end",
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
  avatarHidden: {
    backgroundColor: "transparent",
    boxShadow: "none",
  },
  userAvatarPlaceholder: {
    backgroundColor: COLORS.userAvatarBg,
    marginRight: 0,
    marginLeft: 8,
  },

  /* Burbujas */
  messageBubble: {
    padding: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.08)",
  },
  userBubble: {
    backgroundColor: COLORS.primary,
  },
  botBubble: {
    backgroundColor: COLORS.surface,
  },

  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#ffffff",
  },
  botText: {
    color: COLORS.text,
  },

  timeText: {
    fontSize: 11,
    color: COLORS.placeholder,
    marginTop: 4,
  },
  timeTextUser: {
    textAlign: "right",
    marginRight: 4,
  },
  timeTextBot: {
    textAlign: "left",
    marginLeft: 4,
  },
});
