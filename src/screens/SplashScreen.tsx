import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

const BLUE = '#2563EB';
const PURPLE = '#7C3AED';
const TEXT = '#0F172A';
const MUTED = '#64748B';

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.55)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(78)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameTranslate = useRef(new Animated.Value(-28)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const sparkleRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(logoTranslate, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(nameTranslate, {
          toValue: 0,
          duration: 650,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]);

    const sparkle = Animated.loop(
      Animated.timing(sparkleRotation, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    intro.start();
    sparkle.start();

    return () => {
      intro.stop();
      sparkle.stop();
    };
  }, [logoOpacity, logoScale, logoTranslate, nameOpacity, nameTranslate, sparkleRotation, taglineOpacity]);

  const rotate = sparkleRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.decorTop} />
      <View style={styles.decorBottom} />

      <Animated.View style={[styles.sparkleTop, { transform: [{ rotate }] }]}> 
        <Sparkles color={PURPLE} size={26} />
      </Animated.View>

      <View style={styles.brandLine}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateX: logoTranslate }],
          }}
        >
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        </Animated.View>

        <Animated.View
          style={{
            opacity: nameOpacity,
            transform: [{ translateX: nameTranslate }],
          }}
        >
          <Text style={styles.brandName}>
            Aula<Text style={styles.brandIA}>IA</Text>
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.taglineBox, { opacity: taglineOpacity }]}> 
        <Text style={styles.tagline}>Graba, organiza y aprende mejor</Text>
        <View style={styles.loadingDots}>
          <View style={styles.dot} />
          <View style={[styles.dot, { backgroundColor: PURPLE }]} />
          <View style={[styles.dot, { opacity: 0.45 }]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decorTop: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: '#DBEAFE',
    top: -125,
    right: -100,
    opacity: 0.78,
  },
  decorBottom: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#EDE9FE',
    bottom: -170,
    left: -125,
    opacity: 0.72,
  },
  sparkleTop: {
    position: 'absolute',
    top: '29%',
    right: '18%',
  },
  brandLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 30,
  },
  brandName: {
    color: BLUE,
    fontSize: 43,
    fontWeight: '900',
    letterSpacing: -1.7,
  },
  brandIA: { color: PURPLE },
  taglineBox: { alignItems: 'center', marginTop: 28 },
  tagline: { color: TEXT, fontSize: 15, fontWeight: '800' },
  loadingDots: { flexDirection: 'row', gap: 7, marginTop: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE },
});
