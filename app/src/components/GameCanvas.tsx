import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, GestureResponderEvent } from 'react-native';
import {
  Canvas,
  Circle,
  LinearGradient,
  RadialGradient,
  Rect,
  vec,
  Line,
  Group,
  RoundedRect,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/config';
import { GameState, Vector2D, CollisionEvent } from '../types/game';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate scale to fit game on screen
const GAME_ASPECT_RATIO = GAME_CONFIG.TABLE_WIDTH / GAME_CONFIG.TABLE_HEIGHT;
const SCREEN_ASPECT_RATIO = SCREEN_WIDTH / SCREEN_HEIGHT;

let CANVAS_WIDTH: number;
let CANVAS_HEIGHT: number;
let SCALE: number;
let OFFSET_X: number;
let OFFSET_Y: number;

if (SCREEN_ASPECT_RATIO > GAME_ASPECT_RATIO) {
  // Screen is wider than game
  CANVAS_HEIGHT = SCREEN_HEIGHT * 0.85;
  CANVAS_WIDTH = CANVAS_HEIGHT * GAME_ASPECT_RATIO;
  SCALE = CANVAS_HEIGHT / GAME_CONFIG.TABLE_HEIGHT;
} else {
  // Screen is taller than game
  CANVAS_WIDTH = SCREEN_WIDTH * 0.95;
  CANVAS_HEIGHT = CANVAS_WIDTH / GAME_ASPECT_RATIO;
  SCALE = CANVAS_WIDTH / GAME_CONFIG.TABLE_WIDTH;
}

OFFSET_X = (SCREEN_WIDTH - CANVAS_WIDTH) / 2;
OFFSET_Y = (SCREEN_HEIGHT - CANVAS_HEIGHT) / 2;

interface TrailPoint {
  x: number;
  y: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface GameCanvasProps {
  gameState: GameState | null;
  mySide: 'top' | 'bottom';
  onPaddleMove: (position: Vector2D) => void;
  lastCollision: CollisionEvent | null;
}

export function GameCanvas({
  gameState,
  mySide,
  onPaddleMove,
  lastCollision,
}: GameCanvasProps) {
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  // Screen shake
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);

  // Convert game coordinates to screen coordinates
  const toScreen = useCallback((pos: Vector2D): Vector2D => {
    // Flip Y for bottom player view
    const y = mySide === 'bottom' ? GAME_CONFIG.TABLE_HEIGHT - pos.y : pos.y;
    return {
      x: pos.x * SCALE + OFFSET_X,
      y: y * SCALE + OFFSET_Y,
    };
  }, [mySide]);

  // Convert screen coordinates to game coordinates
  const toGame = useCallback((screenPos: Vector2D): Vector2D => {
    const x = (screenPos.x - OFFSET_X) / SCALE;
    let y = (screenPos.y - OFFSET_Y) / SCALE;
    // Flip Y for bottom player
    if (mySide === 'bottom') {
      y = GAME_CONFIG.TABLE_HEIGHT - y;
    }
    return { x, y };
  }, [mySide]);

  // Handle touch for paddle movement
  const handleTouch = useCallback((event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const gamePos = toGame({ x: pageX, y: pageY });
    onPaddleMove(gamePos);
  }, [toGame, onPaddleMove]);

  // Update puck trail
  useEffect(() => {
    if (gameState?.puck) {
      const screenPos = toScreen(gameState.puck.position);
      const speed = Math.sqrt(
        gameState.puck.velocity.x ** 2 + gameState.puck.velocity.y ** 2
      );

      // Only add to trail if puck is moving
      if (speed > 0.5) {
        trailRef.current = [
          { x: screenPos.x, y: screenPos.y, opacity: 1 },
          ...trailRef.current.slice(0, GAME_CONFIG.TRAIL_LENGTH - 1).map(p => ({
            ...p,
            opacity: p.opacity * GAME_CONFIG.TRAIL_FADE_SPEED,
          })),
        ].filter(p => p.opacity > 0.1);
        setTrail([...trailRef.current]);
      }
    }
  }, [gameState?.puck?.position, toScreen]);

  // Handle collision effects
  useEffect(() => {
    if (lastCollision) {
      const screenPos = toScreen(lastCollision.position);

      // Add particles
      const newParticles: Particle[] = [];
      const particleCount = lastCollision.type === 'goal' ? 30 : 10;
      const colors = lastCollision.type === 'goal'
        ? [COLORS.cyan, COLORS.magenta, COLORS.green, COLORS.orange]
        : [COLORS.violet, COLORS.cyan];

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
        const speed = 2 + Math.random() * 4;
        newParticles.push({
          x: screenPos.x,
          y: screenPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 3,
        });
      }

      particlesRef.current = [...particlesRef.current, ...newParticles];
      setParticles([...particlesRef.current]);

      // Screen shake for goals
      if (lastCollision.type === 'goal') {
        shakeX.value = withSequence(
          withTiming(10, { duration: 50 }),
          withTiming(-10, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
        shakeY.value = withSequence(
          withTiming(-10, { duration: 50 }),
          withTiming(10, { duration: 50 }),
          withTiming(-5, { duration: 50 }),
          withTiming(5, { duration: 50 }),
          withTiming(0, { duration: 50 })
        );
      }
    }
  }, [lastCollision, toScreen, shakeX, shakeY]);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: p.life - 0.03,
        }))
        .filter(p => p.life > 0);
      setParticles([...particlesRef.current]);
    }, 16);

    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  // Get puck color based on speed
  const getPuckColor = () => {
    if (!gameState) return COLORS.puck;
    const speed = gameState.puckSpeed;
    if (speed > GAME_CONFIG.SUPER_FAST_SPEED_THRESHOLD) return COLORS.puckSuperFast;
    if (speed > GAME_CONFIG.FAST_SPEED_THRESHOLD) return COLORS.puckFast;
    return COLORS.puck;
  };

  // Render table
  const renderTable = () => {
    const goalWidth = GAME_CONFIG.GOAL_WIDTH * SCALE;
    const goalX = CANVAS_WIDTH / 2 - goalWidth / 2 + OFFSET_X;

    return (
      <>
        {/* Table background */}
        <Rect
          x={OFFSET_X}
          y={OFFSET_Y}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        >
          <LinearGradient
            start={vec(OFFSET_X, OFFSET_Y)}
            end={vec(OFFSET_X, OFFSET_Y + CANVAS_HEIGHT)}
            colors={['#0a0a25', '#050510', '#0a0a25']}
          />
        </Rect>

        {/* Center line */}
        <Line
          p1={vec(OFFSET_X, OFFSET_Y + CANVAS_HEIGHT / 2)}
          p2={vec(OFFSET_X + CANVAS_WIDTH, OFFSET_Y + CANVAS_HEIGHT / 2)}
          color={COLORS.violet}
          strokeWidth={2}
          style="stroke"
        >
          <BlurMask blur={4} style="normal" />
        </Line>

        {/* Center circle */}
        <Circle
          cx={OFFSET_X + CANVAS_WIDTH / 2}
          cy={OFFSET_Y + CANVAS_HEIGHT / 2}
          r={60 * SCALE}
          color={COLORS.violet}
          style="stroke"
          strokeWidth={2}
        >
          <BlurMask blur={4} style="normal" />
        </Circle>

        {/* Border */}
        <RoundedRect
          x={OFFSET_X}
          y={OFFSET_Y}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          r={8}
          color={COLORS.violet}
          style="stroke"
          strokeWidth={4}
        >
          <BlurMask blur={6} style="normal" />
        </RoundedRect>

        {/* Goals */}
        {/* Top goal */}
        <Rect
          x={goalX}
          y={OFFSET_Y - 10}
          width={goalWidth}
          height={15}
          color={COLORS.magenta}
        >
          <BlurMask blur={8} style="normal" />
        </Rect>

        {/* Bottom goal */}
        <Rect
          x={goalX}
          y={OFFSET_Y + CANVAS_HEIGHT - 5}
          width={goalWidth}
          height={15}
          color={COLORS.cyan}
        >
          <BlurMask blur={8} style="normal" />
        </Rect>
      </>
    );
  };

  // Render puck trail
  const renderTrail = () => {
    return trail.map((point, index) => (
      <Circle
        key={`trail-${index}`}
        cx={point.x}
        cy={point.y}
        r={GAME_CONFIG.PUCK_RADIUS * SCALE * point.opacity * 0.8}
        color={`rgba(255, 255, 255, ${point.opacity * 0.3})`}
      >
        <BlurMask blur={6} style="normal" />
      </Circle>
    ));
  };

  // Render particles
  const renderParticles = () => {
    return particles.map((particle, index) => (
      <Circle
        key={`particle-${index}`}
        cx={particle.x}
        cy={particle.y}
        r={particle.size * particle.life}
        color={particle.color}
        opacity={particle.life}
      >
        <BlurMask blur={3} style="normal" />
      </Circle>
    ));
  };

  // Render puck
  const renderPuck = () => {
    if (!gameState?.puck) return null;

    const screenPos = toScreen(gameState.puck.position);
    const puckColor = getPuckColor();

    return (
      <Group>
        {/* Outer glow */}
        <Circle
          cx={screenPos.x}
          cy={screenPos.y}
          r={GAME_CONFIG.PUCK_RADIUS * SCALE * 1.5}
          color={puckColor}
          opacity={0.3}
        >
          <BlurMask blur={15} style="normal" />
        </Circle>
        {/* Main puck */}
        <Circle
          cx={screenPos.x}
          cy={screenPos.y}
          r={GAME_CONFIG.PUCK_RADIUS * SCALE}
          color={puckColor}
        >
          <BlurMask blur={2} style="normal" />
        </Circle>
        {/* Inner highlight */}
        <Circle
          cx={screenPos.x}
          cy={screenPos.y}
          r={GAME_CONFIG.PUCK_RADIUS * SCALE * 0.5}
          color="#FFFFFF"
          opacity={0.8}
        />
      </Group>
    );
  };

  // Render paddles
  const renderPaddles = () => {
    if (!gameState?.players) return null;

    return gameState.players.map((player) => {
      const screenPos = toScreen(player.paddle.position);
      const color = player.side === 'bottom' ? COLORS.player1 : COLORS.player2;
      const isMe = player.side === mySide;

      return (
        <Group key={player.id}>
          {/* Outer glow */}
          <Circle
            cx={screenPos.x}
            cy={screenPos.y}
            r={GAME_CONFIG.PADDLE_RADIUS * SCALE * 1.4}
            color={color}
            opacity={isMe ? 0.4 : 0.2}
          >
            <BlurMask blur={20} style="normal" />
          </Circle>
          {/* Main paddle */}
          <Circle
            cx={screenPos.x}
            cy={screenPos.y}
            r={GAME_CONFIG.PADDLE_RADIUS * SCALE}
          >
            <RadialGradient
              c={vec(screenPos.x, screenPos.y)}
              r={GAME_CONFIG.PADDLE_RADIUS * SCALE}
              colors={[color, `${color}99`]}
            />
          </Circle>
          {/* Inner circle */}
          <Circle
            cx={screenPos.x}
            cy={screenPos.y}
            r={GAME_CONFIG.PADDLE_RADIUS * SCALE * 0.4}
            color="#000000"
            opacity={0.5}
          />
        </Group>
      );
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={styles.touchArea}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderMove={handleTouch}
        onResponderGrant={handleTouch}
      >
        <Canvas style={styles.canvas}>
          {renderTable()}
          {renderTrail()}
          {renderParticles()}
          {renderPuck()}
          {renderPaddles()}
        </Canvas>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  touchArea: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
