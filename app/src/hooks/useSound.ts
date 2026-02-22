import { useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

// Sound frequencies for synthesized sounds
const SOUNDS = {
  paddleHit: { frequency: 800, duration: 50 },
  wallHit: { frequency: 400, duration: 30 },
  goal: { frequency: 1200, duration: 200 },
  countdown: { frequency: 600, duration: 100 },
  gameStart: { frequency: 1000, duration: 150 },
  victory: { frequency: 1500, duration: 300 },
};

export function useSound() {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // For now, we'll use haptics as the primary feedback
  // Sound synthesis would require additional native modules

  const playPaddleHit = useCallback(() => {
    // TODO: Implement with native audio or pre-recorded sounds
    console.log('Sound: paddle hit');
  }, []);

  const playWallHit = useCallback(() => {
    console.log('Sound: wall hit');
  }, []);

  const playGoal = useCallback(() => {
    console.log('Sound: goal');
  }, []);

  const playCountdown = useCallback(() => {
    console.log('Sound: countdown');
  }, []);

  const playGameStart = useCallback(() => {
    console.log('Sound: game start');
  }, []);

  const playVictory = useCallback(() => {
    console.log('Sound: victory');
  }, []);

  return {
    playPaddleHit,
    playWallHit,
    playGoal,
    playCountdown,
    playGameStart,
    playVictory,
  };
}
