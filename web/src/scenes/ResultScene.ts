import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { COLORS } from '../config';

interface GameResult {
  winner: string;
  playerScore: number;
  opponentScore: number;
  stats: {
    duration: number;
    maxPuckSpeed: number;
    totalHits: number;
  };
  playerName: string;
  opponent: string;
}

export class ResultScene extends Phaser.Scene {

  constructor() {
    super({ key: 'ResultScene' });
  }

  create(): void {
    void this.scale;
    const result: GameResult = this.registry.get('gameResult');

    if (!result) {
      this.scene.start('MenuScene');
      return;
    }

    const isWinner = result.winner === result.playerName;

    // Background
    this.createBackground(isWinner);

    // Result header
    this.createResultHeader(isWinner);

    // Score display
    this.createScoreDisplay(result);

    // Stats
    this.createStats(result);

    // Buttons
    this.createButtons();

    // Confetti for winner
    if (isWinner) {
      this.createConfetti();
    }
  }

  private createBackground(isWinner: boolean): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();

    // Radial gradient
    const centerColor = isWinner ? COLORS.GREEN : COLORS.MAGENTA;
    for (let i = 20; i >= 0; i--) {
      const alpha = 0.03 * (20 - i) / 20;
      graphics.fillStyle(centerColor, alpha);
      graphics.fillCircle(width / 2, height / 3, 200 + i * 20);
    }
  }

  private createResultHeader(isWinner: boolean): void {
    const { width } = this.scale;

    const resultText = isWinner ? 'VICTORY!' : 'DEFEAT';
    const resultColor = isWinner ? '#39FF14' : '#FF0000';

    const header = this.add.text(width / 2, 100, resultText, {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: resultColor
    }).setOrigin(0.5);
    header.setShadow(0, 0, resultColor, 25, true, true);

    // Pulse animation
    this.tweens.add({
      targets: header,
      scale: { from: 1, to: 1.1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Trophy or X icon
    const icon = this.add.text(width / 2, 170, isWinner ? '🏆' : '💀', {
      fontSize: '48px'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: icon,
      y: 165,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createScoreDisplay(result: GameResult): void {
    const { width } = this.scale;

    // Player names and scores
    const container = this.add.container(width / 2, 280);

    // Opponent (top)
    const opponentName = this.add.text(0, -50, result.opponent.toUpperCase(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#FF00FF'
    }).setOrigin(0.5);

    const opponentScore = this.add.text(0, -15, result.opponentScore.toString(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#FF00FF'
    }).setOrigin(0.5);
    opponentScore.setShadow(0, 0, '#FF00FF', 10, true, true);

    // VS divider
    const divider = this.add.text(0, 35, '—', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Player (bottom)
    const playerScore = this.add.text(0, 75, result.playerScore.toString(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#00FFFF'
    }).setOrigin(0.5);
    playerScore.setShadow(0, 0, '#00FFFF', 10, true, true);

    const playerName = this.add.text(0, 115, result.playerName.toUpperCase(), {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#00FFFF'
    }).setOrigin(0.5);

    container.add([opponentName, opponentScore, divider, playerScore, playerName]);

    // Animate scores
    this.tweens.add({
      targets: [opponentScore, playerScore],
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
      delay: 200
    });
  }

  private createStats(result: GameResult): void {
    const { width } = this.scale;

    const statsContainer = this.add.container(width / 2, 480);

    // Stats box
    const bg = this.add.graphics();
    bg.lineStyle(2, COLORS.VIOLET, 0.5);
    bg.strokeRoundedRect(-120, -70, 240, 140, 8);

    // Title
    const title = this.add.text(0, -55, 'GAME STATS', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Duration
    const durationSec = Math.round(result.stats.duration / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationText = this.add.text(0, -20, `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    // Max speed
    const maxSpeedKmh = Math.round(result.stats.maxPuckSpeed * 0.1);
    const speedText = this.add.text(0, 10, `Max Speed: ${maxSpeedKmh} km/h`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    // Total hits
    const hitsText = this.add.text(0, 40, `Total Hits: ${result.stats.totalHits}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#FFFFFF'
    }).setOrigin(0.5);

    statsContainer.add([bg, title, durationText, speedText, hitsText]);
  }

  private createButtons(): void {
    const { width, height } = this.scale;

    // New Game button
    this.createButton(width / 2, height - 120, 'NEW GAME', COLORS.GREEN, () => {
      this.scene.start('MenuScene');
    });

    // Rematch button (join queue again)
    this.createButton(width / 2, height - 60, 'PLAY AGAIN', COLORS.CYAN, () => {
      const socket: Socket = this.registry.get('socket');
      const playerName = this.registry.get('playerName');

      if (socket && playerName) {
        this.registry.set('lobbyMode', 'matchmaking');
        socket.emit('join-queue', { playerName });
        this.scene.start('LobbyScene');
      } else {
        this.scene.start('MenuScene');
      }
    });
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.lineStyle(3, color);
    bg.strokeRoundedRect(-100, -22, 200, 44, 10);

    const buttonText = this.add.text(0, 0, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    buttonText.setShadow(0, 0, '#' + color.toString(16).padStart(6, '0'), 8, true, true);

    container.add([bg, buttonText]);

    const hitArea = this.add.rectangle(0, 0, 200, 44, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100
      });
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });
  }

  private createConfetti(): void {
    const { width } = this.scale;

    // Multiple emitters for different colors
    const colors = [COLORS.CYAN, COLORS.MAGENTA, COLORS.GREEN, COLORS.GOLD, COLORS.VIOLET];

    colors.forEach((color) => {
      const emitter = this.add.particles(width / 2, -50, 'particle', {
        x: { min: -width / 2, max: width / 2 },
        speed: { min: 100, max: 300 },
        angle: { min: 60, max: 120 },
        scale: { start: 0.3, end: 0.1 },
        alpha: { start: 1, end: 0.5 },
        lifespan: 3000,
        gravityY: 150,
        frequency: 100,
        quantity: 2,
        tint: color,
        blendMode: 'ADD'
      });

      // Stop after a few seconds
      this.time.delayedCall(3000, () => {
        emitter.stop();
      });
    });
  }
}
