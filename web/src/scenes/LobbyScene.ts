import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { COLORS } from '../config';

interface MatchedData {
  roomId: string;
  opponent: string;
  yourSide: 'top' | 'bottom';
}

interface RoomCreatedData {
  roomId: string;
  code: string;
}

export class LobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private dotsText!: Phaser.GameObjects.Text;
  private codeInput!: HTMLInputElement;
  private codeOverlay!: HTMLElement;
  private roomCode: string = '';
  private lobbyMode: string = '';
  private animTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    void this.scale;

    this.codeInput = document.getElementById('code-input') as HTMLInputElement;
    this.codeOverlay = document.getElementById('code-input-overlay') as HTMLElement;

    this.lobbyMode = this.registry.get('lobbyMode') || 'matchmaking';

    // Background
    this.createBackground();

    // Back button
    this.createBackButton();

    // Setup based on mode
    if (this.lobbyMode === 'matchmaking') {
      this.setupMatchmaking();
    } else if (this.lobbyMode === 'private-menu') {
      this.setupPrivateMenu();
    }

    // Setup socket listeners
    this.setupSocketListeners();
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    void this.add.graphics();

    // Animated circles in background
    for (let i = 0; i < 5; i++) {
      const circle = this.add.circle(
        width / 2,
        height / 2,
        100 + i * 40,
        COLORS.VIOLET,
        0
      );
      circle.setStrokeStyle(1, COLORS.VIOLET, 0.1 - i * 0.015);

      this.tweens.add({
        targets: circle,
        scale: { from: 0.8, to: 1.2 },
        alpha: { from: 0.3, to: 0 },
        duration: 2000 + i * 200,
        repeat: -1,
        delay: i * 300
      });
    }
  }

  private createBackButton(): void {
    const backBtn = this.add.text(30, 40, '< BACK', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#8B5CF6'
    });

    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => {
      this.leaveAndGoBack();
    });
    backBtn.on('pointerover', () => backBtn.setColor('#00FFFF'));
    backBtn.on('pointerout', () => backBtn.setColor('#8B5CF6'));
  }

  private setupMatchmaking(): void {
    const { width, height } = this.scale;

    // Searching text
    this.statusText = this.add.text(width / 2, height / 2 - 50, 'SEARCHING', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#00FFFF'
    }).setOrigin(0.5);
    this.statusText.setShadow(0, 0, '#00FFFF', 15, true, true);

    // Animated dots
    this.dotsText = this.add.text(width / 2, height / 2, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      color: '#00FFFF'
    }).setOrigin(0.5);

    let dotCount = 0;
    this.animTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        this.dotsText.setText('.'.repeat(dotCount));
      }
    });

    // Spinning puck animation
    const puck = this.add.circle(width / 2, height / 2 + 80, 20, COLORS.WHITE);
    puck.setStrokeStyle(3, COLORS.CYAN);

    this.tweens.add({
      targets: puck,
      angle: 360,
      duration: 1500,
      repeat: -1,
      ease: 'Linear'
    });

    this.add.text(width / 2, height / 2 + 140, 'Looking for opponent...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8B5CF6'
    }).setOrigin(0.5);
  }

  private setupPrivateMenu(): void {
    const { width, height } = this.scale;

    this.add.text(width / 2, 150, 'PRIVATE GAME', {
      fontFamily: '"Courier New", monospace',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FF00FF'
    }).setOrigin(0.5).setShadow(0, 0, '#FF00FF', 15, true, true);

    // Create room button
    this.createMenuButton(width / 2, 320, 'CREATE ROOM', COLORS.CYAN, () => {
      this.createRoom();
    });

    // Join room button
    this.createMenuButton(width / 2, 420, 'JOIN ROOM', COLORS.MAGENTA, () => {
      this.showJoinInput();
    });

    // Status text (hidden initially)
    this.statusText = this.add.text(width / 2, height - 150, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Code display (hidden initially)
    this.add.text(width / 2, height / 2, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#FF00FF',
      letterSpacing: 12
    }).setOrigin(0.5);
  }

  private createMenuButton(x: number, y: number, text: string, color: number, callback: () => void): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.lineStyle(3, color);
    bg.strokeRoundedRect(-120, -30, 240, 60, 12);

    const buttonText = this.add.text(0, 0, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);
    buttonText.setShadow(0, 0, '#' + color.toString(16).padStart(6, '0'), 10, true, true);

    container.add([bg, buttonText]);

    const hitArea = this.add.rectangle(0, 0, 240, 60, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

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

  private setupSocketListeners(): void {
    const socket: Socket = this.registry.get('socket');
    if (!socket) return;

    socket.on('matched', (data: MatchedData) => {
      this.handleMatched(data);
    });

    socket.on('room-created', (data: RoomCreatedData) => {
      this.handleRoomCreated(data);
    });

    socket.on('error', (error: { message: string }) => {
      this.statusText.setText(error.message || 'Error occurred');
      this.statusText.setColor('#FF0000');
    });
  }

  private handleMatched(data: MatchedData): void {
    if (this.animTimer) {
      this.animTimer.destroy();
    }

    this.registry.set('roomId', data.roomId);
    this.registry.set('opponent', data.opponent);
    this.registry.set('playerSide', data.yourSide);

    // Show match found animation
    const { width, height } = this.scale;

    if (this.statusText) {
      this.statusText.setText('OPPONENT FOUND!');
      this.statusText.setColor('#39FF14');
    }

    const opponentText = this.add.text(width / 2, height / 2 + 50, `VS ${data.opponent.toUpperCase()}`, {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#FF00FF'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: opponentText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300
    });

    // Transition to game after delay
    this.time.delayedCall(1500, () => {
      this.cleanupListeners();
      this.scene.start('GameScene');
    });
  }

  private handleRoomCreated(data: RoomCreatedData): void {
    this.roomCode = data.code;
    this.registry.set('roomId', data.roomId);

    // Clear menu and show code
    this.children.removeAll();
    this.createBackButton();

    const { width, height } = this.scale;

    this.add.text(width / 2, 150, 'ROOM CREATED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00FFFF'
    }).setOrigin(0.5).setShadow(0, 0, '#00FFFF', 10, true, true);

    this.add.text(width / 2, 220, 'Share this code:', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Big code display
    const codeDisplay = this.add.text(width / 2, height / 2 - 50, data.code, {
      fontFamily: '"Courier New", monospace',
      fontSize: '64px',
      fontStyle: 'bold',
      color: '#FF00FF',
      letterSpacing: 16
    }).setOrigin(0.5);
    codeDisplay.setShadow(0, 0, '#FF00FF', 20, true, true);

    // Pulsing animation
    this.tweens.add({
      targets: codeDisplay,
      scale: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.add.text(width / 2, height / 2 + 50, 'Waiting for opponent...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Animated waiting indicator
    const waitDots = this.add.text(width / 2, height / 2 + 90, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '24px',
      color: '#00FFFF'
    }).setOrigin(0.5);

    let dotCount = 0;
    this.animTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        dotCount = (dotCount + 1) % 4;
        waitDots.setText('.'.repeat(dotCount));
      }
    });
  }

  private createRoom(): void {
    const socket: Socket = this.registry.get('socket');
    const playerName = this.registry.get('playerName');

    if (!socket || !playerName) return;

    socket.emit('create-room', { playerName });
  }

  private showJoinInput(): void {
    this.codeOverlay.classList.add('active');
    this.codeInput.value = '';
    this.codeInput.focus();

    const handleSubmit = () => {
      const code = this.codeInput.value.trim().toUpperCase();
      if (code.length === 4) {
        this.codeOverlay.classList.remove('active');
        this.joinRoom(code);
        this.codeInput.removeEventListener('keydown', handleKeydown);
      }
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        this.codeOverlay.classList.remove('active');
        this.codeInput.removeEventListener('keydown', handleKeydown);
      }
    };

    this.codeInput.addEventListener('keydown', handleKeydown);

    this.codeInput.addEventListener('input', () => {
      if (this.codeInput.value.length === 4) {
        handleSubmit();
      }
    }, { once: true });
  }

  private joinRoom(code: string): void {
    const socket: Socket = this.registry.get('socket');
    const playerName = this.registry.get('playerName');

    if (!socket || !playerName) return;

    this.statusText.setText('Joining room...');
    this.statusText.setColor('#00FFFF');

    socket.emit('join-room', { code, playerName });
  }

  private leaveAndGoBack(): void {
    const socket: Socket = this.registry.get('socket');

    if (socket) {
      if (this.lobbyMode === 'matchmaking') {
        socket.emit('leave-queue');
      } else if (this.roomCode) {
        socket.emit('leave-room');
      }
    }

    this.cleanupListeners();
    this.codeOverlay.classList.remove('active');
    this.scene.start('MenuScene');
  }

  private cleanupListeners(): void {
    const socket: Socket = this.registry.get('socket');
    if (socket) {
      socket.off('matched');
      socket.off('room-created');
      socket.off('error');
    }
    if (this.animTimer) {
      this.animTimer.destroy();
    }
  }
}
