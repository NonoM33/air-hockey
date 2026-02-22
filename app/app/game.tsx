import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  GameCanvas,
  ScoreDisplay,
  SpeedDisplay,
  CountdownDisplay,
  NeonText,
  GoalAnimation,
} from '../src/components';
import { useSocket } from '../src/hooks/useSocket';
import { useHaptics } from '../src/hooks/useHaptics';
import { COLORS } from '../src/constants/theme';
import { Vector2D } from '../src/types/game';

export default function GameScreen() {
  const router = useRouter();
  const { roomId, playerName, opponent, mySide } = useLocalSearchParams<{
    roomId: string;
    playerName: string;
    opponent: string;
    mySide: string;
  }>();

  const [showGoal, setShowGoal] = useState(false);
  const [goalScorer, setGoalScorer] = useState('');

  const {
    gameState,
    countdown,
    goalData,
    gameOverData,
    lastCollision,
    opponentDisconnected,
    movePaddle,
    clearGoalData,
  } = useSocket();

  const haptics = useHaptics();

  // Handle collisions with haptics
  useEffect(() => {
    if (lastCollision) {
      switch (lastCollision.type) {
        case 'paddle':
          haptics.paddleHit();
          break;
        case 'wall':
          haptics.wallHit();
          break;
        case 'goal':
          haptics.goal();
          break;
      }
    }
  }, [lastCollision]);

  // Handle goal animation
  useEffect(() => {
    if (goalData) {
      setGoalScorer(goalData.scorer);
      setShowGoal(true);

      const timeout = setTimeout(() => {
        setShowGoal(false);
        clearGoalData();
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [goalData]);

  // Handle game over
  useEffect(() => {
    if (gameOverData) {
      router.replace({
        pathname: '/results',
        params: {
          winner: gameOverData.winner,
          isWinner: gameOverData.winner === playerName ? 'true' : 'false',
          duration: String(gameOverData.stats.duration),
          maxSpeed: String(gameOverData.stats.maxPuckSpeed),
          playerName,
          opponent,
        },
      });
    }
  }, [gameOverData]);

  // Handle opponent disconnect
  useEffect(() => {
    if (opponentDisconnected) {
      Alert.alert(
        'Opponent Disconnected',
        'Your opponent has left the game.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    }
  }, [opponentDisconnected]);

  const handlePaddleMove = useCallback(
    (position: Vector2D) => {
      movePaddle(position);
    },
    [movePaddle]
  );

  // Get scores
  const getScores = () => {
    if (!gameState?.players) return { score1: 0, score2: 0 };
    const topPlayer = gameState.players.find((p) => p.side === 'top');
    const bottomPlayer = gameState.players.find((p) => p.side === 'bottom');
    return {
      score1: topPlayer?.score || 0,
      score2: bottomPlayer?.score || 0,
    };
  };

  const { score1, score2 } = getScores();
  const isGoalMine = goalScorer === playerName;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Score Display */}
      <View style={styles.header}>
        <ScoreDisplay
          score1={score1}
          score2={score2}
          player1Name={mySide === 'bottom' ? opponent || 'OPPONENT' : playerName || 'YOU'}
          player2Name={mySide === 'bottom' ? playerName || 'YOU' : opponent || 'OPPONENT'}
          mySide={(mySide as 'top' | 'bottom') || 'bottom'}
        />
      </View>

      {/* Speed Display */}
      {gameState && (
        <SpeedDisplay speed={gameState.puckSpeed} />
      )}

      {/* Game Timer */}
      {gameState?.status === 'playing' && (
        <View style={styles.timer}>
          <NeonText color={COLORS.textDim} size={14} glow={false}>
            {formatTime(Date.now() - gameState.startTime)}
          </NeonText>
        </View>
      )}

      {/* Game Canvas */}
      <View style={styles.gameContainer}>
        <GameCanvas
          gameState={gameState}
          mySide={(mySide as 'top' | 'bottom') || 'bottom'}
          onPaddleMove={handlePaddleMove}
          lastCollision={lastCollision}
        />
      </View>

      {/* Countdown Overlay */}
      {countdown !== null && countdown > 0 && (
        <CountdownDisplay count={countdown} />
      )}

      {/* Goal Animation Overlay */}
      {showGoal && (
        <GoalAnimation scorer={goalScorer} isMe={isGoalMine} />
      )}

      {/* Game Status */}
      {gameState?.status === 'waiting' && (
        <View style={styles.statusOverlay}>
          <NeonText color={COLORS.cyan} size={24}>
            WAITING...
          </NeonText>
        </View>
      )}
    </SafeAreaView>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 10,
  },
  timer: {
    position: 'absolute',
    left: 20,
    top: 100,
  },
  gameContainer: {
    flex: 1,
  },
  statusOverlay: {
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
