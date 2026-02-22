"use strict";
// Shared types for Air Hockey game
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_CONFIG = void 0;
// Game constants
exports.GAME_CONFIG = {
    // Table dimensions (normalized 0-1000)
    TABLE_WIDTH: 500,
    TABLE_HEIGHT: 800,
    // Object sizes
    PUCK_RADIUS: 20,
    PADDLE_RADIUS: 35,
    GOAL_WIDTH: 150,
    // Physics
    FRICTION: 0.995,
    RESTITUTION: 0.9,
    MAX_PUCK_SPEED: 25,
    PADDLE_HIT_BOOST: 1.3,
    // Game rules
    WINNING_SCORE: 7,
    COUNTDOWN_SECONDS: 3,
    // Tick rate
    TICK_RATE: 60,
    TICK_INTERVAL: 1000 / 60, // ~16.67ms
    // Combo timing (ms)
    COMBO_WINDOW: 500,
};
//# sourceMappingURL=types.js.map