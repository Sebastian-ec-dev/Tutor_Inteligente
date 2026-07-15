import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { Bot, User } from 'lucide-react-native';
import formateoTime from './formateoTime';
import { useAppTheme } from '../components/ui/ThemeContext';

type Props = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

export default function MessageBubble({
  item,
  isLastInGroup,
}: {
  item: Props;
  isLastInGroup: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const codeColors = useMemo(
    () => ({
      background: isDark ? '#0B1220' : '#F1F5F9',
      border: isDark ? '#475569' : '#CBD5E1',
      text: isDark ? '#E2E8F0' : '#0F172A',
    }),
    [isDark],
  );
  const monospaceFont = Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  });
  const markdownRules = useMemo(() => {
    const renderCodeBlock = (node: { key: string; content?: string }) => {
      const content =
        typeof node.content === 'string' ? node.content.replace(/\n$/, '') : '';

      return (
        <View key={node.key} style={styles.markdownCodeBlock}>
          <Text selectable style={styles.markdownCodeBlockText}>
            {content}
          </Text>
        </View>
      );
    };

    return {
      code_inline: (node: { key: string; content?: string }) => (
        <Text key={node.key} selectable style={styles.markdownInlineCode}>
          {node.content ?? ''}
        </Text>
      ),
      code_block: renderCodeBlock,
      fence: renderCodeBlock,
    };
  }, [styles]);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const animation = Animated.parallel([
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
    ]);
    animation.start();
    return () => animation.stop();
  }, [fade, slide]);

  const isUser = item.sender === 'user';
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
        <View style={[styles.avatarPlaceholder, !isLastInGroup && styles.avatarHidden]}>
          {isLastInGroup && <Bot color="#fff" size={18} strokeWidth={2.2} />}
        </View>
      )}

      <View style={{ maxWidth: '82%' }}>
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
            <Text style={[styles.messageText, styles.userText]}>{item.text}</Text>
          ) : (
            <Markdown
              rules={markdownRules}
              style={{
                body: { ...styles.messageText, ...styles.botText },
                heading1: { fontSize: 21, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
                heading2: { fontSize: 19, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
                heading3: { fontSize: 17, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
                strong: { fontWeight: 'bold' },
                em: { fontStyle: 'italic' },
                paragraph: { marginTop: 0, marginBottom: 8 },
                list_item: { marginBottom: 4 },
                bullet_list: { marginLeft: 0 },
                ordered_list: { marginLeft: 0 },
                code_inline: {
                  color: codeColors.text,
                  backgroundColor: codeColors.background,
                  borderColor: codeColors.border,
                  borderWidth: 1,
                  borderRadius: 5,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                  fontFamily: monospaceFont,
                },
                code_block: {
                  color: codeColors.text,
                  backgroundColor: codeColors.background,
                  borderColor: codeColors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginVertical: 8,
                  fontFamily: monospaceFont,
                },
                fence: {
                  color: codeColors.text,
                  backgroundColor: codeColors.background,
                  borderColor: codeColors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginVertical: 8,
                  fontFamily: monospaceFont,
                },
              }}
            >
              {item.text}
            </Markdown>
          )}
        </View>

        {isLastInGroup && !!time && (
          <Text style={[styles.timeText, isUser ? styles.timeTextUser : styles.timeTextBot]}>
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
          {isLastInGroup && <User color={colors.text} size={18} strokeWidth={2.2} />}
        </View>
      )}
    </Animated.View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  isDark: boolean,
) {
  return StyleSheet.create({
    messageRow: { flexDirection: 'row', alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    avatarPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.16)',
    },
    avatarHidden: { backgroundColor: 'transparent', boxShadow: 'none' },
    userAvatarPlaceholder: {
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      marginRight: 0,
      marginLeft: 8,
    },
    messageBubble: {
      padding: 13,
      paddingHorizontal: 15,
      borderRadius: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
    },
    userBubble: { backgroundColor: colors.primary },
    botBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    messageText: { fontSize: 15.5, lineHeight: 22 },
    userText: { color: '#FFFFFF' },
    botText: { color: colors.text },
    markdownInlineCode: {
      color: isDark ? '#E2E8F0' : '#0F172A',
      backgroundColor: isDark ? '#0B1220' : '#F1F5F9',
      borderColor: isDark ? '#475569' : '#CBD5E1',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 5,
      paddingVertical: 2,
      fontFamily: Platform.select({
        ios: 'Courier',
        android: 'monospace',
        default: 'monospace',
      }),
    },
    markdownCodeBlock: {
      alignSelf: 'stretch',
      backgroundColor: isDark ? '#0B1220' : '#F1F5F9',
      borderColor: isDark ? '#475569' : '#CBD5E1',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginVertical: 8,
    },
    markdownCodeBlockText: {
      color: isDark ? '#E2E8F0' : '#0F172A',
      backgroundColor: 'transparent',
      fontFamily: Platform.select({
        ios: 'Courier',
        android: 'monospace',
        default: 'monospace',
      }),
      fontSize: 14,
      lineHeight: 20,
    },
    timeText: { fontSize: 10.5, color: colors.muted, marginTop: 4 },
    timeTextUser: { textAlign: 'right', marginRight: 4 },
    timeTextBot: { textAlign: 'left', marginLeft: 4 },
  });
}
