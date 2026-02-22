// Neo-retro arcade theme colors
export const COLORS = {
  // Background
  background: '#050510',
  backgroundLight: '#0a0a20',

  // Neon colors
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  violet: '#8B5CF6',
  green: '#39FF14',
  orange: '#FF6B00',
  pink: '#FF1493',

  // Player colors
  player1: '#00FFFF', // Cyan - bottom player
  player2: '#FF00FF', // Magenta - top player

  // Puck
  puck: '#FFFFFF',
  puckFast: '#FF6B00',
  puckSuperFast: '#FF0000',

  // UI
  text: '#FFFFFF',
  textDim: '#666680',

  // Effects
  glow: 'rgba(139, 92, 246, 0.5)',
  trail: 'rgba(255, 255, 255, 0.3)',
};

export const SHADOWS = {
  neonGlow: {
    shadowColor: COLORS.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  cyanGlow: {
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  magentaGlow: {
    shadowColor: COLORS.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
};

export const FONTS = {
  title: 'monospace',
  score: 'monospace',
  body: 'System',
};
