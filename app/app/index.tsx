import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonButton, NeonInput } from '../src/components';
import { COLORS } from '../src/constants/theme';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');

  // Animations
  const titleGlow = useSharedValue(0.5);
  const puckY = useSharedValue(0);

  useEffect(() => {
    titleGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    puckY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(15, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const titleGlowStyle = useAnimatedStyle(() => ({
    opacity: titleGlow.value,
  }));

  const puckAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: puckY.value }],
  }));

  const handlePlay = () => {
    if (!playerName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    router.push({
      pathname: '/lobby',
      params: { playerName: playerName.trim(), mode: 'matchmaking' },
    });
  };

  const handlePrivateGame = () => {
    if (!playerName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    router.push({
      pathname: '/lobby',
      params: { playerName: playerName.trim(), mode: 'private' },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Animated Puck Icon */}
        <Animated.View style={[styles.puckContainer, puckAnimatedStyle]}>
          <View style={styles.puck}>
            <View style={styles.puckInner} />
          </View>
        </Animated.View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <NeonText color={COLORS.cyan} size={48}>
            AIR
          </NeonText>
          <NeonText color={COLORS.magenta} size={48}>
            HOCKEY
          </NeonText>
          <Animated.View style={[styles.titleGlow, titleGlowStyle]}>
            <NeonText color={COLORS.violet} size={16}>
              NEO-RETRO ARCADE
            </NeonText>
          </Animated.View>
        </View>

        {/* Player Name Input */}
        <View style={styles.inputContainer}>
          <NeonText color={COLORS.textDim} size={14} glow={false}>
            ENTER YOUR NAME
          </NeonText>
          <NeonInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="PLAYER"
            color={COLORS.cyan}
            style={styles.input}
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <NeonButton
            title="PLAY"
            onPress={handlePlay}
            color={COLORS.green}
            size="large"
            disabled={!playerName.trim()}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <NeonText color={COLORS.textDim} size={12} glow={false}>
              OR
            </NeonText>
            <View style={styles.dividerLine} />
          </View>

          <NeonButton
            title="PRIVATE GAME"
            onPress={handlePrivateGame}
            color={COLORS.violet}
            size="medium"
            disabled={!playerName.trim()}
          />
        </View>

        {/* Version */}
        <View style={styles.version}>
          <NeonText color={COLORS.textDim} size={10} glow={false}>
            v1.0.0 - MULTIPLAYER 1v1
          </NeonText>
        </View>
      </View>

      {/* Decorative corners */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  puckContainer: {
    marginBottom: 30,
  },
  puck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.puck,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  puckInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  titleGlow: {
    marginTop: 10,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    marginTop: 10,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.textDim,
    marginHorizontal: 10,
  },
  version: {
    position: 'absolute',
    bottom: 20,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.violet,
  },
  cornerTL: {
    top: 20,
    left: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  cornerTR: {
    top: 20,
    right: 20,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  cornerBL: {
    bottom: 20,
    left: 20,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  cornerBR: {
    bottom: 20,
    right: 20,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },
});
