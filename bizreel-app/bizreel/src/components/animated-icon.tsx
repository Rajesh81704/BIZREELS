import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DARK_BG = '#120D0A';
const GOLD_BRAND = '#D99A3D';
const GOLD_GLOW = 'rgba(217, 154, 61, 0.25)';
const WHITE = '#FFFFFF';
const MUTED_TEXT = '#94A3B8';

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  // Shared Values for animations
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);
  const overlayOpacity = useSharedValue(1);

  useEffect(() => {
    // Hide static native splash screen
    SplashScreen.hideAsync().catch(() => {});

    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 500 });
    logoScale.value = withSpring(1, {
      damping: 12,
      stiffness: 120,
    });

    // Fade in text and tagline
    textOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    textTranslateY.value = withDelay(200, withSpring(0, { damping: 14, stiffness: 100 }));

    // Smooth exit curtain fade after ~1.6 seconds
    overlayOpacity.value = withDelay(
      1600,
      withTiming(0, { duration: 450, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(setVisible)(false);
        }
      })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.splashOverlay, overlayAnimatedStyle]} pointerEvents="none">
      <View style={styles.centerContainer}>
        {/* Logo Glass Card */}
        <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
          <View style={styles.logoGlassCard}>
            <Image
              source={require('@/assets/icon.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
        </Animated.View>

        {/* Brand Name & Tagline */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.brandTitleText}>
            biz<Text style={styles.brandTitleGold}>reels</Text>
          </Text>

          {/* Subtitle Badge */}
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>LOCAL MARKETPLACE • VIDEO REELS</Text>
          </View>
        </Animated.View>
      </View>

      {/* Footer Trust Marker */}
      <Animated.View style={[styles.footerContainer, textAnimatedStyle]}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>Verified Local Sellers & Video Deals</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Image source={require('@/assets/icon.png')} style={styles.logoImageSmall} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlassCard: {
    width: 92,
    height: 92,
    borderRadius: 26,
    backgroundColor: '#1C1510',
    borderWidth: 1.5,
    borderColor: 'rgba(217, 154, 61, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: GOLD_BRAND,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  textContainer: {
    alignItems: 'center',
    gap: 10,
  },
  brandTitleText: {
    color: WHITE,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  brandTitleGold: {
    color: GOLD_BRAND,
  },
  taglineBadge: {
    backgroundColor: 'rgba(217, 154, 61, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 61, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  taglineText: {
    color: GOLD_BRAND,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  footerText: {
    color: MUTED_TEXT,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImageSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});
