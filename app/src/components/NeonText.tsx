import React, { ReactNode } from 'react';
import { Text, TextStyle, StyleSheet, View } from 'react-native';
import { COLORS } from '../constants/theme';

interface NeonTextProps {
  children: ReactNode;
  color?: string;
  size?: number;
  style?: TextStyle;
  glow?: boolean;
}

export function NeonText({
  children,
  color = COLORS.cyan,
  size = 24,
  style,
  glow = true,
}: NeonTextProps) {
  const textStyle: TextStyle = {
    fontFamily: 'monospace',
    fontSize: size,
    fontWeight: 'bold',
    color: color,
    textShadowColor: glow ? color : 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: glow ? 10 : 0,
    ...style,
  };

  return (
    <Text style={textStyle}>
      {children}
    </Text>
  );
}

interface ScoreDisplayProps {
  score1: number;
  score2: number;
  player1Name: string;
  player2Name: string;
  mySide: 'top' | 'bottom';
}

export function ScoreDisplay({
  score1,
  score2,
  player1Name,
  player2Name,
  mySide,
}: ScoreDisplayProps) {
  // Flip display for bottom player
  const topScore = mySide === 'bottom' ? score2 : score1;
  const bottomScore = mySide === 'bottom' ? score1 : score2;
  const topName = mySide === 'bottom' ? player2Name : player1Name;
  const bottomName = mySide === 'bottom' ? player1Name : player2Name;
  const topColor = mySide === 'bottom' ? COLORS.player2 : COLORS.player1;
  const bottomColor = mySide === 'bottom' ? COLORS.player1 : COLORS.player2;

  return (
    <View style={styles.scoreContainer}>
      <View style={styles.playerScore}>
        <NeonText color={topColor} size={14}>
          {topName.toUpperCase()}
        </NeonText>
        <NeonText color={topColor} size={48}>
          {String(topScore)}
        </NeonText>
      </View>
      <View style={styles.divider}>
        <NeonText color={COLORS.violet} size={24}>
          VS
        </NeonText>
      </View>
      <View style={styles.playerScore}>
        <NeonText color={bottomColor} size={48}>
          {String(bottomScore)}
        </NeonText>
        <NeonText color={bottomColor} size={14}>
          {bottomName.toUpperCase()} (YOU)
        </NeonText>
      </View>
    </View>
  );
}

interface SpeedDisplayProps {
  speed: number;
}

export function SpeedDisplay({ speed }: SpeedDisplayProps) {
  const getSpeedColor = () => {
    if (speed > 250) return COLORS.puckSuperFast;
    if (speed > 150) return COLORS.puckFast;
    return COLORS.green;
  };

  return (
    <View style={styles.speedContainer}>
      <NeonText color={getSpeedColor()} size={18}>
        {String(speed)}
      </NeonText>
      <NeonText color={COLORS.textDim} size={10} glow={false}>
        KM/H
      </NeonText>
    </View>
  );
}

interface CountdownDisplayProps {
  count: number;
}

export function CountdownDisplay({ count }: CountdownDisplayProps) {
  return (
    <View style={styles.countdownContainer}>
      <NeonText color={COLORS.green} size={120}>
        {String(count)}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playerScore: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    paddingHorizontal: 20,
  },
  speedContainer: {
    position: 'absolute',
    right: 20,
    top: 20,
    alignItems: 'center',
  },
  countdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});
