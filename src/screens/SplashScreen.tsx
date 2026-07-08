import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Brain, Database, Mic, Sparkles } from 'lucide-react-native';
import { AI_MODEL_CAPABILITIES } from '../domain/entities/AIModelCapability';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#DBEAFE';

export default function SplashScreen() {
  const scaleRef = useRef<Animated.Value | null>(null);
  const opacityRef = useRef<Animated.Value | null>(null);
  const progressRef = useRef<Animated.Value | null>(null);

  if (!scaleRef.current) scaleRef.current = new Animated.Value(0.92);
  if (!opacityRef.current) opacityRef.current = new Animated.Value(0.35);
  if (!progressRef.current) progressRef.current = new Animated.Value(0);

  const scale = scaleRef.current;
  const opacity = opacityRef.current;
  const progress = progressRef.current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 850,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 850,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 0.92,
            duration: 850,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.35,
            duration: 850,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

    const progressAnimation = Animated.timing(progress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    pulse.start();
    progressAnimation.start();

    return () => {
      pulse.stop();
      progressAnimation.stop();
    };
  }, [opacity, progress, scale]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['8%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoHalo, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoCircle}>
          <Brain color="#fff" size={42} />
        </View>
      </Animated.View>

      <Text style={styles.title}>AulaIA</Text>
      <Text style={styles.subtitle}>Preparando tu aula inteligente</Text>

      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width }]} />
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Mic color={BLUE} size={18} />
          <Text style={styles.statusText}>Activando transcriptor de audio</Text>
        </View>
        <View style={styles.statusRow}>
          <Sparkles color={PURPLE} size={18} />
          <Text style={styles.statusText}>Cargando router de modelos IA</Text>
        </View>
        <View style={styles.statusRow}>
          <Database color="#16A34A" size={18} />
          <Text style={styles.statusText}>Conectando Supabase y contexto directo</Text>
        </View>
      </View>

      <View style={styles.modelList}>
        {AI_MODEL_CAPABILITIES.map((item) => (
          <View key={item.id} style={styles.modelPill}>
            <Text style={styles.modelName}>{item.modelName}</Text>
            <Text style={styles.modelUse} numberOfLines={2}>{item.bestFor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 14px rgba(37, 99, 235, 0.28)',
  },
  title: {
    color: TEXT,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 26,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    borderRadius: 99,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: PURPLE,
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  modelList: {
    width: '100%',
    gap: 8,
  },
  modelPill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  modelName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  modelUse: {
    color: MUTED,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
});
