// Shared types for Air Hockey game

export interface Vector2D {
  x: number;
  y: number;
}

export interface Paddle {
  position: Vector2D;
  previousPosition: Vector2D;
  velocity: Vector2D;
  radius: number;
  playerId: string;
}

export interface Puck {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  paddle: Paddle;
  side: 'top' | 'bottom'; // top = player 1, bottom = player 2
  lastVolleyTime: number;
  comboCount: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  puck: Puck;
  status: 'waiting' | 'countdown' | 'playing' | 'paused' | 'finished';
  winner: string | null;
  startTime: number;
  lastGoalTime: number;
  puckSpeed: number; // km/h for display
  maxPuckSpeed: number;
}

export interface Room {
  id: string;
  code: string | null; // For private rooms
  players: Map<string, Player>;
  gameState: GameState;
  gameLoop: NodeJS.Timeout | null;
}

// Socket events
export interface ServerToClientEvents {
  'game-state': (state: GameState) => void;
  'matched': (data: { roomId: string; opponent: string; yourSide: 'top' | 'bottom' }) => void;
  'room-created': (data: { roomId: string; code: string }) => void;
  'room-joined': (data: { roomId: string; opponent: string; yourSide: 'top' | 'bottom' }) => void;
  'waiting-for-opponent': () => void;
  'goal': (data: { scorer: string; score: [number, number] }) => void;
  'game-over': (data: { winner: string; stats: GameStats }) => void;
  'countdown': (count: number) => void;
  'opponent-disconnected': () => void;
  'error': (message: string) => void;
  'collision': (data: { type: 'paddle' | 'wall' | 'goal'; position: Vector2D; velocity: number }) => void;
}

export interface ClientToServerEvents {
  'join-queue': (data: { playerName: string }) => void;
  'leave-queue': () => void;
  'create-room': (data: { playerName: string }) => void;
  'join-room': (data: { code: string; playerName: string }) => void;
  'paddle-move': (data: { position: Vector2D }) => void;
  'request-rematch': () => void;
  'leave-room': () => void;
}

export interface GameStats {
  duration: number;
  maxPuckSpeed: number;
  totalShots: { [playerId: string]: number };
  maxCombo: { [playerId: string]: number };
}

// Game constants
export const GAME_CONFIG = {
  // Table dimensions (normalized 0-1000)
  TABLE_WIDTH: 500,
  TABLE_HEIGHT: 800,

  // Object sizes
  PUCK_RADIUS: 20,
  PADDLE_RADIUS: 35,
  GOAL_WIDTH: 150,

  // Physics
  FRICTION: 0.997,
  RESTITUTION: 0.9,
  MAX_PUCK_SPEED: 35,
  PADDLE_HIT_BOOST: 1.5,

  // Game rules
  WINNING_SCORE: 7,
  COUNTDOWN_SECONDS: 3,

  // Tick rate
  TICK_RATE: 60,
  TICK_INTERVAL: 1000 / 60, // ~16.67ms

  // Combo timing (ms)
  COMBO_WINDOW: 500,
};
