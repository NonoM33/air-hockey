// Server configuration
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://airhockey.157.180.43.90.sslip.io';

// Game configuration (must match server)
export const GAME_CONFIG = {
  // Table dimensions (normalized 0-1000)
  TABLE_WIDTH: 500,
  TABLE_HEIGHT: 800,

  // Object sizes
  PUCK_RADIUS: 20,
  PADDLE_RADIUS: 35,
  GOAL_WIDTH: 150,

  // Game rules
  WINNING_SCORE: 7,

  // Visual effects thresholds
  FAST_SPEED_THRESHOLD: 150, // km/h
  SUPER_FAST_SPEED_THRESHOLD: 250, // km/h
  SLOW_MOTION_THRESHOLD: 300, // km/h

  // Trail effect
  TRAIL_LENGTH: 15,
  TRAIL_FADE_SPEED: 0.9,
};

// Animation timing
export const ANIMATIONS = {
  GOAL_ZOOM_DURATION: 500,
  SCREEN_SHAKE_DURATION: 300,
  SLOW_MOTION_DURATION: 200,
  COUNTDOWN_DURATION: 1000,
};
