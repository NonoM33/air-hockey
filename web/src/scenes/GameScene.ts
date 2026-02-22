import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { COLORS, GAME_CONFIG, TRAIL_LENGTH, INTERPOLATION_FACTOR } from '../config';

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface PlayerData {
  name: string;
  score: number;
  side: 'top' | 'bottom';
  paddle: {
    position: Position;
    radius: number;
  };
}

interface PuckData {
  position: Position;
  velocity: Velocity;
  radius: number;
}

interface GameState {
  roomId: string;
  players: PlayerData[];
  puck: PuckData;
  status: string;
  puckSpeed: number;
  maxPuckSpeed: number;
}

interface GoalData {
  scorer: string;
  score: [number, number];
}

interface CollisionData {
  type: 'paddle' | 'wall' | 'goal';
  position: Position;
  velocity: Velocity;
}

interface GameOverData {
  winner: string;
  stats: {
    duration: number;
    maxPuckSpeed: number;
    totalHits: number;
  };
}

export class GameScene extends Phaser.Scene {
  // Graphics objects
  private tableGraphics!: Phaser.GameObjects.Graphics;
  private borderGlow!: Phaser.GameObjects.Graphics;
  private puckGraphics!: Phaser.GameObjects.Graphics;
  private trailGraphics!: Phaser.GameObjects.Graphics;
  private playerPaddle!: Phaser.GameObjects.Graphics;
  private opponentPaddle!: Phaser.GameObjects.Graphics;

  // Game state
  private playerSide: 'top' | 'bottom' = 'bottom';
  private playerScore: number = 0;
  private opponentScore: number = 0;
  private puckPosition: Position = { x: 250, y: 400 };
  private targetPuckPosition: Position = { x: 250, y: 400 };
  private playerPaddlePosition: Position = { x: 250, y: 650 };
  private opponentPaddlePosition: Position = { x: 250, y: 150 };
  private targetOpponentPosition: Position = { x: 250, y: 150 };
  private puckSpeed: number = 0;

  // Trail effect
  private puckTrail: Position[] = [];

  // UI elements
  private scoreText!: Phaser.GameObjects.Text;
  private speedText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;
  private goalText!: Phaser.GameObjects.Text;

  // Particles
  private collisionEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private goalEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Socket
  private socket!: Socket;

  // Touch tracking
  private isDragging: boolean = false;
  private lastSentPosition: Position = { x: 0, y: 0 };

  // Countdown state
  private isCountingDown: boolean = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.socket = this.registry.get('socket');
    this.playerSide = this.registry.get('playerSide') || 'bottom';

    // Both players always see themselves at the bottom
    this.playerPaddlePosition = { x: 250, y: 650 };
    this.opponentPaddlePosition = { x: 250, y: 150 };

    // Create game elements
    this.createTable();
    this.createPaddles();
    this.createPuck();
    this.createUI();
    this.createParticles();
    this.setupInput();
    this.setupSocketListeners();

    // Show countdown
    this.showCountdown();
  }

  private createTable(): void {
    const { TABLE_WIDTH, TABLE_HEIGHT, BORDER_WIDTH, CENTER_CIRCLE_RADIUS } = GAME_CONFIG;

    // Table background with gradient
    this.tableGraphics = this.add.graphics();
    this.tableGraphics.fillGradientStyle(COLORS.BACKGROUND, COLORS.BACKGROUND, 0x0a0a20, 0x0a0a20, 1);
    this.tableGraphics.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // Border glow layer
    this.borderGlow = this.add.graphics();

    // Draw glowing borders
    this.drawBorders();

    // Center line
    this.tableGraphics.lineStyle(2, COLORS.VIOLET, 0.6);
    this.tableGraphics.moveTo(BORDER_WIDTH, TABLE_HEIGHT / 2);
    this.tableGraphics.lineTo(TABLE_WIDTH - BORDER_WIDTH, TABLE_HEIGHT / 2);
    this.tableGraphics.strokePath();

    // Center circle
    this.tableGraphics.lineStyle(2, COLORS.VIOLET, 0.6);
    this.tableGraphics.strokeCircle(TABLE_WIDTH / 2, TABLE_HEIGHT / 2, CENTER_CIRCLE_RADIUS);

    // Goals
    this.drawGoals();
  }

  private drawBorders(): void {
    const { TABLE_WIDTH, TABLE_HEIGHT, BORDER_WIDTH, GOAL_WIDTH } = GAME_CONFIG;

    // Outer glow
    for (let i = 3; i >= 0; i--) {
      this.borderGlow.lineStyle(BORDER_WIDTH - i * 2, COLORS.VIOLET, 0.1 + i * 0.05);
      this.borderGlow.strokeRect(
        BORDER_WIDTH / 2,
        BORDER_WIDTH / 2,
        TABLE_WIDTH - BORDER_WIDTH,
        TABLE_HEIGHT - BORDER_WIDTH
      );
    }

    // Main border
    this.tableGraphics.lineStyle(BORDER_WIDTH, COLORS.VIOLET, 0.8);

    // Left border
    this.tableGraphics.moveTo(BORDER_WIDTH / 2, 0);
    this.tableGraphics.lineTo(BORDER_WIDTH / 2, TABLE_HEIGHT);

    // Right border
    this.tableGraphics.moveTo(TABLE_WIDTH - BORDER_WIDTH / 2, 0);
    this.tableGraphics.lineTo(TABLE_WIDTH - BORDER_WIDTH / 2, TABLE_HEIGHT);

    // Top border (with goal gap)
    const goalStart = (TABLE_WIDTH - GOAL_WIDTH) / 2;
    const goalEnd = (TABLE_WIDTH + GOAL_WIDTH) / 2;

    this.tableGraphics.moveTo(0, BORDER_WIDTH / 2);
    this.tableGraphics.lineTo(goalStart, BORDER_WIDTH / 2);
    this.tableGraphics.moveTo(goalEnd, BORDER_WIDTH / 2);
    this.tableGraphics.lineTo(TABLE_WIDTH, BORDER_WIDTH / 2);

    // Bottom border (with goal gap)
    this.tableGraphics.moveTo(0, TABLE_HEIGHT - BORDER_WIDTH / 2);
    this.tableGraphics.lineTo(goalStart, TABLE_HEIGHT - BORDER_WIDTH / 2);
    this.tableGraphics.moveTo(goalEnd, TABLE_HEIGHT - BORDER_WIDTH / 2);
    this.tableGraphics.lineTo(TABLE_WIDTH, TABLE_HEIGHT - BORDER_WIDTH / 2);

    this.tableGraphics.strokePath();
  }

  private drawGoals(): void {
    const { TABLE_WIDTH, TABLE_HEIGHT, BORDER_WIDTH, GOAL_WIDTH } = GAME_CONFIG;
    const goalStart = (TABLE_WIDTH - GOAL_WIDTH) / 2;
    const goalEnd = (TABLE_WIDTH + GOAL_WIDTH) / 2;

    // Top goal (magenta if player is bottom, cyan if player is top)
    const topGoalColor = this.playerSide === 'bottom' ? COLORS.MAGENTA : COLORS.CYAN;
    const bottomGoalColor = this.playerSide === 'bottom' ? COLORS.CYAN : COLORS.MAGENTA;

    // Draw goal glows
    for (let i = 0; i < 4; i++) {
      this.tableGraphics.lineStyle(6 - i, topGoalColor, 0.2 + i * 0.1);
      this.tableGraphics.moveTo(goalStart, BORDER_WIDTH / 2);
      this.tableGraphics.lineTo(goalEnd, BORDER_WIDTH / 2);
    }

    for (let i = 0; i < 4; i++) {
      this.tableGraphics.lineStyle(6 - i, bottomGoalColor, 0.2 + i * 0.1);
      this.tableGraphics.moveTo(goalStart, TABLE_HEIGHT - BORDER_WIDTH / 2);
      this.tableGraphics.lineTo(goalEnd, TABLE_HEIGHT - BORDER_WIDTH / 2);
    }

    this.tableGraphics.strokePath();
  }

  private createPaddles(): void {

    // Player paddle (always appears at bottom after rotation)
    this.playerPaddle = this.add.graphics();
    this.drawPaddle(this.playerPaddle, COLORS.CYAN, this.playerPaddlePosition);

    // Opponent paddle
    this.opponentPaddle = this.add.graphics();
    this.drawPaddle(this.opponentPaddle, COLORS.MAGENTA, this.opponentPaddlePosition);
  }

  private drawPaddle(graphics: Phaser.GameObjects.Graphics, color: number, pos: Position): void {
    const { PADDLE_RADIUS } = GAME_CONFIG;
    graphics.clear();

    // Outer glow
    for (let i = 4; i >= 0; i--) {
      graphics.fillStyle(color, 0.05 + i * 0.02);
      graphics.fillCircle(pos.x, pos.y, PADDLE_RADIUS + 10 - i * 2);
    }

    // Gradient fill (simulated with concentric circles)
    const steps = 10;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const alpha = 0.8 - ratio * 0.3;
      graphics.fillStyle(color, alpha);
      graphics.fillCircle(pos.x, pos.y, PADDLE_RADIUS * (1 - ratio * 0.3));
    }

    // Center highlight
    graphics.fillStyle(0xFFFFFF, 0.3);
    graphics.fillCircle(pos.x - PADDLE_RADIUS * 0.2, pos.y - PADDLE_RADIUS * 0.2, PADDLE_RADIUS * 0.3);

    // Outer ring
    graphics.lineStyle(3, color, 1);
    graphics.strokeCircle(pos.x, pos.y, PADDLE_RADIUS);
  }

  private createPuck(): void {
    // Trail graphics (behind puck)
    this.trailGraphics = this.add.graphics();

    // Puck graphics
    this.puckGraphics = this.add.graphics();
    this.drawPuck();
  }

  private drawPuck(): void {
    const { PUCK_RADIUS } = GAME_CONFIG;
    this.puckGraphics.clear();

    // Calculate color based on speed
    const maxSpeed = 1500;
    const speedRatio = Math.min(this.puckSpeed / maxSpeed, 1);
    const whiteColor = new Phaser.Display.Color(255, 255, 255);
    const goldColor = new Phaser.Display.Color(255, 215, 0);
    const puckColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      whiteColor,
      goldColor,
      100,
      speedRatio * 100
    );
    const colorInt = Phaser.Display.Color.GetColor(puckColor.r, puckColor.g, puckColor.b);

    const pos = this.puckPosition;

    // Outer glow (increases with speed)
    const glowSize = PUCK_RADIUS + 5 + speedRatio * 10;
    for (let i = 4; i >= 0; i--) {
      this.puckGraphics.fillStyle(colorInt, 0.03 + i * 0.02 + speedRatio * 0.05);
      this.puckGraphics.fillCircle(pos.x, pos.y, glowSize - i * 2);
    }

    // Main puck body
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const alpha = 1 - ratio * 0.4;
      this.puckGraphics.fillStyle(colorInt, alpha);
      this.puckGraphics.fillCircle(pos.x, pos.y, PUCK_RADIUS * (1 - ratio * 0.2));
    }

    // Center highlight
    this.puckGraphics.fillStyle(0xFFFFFF, 0.5);
    this.puckGraphics.fillCircle(pos.x - PUCK_RADIUS * 0.15, pos.y - PUCK_RADIUS * 0.15, PUCK_RADIUS * 0.25);

    // Outer ring
    this.puckGraphics.lineStyle(2, colorInt, 1);
    this.puckGraphics.strokeCircle(pos.x, pos.y, PUCK_RADIUS);
  }

  private drawTrail(): void {
    this.trailGraphics.clear();
    const { PUCK_RADIUS } = GAME_CONFIG;

    // Calculate color based on speed
    const maxSpeed = 1500;
    const speedRatio = Math.min(this.puckSpeed / maxSpeed, 1);

    for (let i = 0; i < this.puckTrail.length; i++) {
      const pos = this.puckTrail[i];
      const alpha = (i / this.puckTrail.length) * 0.4 * (0.5 + speedRatio * 0.5);
      const radius = PUCK_RADIUS * (0.3 + (i / this.puckTrail.length) * 0.5);

      const cyanColor = new Phaser.Display.Color(0, 255, 255);
      const goldColor = new Phaser.Display.Color(255, 215, 0);
      const trailColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        cyanColor,
        goldColor,
        100,
        speedRatio * 100
      );
      const colorInt = Phaser.Display.Color.GetColor(trailColor.r, trailColor.g, trailColor.b);

      this.trailGraphics.fillStyle(colorInt, alpha);
      this.trailGraphics.fillCircle(pos.x, pos.y, radius);
    }
  }

  private createUI(): void {
    const { TABLE_WIDTH } = GAME_CONFIG;

    // Score display
    this.scoreText = this.add.text(TABLE_WIDTH / 2, 50, '0 - 0', {
      fontFamily: '"Courier New", monospace',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#FFFFFF'
    }).setOrigin(0.5);
    this.scoreText.setShadow(0, 0, '#FFFFFF', 10, true, true);

    // Speed display
    this.speedText = this.add.text(TABLE_WIDTH - 20, 100, '0 km/h', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8B5CF6'
    }).setOrigin(1, 0.5);

    // Countdown text (hidden initially)
    this.countdownText = this.add.text(TABLE_WIDTH / 2, 400, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '120px',
      fontStyle: 'bold',
      color: '#00FFFF'
    }).setOrigin(0.5).setAlpha(0);

    // Goal text (hidden initially)
    this.goalText = this.add.text(TABLE_WIDTH / 2, 350, 'GOAL!', {
      fontFamily: '"Courier New", monospace',
      fontSize: '72px',
      fontStyle: 'bold',
      color: '#39FF14'
    }).setOrigin(0.5).setAlpha(0);
    this.goalText.setShadow(0, 0, '#39FF14', 20, true, true);

    // Player names
    const opponent = this.registry.get('opponent') || 'Opponent';
    const playerName = this.registry.get('playerName') || 'You';

    this.add.text(20, 20, opponent.toUpperCase(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#FF00FF'
    });

    this.add.text(20, 780, playerName.toUpperCase(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#00FFFF'
    });
  }

  private createParticles(): void {
    // Collision particles
    this.collisionEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 100, max: 300 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 400,
      blendMode: 'ADD',
      emitting: false
    });

    // Goal particles
    this.goalEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 200, max: 500 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 800,
      blendMode: 'ADD',
      gravityY: 200,
      emitting: false
    });
  }

  private setupInput(): void {

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isCountingDown) return;
      this.isDragging = true;
      this.updatePaddlePosition(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isCountingDown) return;
      this.updatePaddlePosition(pointer);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.input.on('pointerout', () => {
      this.isDragging = false;
    });
  }

  private updatePaddlePosition(pointer: Phaser.Input.Pointer): void {
    const { TABLE_WIDTH, TABLE_HEIGHT, PADDLE_RADIUS, BORDER_WIDTH } = GAME_CONFIG;

    let x = pointer.x;
    let y = pointer.y;

    // Both players always play from the bottom half of their screen
    const halfHeight = TABLE_HEIGHT / 2;
    y = Phaser.Math.Clamp(y, halfHeight + PADDLE_RADIUS, TABLE_HEIGHT - BORDER_WIDTH - PADDLE_RADIUS);

    // Constrain X to table bounds
    x = Phaser.Math.Clamp(x, BORDER_WIDTH + PADDLE_RADIUS, TABLE_WIDTH - BORDER_WIDTH - PADDLE_RADIUS);

    this.playerPaddlePosition = { x, y };

    // Send to server (throttled)
    const dist = Math.hypot(x - this.lastSentPosition.x, y - this.lastSentPosition.y);
    if (dist > 2) {
      let serverX = x;
      let serverY = y;

      // Convert coordinates if player is top (server always expects non-rotated coords)
      if (this.playerSide === 'top') {
        serverX = TABLE_WIDTH - x;
        serverY = TABLE_HEIGHT - y;
      }

      this.socket.emit('paddle-move', { position: { x: serverX, y: serverY } });
      this.lastSentPosition = { x, y };
    }

    // Update paddle immediately
    this.drawPaddle(this.playerPaddle, COLORS.CYAN, this.playerPaddlePosition);
  }

  private setupSocketListeners(): void {
    this.socket.on('countdown', (count: number) => {
      this.showCountdownNumber(count);
    });

    this.socket.on('game-state', (state: GameState) => {
      this.handleGameState(state);
    });

    this.socket.on('goal', (data: GoalData) => {
      this.handleGoal(data);
    });

    this.socket.on('collision', (data: CollisionData) => {
      this.handleCollision(data);
    });

    this.socket.on('game-over', (data: GameOverData) => {
      this.handleGameOver(data);
    });

    this.socket.on('opponent-disconnected', () => {
      this.handleOpponentDisconnected();
    });
  }

  private showCountdown(): void {
    this.isCountingDown = true;
  }

  private showCountdownNumber(count: number): void {
    if (count > 0) {
      this.countdownText.setText(count.toString());
      this.countdownText.setAlpha(1);
      this.countdownText.setScale(2);

      this.tweens.add({
        targets: this.countdownText,
        scale: 1,
        alpha: 0,
        duration: 900,
        ease: 'Power2'
      });
    } else {
      // GO!
      this.countdownText.setText('GO!');
      this.countdownText.setAlpha(1);
      this.countdownText.setScale(1.5);
      this.countdownText.setColor('#39FF14');
      this.countdownText.setShadow(0, 0, '#39FF14', 20, true, true);

      this.tweens.add({
        targets: this.countdownText,
        scale: 2,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => {
          this.isCountingDown = false;
          this.countdownText.setColor('#00FFFF');
          this.countdownText.setShadow(0, 0, '#00FFFF', 10, true, true);
        }
      });
    }
  }

  private handleGameState(state: GameState): void {
    const { TABLE_WIDTH, TABLE_HEIGHT } = GAME_CONFIG;

    // Update puck
    let puckX = state.puck.position.x;
    let puckY = state.puck.position.y;

    // Rotate coordinates if player is top
    if (this.playerSide === 'top') {
      puckX = TABLE_WIDTH - puckX;
      puckY = TABLE_HEIGHT - puckY;
    }

    this.targetPuckPosition = { x: puckX, y: puckY };
    void state.puck.velocity;
    this.puckSpeed = state.puckSpeed;

    // Update opponent paddle
    const opponent = state.players.find(p => p.side !== this.playerSide);
    if (opponent) {
      let oppX = opponent.paddle.position.x;
      let oppY = opponent.paddle.position.y;

      if (this.playerSide === 'top') {
        oppX = TABLE_WIDTH - oppX;
        oppY = TABLE_HEIGHT - oppY;
      }

      this.targetOpponentPosition = { x: oppX, y: oppY };
    }

    // Update scores
    const player = state.players.find(p => p.side === this.playerSide);
    if (player && opponent) {
      this.playerScore = player.score;
      this.opponentScore = opponent.score;
      this.scoreText.setText(`${this.opponentScore} - ${this.playerScore}`);
    }

    // Update speed display
    const speedKmh = Math.round(this.puckSpeed * 0.1);
    this.speedText.setText(`${speedKmh} km/h`);
  }

  private handleGoal(data: GoalData): void {
    const { TABLE_WIDTH, TABLE_HEIGHT } = GAME_CONFIG;
    const playerName = this.registry.get('playerName');
    const isPlayerGoal = data.scorer === playerName;

    // Update scores
    if (this.playerSide === 'bottom') {
      this.playerScore = data.score[1];
      this.opponentScore = data.score[0];
    } else {
      this.playerScore = data.score[0];
      this.opponentScore = data.score[1];
    }
    this.scoreText.setText(`${this.opponentScore} - ${this.playerScore}`);

    // Show GOAL text
    this.goalText.setColor(isPlayerGoal ? '#39FF14' : '#FF0000');
    this.goalText.setShadow(0, 0, isPlayerGoal ? '#39FF14' : '#FF0000', 20, true, true);
    this.goalText.setAlpha(1);
    this.goalText.setScale(0.5);

    this.tweens.add({
      targets: this.goalText,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: this.goalText,
          alpha: 0,
          duration: 500,
          delay: 500
        });
      }
    });

    // Particles at goal position
    const goalY = isPlayerGoal ? 0 : TABLE_HEIGHT;
    this.goalEmitter.setPosition(TABLE_WIDTH / 2, goalY);
    this.goalEmitter.setParticleTint(isPlayerGoal ? COLORS.GREEN : COLORS.MAGENTA);
    this.goalEmitter.explode(30);

    // Camera shake
    this.cameras.main.shake(300, 0.02);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }

  private handleCollision(data: CollisionData): void {
    const { TABLE_WIDTH, TABLE_HEIGHT } = GAME_CONFIG;

    let posX = data.position.x;
    let posY = data.position.y;

    // Rotate if top player
    if (this.playerSide === 'top') {
      posX = TABLE_WIDTH - posX;
      posY = TABLE_HEIGHT - posY;
    }

    // Particles
    let color = COLORS.WHITE;
    if (data.type === 'paddle') {
      color = COLORS.CYAN;
    } else if (data.type === 'wall') {
      color = COLORS.VIOLET;
      // Flash border
      this.flashBorder(posX, posY);
    }

    this.collisionEmitter.setPosition(posX, posY);
    this.collisionEmitter.setParticleTint(color);
    this.collisionEmitter.explode(10);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  private flashBorder(x: number, y: number): void {
    const { TABLE_WIDTH, TABLE_HEIGHT, BORDER_WIDTH } = GAME_CONFIG;

    const flashGraphics = this.add.graphics();
    flashGraphics.lineStyle(BORDER_WIDTH, COLORS.WHITE, 0.8);

    // Determine which border was hit
    if (x <= BORDER_WIDTH + 5) {
      // Left border
      flashGraphics.moveTo(BORDER_WIDTH / 2, 0);
      flashGraphics.lineTo(BORDER_WIDTH / 2, TABLE_HEIGHT);
    } else if (x >= TABLE_WIDTH - BORDER_WIDTH - 5) {
      // Right border
      flashGraphics.moveTo(TABLE_WIDTH - BORDER_WIDTH / 2, 0);
      flashGraphics.lineTo(TABLE_WIDTH - BORDER_WIDTH / 2, TABLE_HEIGHT);
    } else if (y <= BORDER_WIDTH + 5) {
      // Top border
      flashGraphics.moveTo(0, BORDER_WIDTH / 2);
      flashGraphics.lineTo(TABLE_WIDTH, BORDER_WIDTH / 2);
    } else if (y >= TABLE_HEIGHT - BORDER_WIDTH - 5) {
      // Bottom border
      flashGraphics.moveTo(0, TABLE_HEIGHT - BORDER_WIDTH / 2);
      flashGraphics.lineTo(TABLE_WIDTH, TABLE_HEIGHT - BORDER_WIDTH / 2);
    }

    flashGraphics.strokePath();

    this.tweens.add({
      targets: flashGraphics,
      alpha: 0,
      duration: 200,
      onComplete: () => flashGraphics.destroy()
    });
  }

  private handleGameOver(data: GameOverData): void {
    this.cleanupListeners();

    this.registry.set('gameResult', {
      winner: data.winner,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      stats: data.stats,
      playerName: this.registry.get('playerName'),
      opponent: this.registry.get('opponent')
    });

    this.time.delayedCall(1500, () => {
      this.scene.start('ResultScene');
    });
  }

  private handleOpponentDisconnected(): void {
    const { TABLE_WIDTH } = GAME_CONFIG;

    const disconnectText = this.add.text(TABLE_WIDTH / 2, 400, 'OPPONENT LEFT', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#FF0000'
    }).setOrigin(0.5);
    disconnectText.setShadow(0, 0, '#FF0000', 15, true, true);

    this.time.delayedCall(2000, () => {
      this.cleanupListeners();
      this.scene.start('MenuScene');
    });
  }

  private cleanupListeners(): void {
    this.socket.off('countdown');
    this.socket.off('game-state');
    this.socket.off('goal');
    this.socket.off('collision');
    this.socket.off('game-over');
    this.socket.off('opponent-disconnected');
  }

  update(_time: number, _delta: number): void {
    // Interpolate puck position
    this.puckPosition.x = Phaser.Math.Linear(this.puckPosition.x, this.targetPuckPosition.x, INTERPOLATION_FACTOR);
    this.puckPosition.y = Phaser.Math.Linear(this.puckPosition.y, this.targetPuckPosition.y, INTERPOLATION_FACTOR);

    // Interpolate opponent paddle
    this.opponentPaddlePosition.x = Phaser.Math.Linear(this.opponentPaddlePosition.x, this.targetOpponentPosition.x, INTERPOLATION_FACTOR);
    this.opponentPaddlePosition.y = Phaser.Math.Linear(this.opponentPaddlePosition.y, this.targetOpponentPosition.y, INTERPOLATION_FACTOR);

    // Update trail
    this.puckTrail.push({ x: this.puckPosition.x, y: this.puckPosition.y });
    if (this.puckTrail.length > TRAIL_LENGTH) {
      this.puckTrail.shift();
    }

    // Redraw
    this.drawTrail();
    this.drawPuck();
    this.drawPaddle(this.opponentPaddle, COLORS.MAGENTA, this.opponentPaddlePosition);
  }
}
