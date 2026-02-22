import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { NeonText } from './NeonText';

interface WaitingAnimationProps {
  text?: string;
}

export function WaitingAnimation({ text = 'SEARCHING...' }: WaitingAnimationProps) {
  const rotation = useSharedValue(0);
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );

    scale1.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      false
    );

    scale2.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      )
    );

    scale3.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      )
    );
  }, []);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spinner, rotationStyle]}>
        <View style={[styles.spinnerDot, { backgroundColor: COLORS.cyan }]} />
        <View style={[styles.spinnerDot, styles.spinnerDot2, { backgroundColor: COLORS.magenta }]} />
        <View style={[styles.spinnerDot, styles.spinnerDot3, { backgroundColor: COLORS.violet }]} />
      </Animated.View>

      <View style={styles.textContainer}>
        <NeonText color={COLORS.cyan} size={20}>
          {text}
        </NeonText>
      </View>

      <View style={styles.dotsContainer}>
        <Animated.View style={[styles.dot, { backgroundColor: COLORS.cyan }, dot1Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: COLORS.magenta }, dot2Style]} />
        <Animated.View style={[styles.dot, { backgroundColor: COLORS.violet }, dot3Style]} />
      </View>
    </View>
  );
}

interface GoalAnimationProps {
  scorer: string;
  isMe: boolean;
}

export function GoalAnimation({ scorer, isMe }: GoalAnimationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.exp) }),
      withTiming(1, { duration: 200 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.goalContainer, animatedStyle]}>
      <NeonText
        color={isMe ? COLORS.green : COLORS.magenta}
        size={60}
      >
        GOAL!
      </NeonText>
      <NeonText
        color={COLORS.text}
        size={24}
        style={{ marginTop: 10 }}
      >
        {isMe ? 'YOU SCORED!' : `${scorer} SCORED`}
      </NeonText>
    </Animated.View>
  );
}

interface VictoryAnimationProps {
  winner: string;
  isMe: boolean;
}

export function VictoryAnimation({ winner, isMe }: VictoryAnimationProps) {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.3, { duration: 500, easing: Easing.out(Easing.exp) }),
      withTiming(1, { duration: 200 })
    );

    rotation.value = withSequence(
      withTiming(-5, { duration: 100 }),
      withRepeat(
        withSequence(
          withTiming(5, { duration: 200 }),
          withTiming(-5, { duration: 200 })
        ),
        3,
        true
      ),
      withTiming(0, { duration: 100 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.victoryContainer, animatedStyle]}>
      <NeonText
        color={isMe ? COLORS.green : COLORS.magenta}
        size={50}
      >
        {isMe ? 'VICTORY!' : 'DEFEAT'}
      </NeonText>
      <NeonText
        color={COLORS.text}
        size={24}
        style={{ marginTop: 20 }}
      >
        {isMe ? 'YOU WIN!' : `${winner} WINS`}
      </NeonText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  spinner: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerDot: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 7.5,
    top: 0,
  },
  spinnerDot2: {
    top: 'auto',
    bottom: 0,
    left: 0,
  },
  spinnerDot3: {
    top: 'auto',
    bottom: 0,
    right: 0,
  },
  textContainer: {
    marginTop: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  victoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
