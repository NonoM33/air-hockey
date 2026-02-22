import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonButton, NeonInput, WaitingAnimation } from '../src/components';
import { useSocket } from '../src/hooks/useSocket';
import { useHaptics } from '../src/hooks/useHaptics';
import { COLORS } from '../src/constants/theme';

type Mode = 'matchmaking' | 'private' | 'create' | 'join';

export default function LobbyScreen() {
  const router = useRouter();
  const { playerName, mode: initialMode } = useLocalSearchParams<{
    playerName: string;
    mode: string;
  }>();

  const [mode, setMode] = useState<Mode>(initialMode as Mode || 'matchmaking');
  const [roomCode, setRoomCode] = useState('');

  const {
    isConnected,
    isWaiting,
    matchData,
    roomData,
    error,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
  } = useSocket();

  const haptics = useHaptics();

  // Start matchmaking on mount if in matchmaking mode
  useEffect(() => {
    if (mode === 'matchmaking' && isConnected && playerName) {
      joinQueue(playerName);
    }
  }, [mode, isConnected, playerName]);

  // Navigate to game when matched
  useEffect(() => {
    if (matchData) {
      haptics.success();
      router.replace({
        pathname: '/game',
        params: {
          roomId: matchData.roomId,
          playerName,
          opponent: matchData.opponent,
          mySide: matchData.yourSide,
        },
      });
    }
  }, [matchData]);

  const handleCancel = () => {
    leaveQueue();
    router.back();
  };

  const handleCreateRoom = () => {
    if (playerName) {
      createRoom(playerName);
      setMode('create');
    }
  };

  const handleJoinRoom = () => {
    if (playerName && roomCode.length === 4) {
      joinRoom(roomCode.toUpperCase(), playerName);
    } else {
      haptics.warning();
    }
  };

  const handleSwitchToJoin = () => {
    setMode('join');
  };

  const handleBack = () => {
    setMode('private');
    setRoomCode('');
  };

  // Matchmaking view
  if (mode === 'matchmaking') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <WaitingAnimation text="SEARCHING FOR OPPONENT" />

          {error && (
            <View style={styles.errorContainer}>
              <NeonText color={COLORS.magenta} size={14}>
                {error}
              </NeonText>
            </View>
          )}

          <NeonButton
            title="CANCEL"
            onPress={handleCancel}
            color={COLORS.magenta}
            size="medium"
            style={styles.cancelButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Private game menu
  if (mode === 'private') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <NeonText color={COLORS.cyan} size={32}>
            PRIVATE GAME
          </NeonText>

          <View style={styles.menuButtons}>
            <NeonButton
              title="CREATE ROOM"
              onPress={handleCreateRoom}
              color={COLORS.green}
              size="large"
            />

            <NeonButton
              title="JOIN ROOM"
              onPress={handleSwitchToJoin}
              color={COLORS.violet}
              size="large"
            />
          </View>

          <NeonButton
            title="BACK"
            onPress={handleCancel}
            color={COLORS.textDim}
            size="small"
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Create room view
  if (mode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <NeonText color={COLORS.cyan} size={24}>
            ROOM CREATED
          </NeonText>

          {roomData && (
            <View style={styles.codeContainer}>
              <NeonText color={COLORS.textDim} size={14} glow={false}>
                SHARE THIS CODE
              </NeonText>
              <View style={styles.codeBox}>
                <NeonText color={COLORS.green} size={48}>
                  {roomData.code}
                </NeonText>
              </View>
            </View>
          )}

          <WaitingAnimation text="WAITING FOR OPPONENT" />

          <NeonButton
            title="CANCEL"
            onPress={handleCancel}
            color={COLORS.magenta}
            size="medium"
            style={styles.cancelButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Join room view
  if (mode === 'join') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <NeonText color={COLORS.cyan} size={24}>
            JOIN ROOM
          </NeonText>

          <View style={styles.joinContainer}>
            <NeonText color={COLORS.textDim} size={14} glow={false}>
              ENTER ROOM CODE
            </NeonText>
            <NeonInput
              value={roomCode}
              onChangeText={(text) => setRoomCode(text.toUpperCase().slice(0, 4))}
              placeholder="XXXX"
              color={COLORS.green}
              style={styles.codeInput}
            />

            {error && (
              <NeonText color={COLORS.magenta} size={12} style={styles.error}>
                {error}
              </NeonText>
            )}

            <NeonButton
              title="JOIN"
              onPress={handleJoinRoom}
              color={COLORS.green}
              size="large"
              disabled={roomCode.length !== 4}
              style={styles.joinButton}
            />
          </View>

          <NeonButton
            title="BACK"
            onPress={handleBack}
            color={COLORS.textDim}
            size="small"
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
  errorContainer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.magenta,
    borderRadius: 8,
  },
  cancelButton: {
    marginTop: 40,
  },
  menuButtons: {
    marginTop: 60,
    gap: 20,
    width: '100%',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    bottom: 40,
  },
  codeContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  codeBox: {
    marginTop: 10,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderWidth: 3,
    borderColor: COLORS.green,
    borderRadius: 10,
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
  },
  joinContainer: {
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
  },
  codeInput: {
    width: '60%',
    marginTop: 10,
  },
  error: {
    marginTop: 10,
  },
  joinButton: {
    marginTop: 30,
  },
});
