import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';
import { GAME_CONFIG } from '../constants/config';
import { GameState, Vector2D, CollisionEvent } from '../types/game';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Reserve space for scores header
const AVAILABLE_HEIGHT = SCREEN_HEIGHT * 0.75;

// Calculate scale to fit game on screen
const GAME_ASPECT_RATIO = GAME_CONFIG.TABLE_WIDTH / GAME_CONFIG.TABLE_HEIGHT;
const SCREEN_ASPECT_RATIO = SCREEN_WIDTH / AVAILABLE_HEIGHT;

let CANVAS_WIDTH: number;
let CANVAS_HEIGHT: number;
let SCALE: number;
let OFFSET_X: number;
let OFFSET_Y: number;

if (SCREEN_ASPECT_RATIO > GAME_ASPECT_RATIO) {
  CANVAS_HEIGHT = AVAILABLE_HEIGHT * 0.95;
  CANVAS_WIDTH = CANVAS_HEIGHT * GAME_ASPECT_RATIO;
  SCALE = CANVAS_HEIGHT / GAME_CONFIG.TABLE_HEIGHT;
} else {
  CANVAS_WIDTH = SCREEN_WIDTH * 0.92;
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<View | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastCollisionRef = useRef<CollisionEvent | null>(null);

  // Screen shake values
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

  // Get puck color based on speed
  const getPuckColor = useCallback(() => {
    if (!gameState) return COLORS.puck;
    const speed = gameState.puckSpeed;
    if (speed > GAME_CONFIG.SUPER_FAST_SPEED_THRESHOLD) return COLORS.puckSuperFast;
    if (speed > GAME_CONFIG.FAST_SPEED_THRESHOLD) return COLORS.puckFast;
    return COLORS.puck;
  }, [gameState]);

  // Handle touch/mouse events for paddle movement
  const handlePointerEvent = useCallback((event: React.PointerEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    let clientX: number;
    let clientY: number;

    if ('touches' in event) {
      // Touch event
      const touch = event.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Pointer event
      clientX = event.clientX;
      clientY = event.clientY;
    }

    const gamePos = toGame({ x: clientX, y: clientY });
    onPaddleMove(gamePos);
  }, [toGame, onPaddleMove]);

  // Handle collision effects
  useEffect(() => {
    if (lastCollision && lastCollision !== lastCollisionRef.current) {
      lastCollisionRef.current = lastCollision;
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

  // Draw functions
  const drawTable = useCallback((ctx: CanvasRenderingContext2D) => {
    // Table background gradient
    const gradient = ctx.createLinearGradient(OFFSET_X, OFFSET_Y, OFFSET_X, OFFSET_Y + CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0a25');
    gradient.addColorStop(0.5, '#050510');
    gradient.addColorStop(1, '#0a0a25');

    ctx.fillStyle = gradient;
    ctx.fillRect(OFFSET_X, OFFSET_Y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Center line with glow
    ctx.save();
    ctx.shadowColor = COLORS.violet;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(OFFSET_X, OFFSET_Y + CANVAS_HEIGHT / 2);
    ctx.lineTo(OFFSET_X + CANVAS_WIDTH, OFFSET_Y + CANVAS_HEIGHT / 2);
    ctx.stroke();
    ctx.restore();

    // Center circle with glow
    ctx.save();
    ctx.shadowColor = COLORS.violet;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(OFFSET_X + CANVAS_WIDTH / 2, OFFSET_Y + CANVAS_HEIGHT / 2, 60 * SCALE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Border with glow
    ctx.save();
    ctx.shadowColor = COLORS.violet;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(OFFSET_X, OFFSET_Y, CANVAS_WIDTH, CANVAS_HEIGHT, 8);
    ctx.stroke();
    ctx.restore();

    // Goals
    const goalWidth = GAME_CONFIG.GOAL_WIDTH * SCALE;
    const goalX = CANVAS_WIDTH / 2 - goalWidth / 2 + OFFSET_X;

    // Top goal (magenta)
    ctx.save();
    ctx.shadowColor = COLORS.magenta;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(goalX, OFFSET_Y - 10, goalWidth, 15);
    ctx.restore();

    // Bottom goal (cyan)
    ctx.save();
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(goalX, OFFSET_Y + CANVAS_HEIGHT - 5, goalWidth, 15);
    ctx.restore();
  }, []);

  const drawTrail = useCallback((ctx: CanvasRenderingContext2D) => {
    trailRef.current.forEach((point) => {
      ctx.save();
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.globalAlpha = point.opacity * 0.3;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(point.x, point.y, GAME_CONFIG.PUCK_RADIUS * SCALE * point.opacity * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach((particle) => {
      ctx.save();
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []);

  const drawWaitingState = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw placeholder paddles and puck when waiting for game
    const paddleRadius = GAME_CONFIG.PADDLE_RADIUS * SCALE;
    const puckRadius = GAME_CONFIG.PUCK_RADIUS * SCALE;

    // Bottom paddle (you)
    const bottomPaddle = { x: OFFSET_X + CANVAS_WIDTH / 2, y: OFFSET_Y + CANVAS_HEIGHT * 0.8 };
    ctx.save();
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(bottomPaddle.x, bottomPaddle.y, paddleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Top paddle (opponent)
    const topPaddle = { x: OFFSET_X + CANVAS_WIDTH / 2, y: OFFSET_Y + CANVAS_HEIGHT * 0.2 };
    ctx.save();
    ctx.shadowColor = COLORS.magenta;
    ctx.shadowBlur = 20;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath();
    ctx.arc(topPaddle.x, topPaddle.y, paddleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center puck
    const center = { x: OFFSET_X + CANVAS_WIDTH / 2, y: OFFSET_Y + CANVAS_HEIGHT / 2 };
    ctx.save();
    ctx.shadowColor = COLORS.puck;
    ctx.shadowBlur = 15;
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 500) * 0.2;
    ctx.fillStyle = COLORS.puck;
    ctx.beginPath();
    ctx.arc(center.x, center.y, puckRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // "Waiting" text
    ctx.save();
    ctx.font = '16px monospace';
    ctx.fillStyle = COLORS.violet;
    ctx.shadowColor = COLORS.violet;
    ctx.shadowBlur = 10;
    ctx.textAlign = 'center';
    ctx.fillText('En attente d\'un adversaire...', OFFSET_X + CANVAS_WIDTH / 2, OFFSET_Y + CANVAS_HEIGHT / 2 + 50);
    ctx.restore();
  }, []);

  const drawPuck = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!gameState?.puck) return;

    const screenPos = toScreen(gameState.puck.position);
    const puckColor = getPuckColor();
    const puckRadius = GAME_CONFIG.PUCK_RADIUS * SCALE;

    // Outer glow
    ctx.save();
    ctx.shadowColor = puckColor;
    ctx.shadowBlur = 30;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = puckColor;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, puckRadius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Main puck
    ctx.save();
    ctx.shadowColor = puckColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = puckColor;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, puckRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner highlight
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, puckRadius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [gameState, toScreen, getPuckColor]);

  const drawPaddles = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!gameState?.players) return;

    gameState.players.forEach((player) => {
      const screenPos = toScreen(player.paddle.position);
      const color = player.side === 'bottom' ? COLORS.player1 : COLORS.player2;
      const isMe = player.side === mySide;
      const paddleRadius = GAME_CONFIG.PADDLE_RADIUS * SCALE;

      // Outer glow
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 40;
      ctx.globalAlpha = isMe ? 0.4 : 0.2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, paddleRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main paddle with radial gradient
      ctx.save();
      const gradient = ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, paddleRadius
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '99');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, paddleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Inner circle (dark center)
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, paddleRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, [gameState, mySide, toScreen]);

  // Main render loop
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit below scores
    canvas.width = SCREEN_WIDTH;
    canvas.height = AVAILABLE_HEIGHT;

    const render = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Recalculate offset to center in available space
      OFFSET_X = (SCREEN_WIDTH - CANVAS_WIDTH) / 2;
      OFFSET_Y = (AVAILABLE_HEIGHT - CANVAS_HEIGHT) / 2;

      // Update trail
      if (gameState?.puck) {
        const screenPos = toScreen(gameState.puck.position);
        const speed = Math.sqrt(
          gameState.puck.velocity.x ** 2 + gameState.puck.velocity.y ** 2
        );

        if (speed > 0.5) {
          trailRef.current = [
            { x: screenPos.x, y: screenPos.y, opacity: 1 },
            ...trailRef.current.slice(0, GAME_CONFIG.TRAIL_LENGTH - 1).map(p => ({
              ...p,
              opacity: p.opacity * GAME_CONFIG.TRAIL_FADE_SPEED,
            })),
          ].filter(p => p.opacity > 0.1);
        }
      }

      // Update particles
      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          life: p.life - 0.03,
        }))
        .filter(p => p.life > 0);

      // Draw everything
      drawTable(ctx);
      if (gameState?.puck) {
        drawTrail(ctx);
        drawParticles(ctx);
        drawPuck(ctx);
        drawPaddles(ctx);
      } else {
        drawWaitingState(ctx);
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, toScreen, drawTable, drawTrail, drawParticles, drawPuck, drawPaddles, drawWaitingState]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { translateY: shakeY.value },
    ],
  }));

  // Web-specific canvas rendering
  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        <canvas
          ref={canvasRef}
          style={{
            width: SCREEN_WIDTH,
            height: AVAILABLE_HEIGHT,
            touchAction: 'none',
          }}
          onPointerMove={handlePointerEvent}
          onPointerDown={handlePointerEvent}
          onTouchMove={handlePointerEvent}
          onTouchStart={handlePointerEvent}
        />
      </Animated.View>
    );
  }

  // Fallback for native (placeholder - would need Skia or similar)
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View ref={containerRef} style={styles.touchArea}>
        <View style={styles.canvas} />
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
