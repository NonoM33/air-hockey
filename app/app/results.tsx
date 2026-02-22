import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { NeonText, NeonButton, VictoryAnimation } from '../src/components';
import { useHaptics } from '../src/hooks/useHaptics';
import { COLORS } from '../src/constants/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { winner, isWinner, duration, maxSpeed, playerName, opponent } =
    useLocalSearchParams<{
      winner: string;
      isWinner: string;
      duration: string;
      maxSpeed: string;
      playerName: string;
      opponent: string;
    }>();

  const haptics = useHaptics();
  const isVictory = isWinner === 'true';

  // Animations
  const statsOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(50);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVictory) {
      haptics.success();
    } else {
      haptics.error();
    }

    // Animate stats
    statsOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));

    // Animate buttons
    buttonsOpacity.value = withDelay(1500, withTiming(1, { duration: 500 }));
    buttonsY.value = withDelay(1500, withSpring(0, { damping: 15 }));
  }, []);

  const statsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: statsOpacity.value,
  }));

  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  const handleRematch = () => {
    router.replace({
      pathname: '/lobby',
      params: { playerName, mode: 'matchmaking' },
    });
  };

  const handleNewGame = () => {
    router.replace('/');
  };

  const formatDuration = (ms: string) => {
    const totalSeconds = Math.floor(parseInt(ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Confetti effect for victory */}
      {isVictory && <ConfettiEffect />}

      <View style={styles.content}>
        {/* Victory/Defeat Animation */}
        <VictoryAnimation winner={winner || ''} isMe={isVictory} />

        {/* Stats */}
        <Animated.View style={[styles.statsContainer, statsAnimatedStyle]}>
          <NeonText color={COLORS.textDim} size={16} glow={false}>
            GAME STATS
          </NeonText>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <NeonText color={COLORS.cyan} size={28}>
                {formatDuration(duration || '0')}
              </NeonText>
              <NeonText color={COLORS.textDim} size={12} glow={false}>
                DURATION
              </NeonText>
            </View>

            <View style={styles.statItem}>
              <NeonText color={COLORS.orange} size={28}>
                {maxSpeed || '0'}
              </NeonText>
              <NeonText color={COLORS.textDim} size={12} glow={false}>
                MAX SPEED (KM/H)
              </NeonText>
            </View>
          </View>

          <View style={styles.matchup}>
            <NeonText color={COLORS.cyan} size={16}>
              {playerName}
            </NeonText>
            <NeonText color={COLORS.violet} size={14}>
              {' VS '}
            </NeonText>
            <NeonText color={COLORS.magenta} size={16}>
              {opponent}
            </NeonText>
          </View>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[styles.buttonsContainer, buttonsAnimatedStyle]}>
          <NeonButton
            title="REMATCH"
            onPress={handleRematch}
            color={COLORS.green}
            size="large"
          />

          <NeonButton
            title="NEW GAME"
            onPress={handleNewGame}
            color={COLORS.violet}
            size="medium"
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// Simple confetti effect component
function ConfettiEffect() {
  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1000,
    duration: 2000 + Math.random() * 2000,
    color: [COLORS.cyan, COLORS.magenta, COLORS.green, COLORS.violet, COLORS.orange][
      Math.floor(Math.random() * 5)
    ],
  }));

  return (
    <View style={styles.confettiContainer}>
      {confettiPieces.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  left,
  delay,
  duration,
  color,
}: {
  left: number;
  delay: number;
  duration: number;
  color: string;
}) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(800, { duration })
    );
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );
    rotation.value = withDelay(
      delay,
      withTiming(360 * 3, { duration })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { left: `${left}%`, backgroundColor: color },
        animatedStyle,
      ]}
    />
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
  statsContainer: {
    marginTop: 50,
    alignItems: 'center',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 60,
    gap: 15,
    alignItems: 'center',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
