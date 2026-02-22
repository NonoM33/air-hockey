// Game types (matching server types)

export interface Vector2D {
  x: number;
  y: number;
}

export interface Paddle {
  position: Vector2D;
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
  side: 'top' | 'bottom';
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
  puckSpeed: number;
  maxPuckSpeed: number;
}

export interface GameStats {
  duration: number;
  maxPuckSpeed: number;
  totalShots: { [playerId: string]: number };
  maxCombo: { [playerId: string]: number };
}

export interface CollisionEvent {
  type: 'paddle' | 'wall' | 'goal';
  position: Vector2D;
  velocity: number;
  playerId?: string;
}

export interface MatchData {
  roomId: string;
  opponent: string;
  yourSide: 'top' | 'bottom';
}

export interface RoomData {
  roomId: string;
  code: string;
}

export interface GoalData {
  scorer: string;
  score: [number, number];
}

export interface GameOverData {
  winner: string;
  stats: GameStats;
}
