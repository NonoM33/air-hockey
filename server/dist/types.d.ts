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
export interface Room {
    id: string;
    code: string | null;
    players: Map<string, Player>;
    gameState: GameState;
    gameLoop: NodeJS.Timeout | null;
}
export interface ServerToClientEvents {
    'game-state': (state: GameState) => void;
    'matched': (data: {
        roomId: string;
        opponent: string;
        yourSide: 'top' | 'bottom';
    }) => void;
    'room-created': (data: {
        roomId: string;
        code: string;
    }) => void;
    'room-joined': (data: {
        roomId: string;
        opponent: string;
        yourSide: 'top' | 'bottom';
    }) => void;
    'waiting-for-opponent': () => void;
    'goal': (data: {
        scorer: string;
        score: [number, number];
    }) => void;
    'game-over': (data: {
        winner: string;
        stats: GameStats;
    }) => void;
    'countdown': (count: number) => void;
    'opponent-disconnected': () => void;
    'error': (message: string) => void;
    'collision': (data: {
        type: 'paddle' | 'wall' | 'goal';
        position: Vector2D;
        velocity: number;
    }) => void;
}
export interface ClientToServerEvents {
    'join-queue': (data: {
        playerName: string;
    }) => void;
    'leave-queue': () => void;
    'create-room': (data: {
        playerName: string;
    }) => void;
    'join-room': (data: {
        code: string;
        playerName: string;
    }) => void;
    'paddle-move': (data: {
        position: Vector2D;
    }) => void;
    'request-rematch': () => void;
    'leave-room': () => void;
}
export interface GameStats {
    duration: number;
    maxPuckSpeed: number;
    totalShots: {
        [playerId: string]: number;
    };
    maxCombo: {
        [playerId: string]: number;
    };
}
export declare const GAME_CONFIG: {
    TABLE_WIDTH: number;
    TABLE_HEIGHT: number;
    PUCK_RADIUS: number;
    PADDLE_RADIUS: number;
    GOAL_WIDTH: number;
    FRICTION: number;
    RESTITUTION: number;
    MAX_PUCK_SPEED: number;
    PADDLE_HIT_BOOST: number;
    WINNING_SCORE: number;
    COUNTDOWN_SECONDS: number;
    TICK_RATE: number;
    TICK_INTERVAL: number;
    COMBO_WINDOW: number;
};
//# sourceMappingURL=types.d.ts.map