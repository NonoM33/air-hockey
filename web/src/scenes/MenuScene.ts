import Phaser from 'phaser';
import { Socket } from 'socket.io-client';
import { COLORS } from '../config';

export class MenuScene extends Phaser.Scene {
  private playerName: string = '';
  private nameInput!: HTMLInputElement;
  private nameOverlay!: HTMLElement;
  private statusText!: Phaser.GameObjects.Text;
  private nameDisplay!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    void this.scale;

    // Get HTML elements
    this.nameInput = document.getElementById('name-input') as HTMLInputElement;
    this.nameOverlay = document.getElementById('name-input-overlay') as HTMLElement;

    // Create background with subtle gradient
    this.createBackground();

    // Title with glow effect
    this.createTitle();

    // Player name section
    this.createNameSection();

    // Buttons
    this.createButtons();

    // Connection status
    this.createStatusIndicator();

    // Listen for name input changes
    this.setupNameInput();

    // Decorative elements
    this.createDecorations();
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();

    // Radial gradient effect
    for (let i = 20; i >= 0; i--) {
      const alpha = 0.02 * (20 - i) / 20;
      graphics.fillStyle(COLORS.VIOLET, alpha);
      graphics.fillCircle(width / 2, height / 3, 150 + i * 15);
    }
  }

  private createTitle(): void {
    const { width } = this.scale;

    // Main title
    const title = this.add.text(width / 2, 120, 'AIR HOCKEY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#00FFFF'
    }).setOrigin(0.5);

    // Glow effect using shadow
    title.setShadow(0, 0, '#00FFFF', 15, true, true);

    // Magenta accent title behind
    const titleAccent = this.add.text(width / 2 + 2, 122, 'AIR HOCKEY', {
      fontFamily: '"Courier New", monospace',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#FF00FF'
    }).setOrigin(0.5).setAlpha(0.5);

    // Subtitle
    this.add.text(width / 2, 170, 'NEO-RETRO ARCADE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8B5CF6',
      letterSpacing: 6
    }).setOrigin(0.5);

    // Animate glow
    this.tweens.add({
      targets: [title, titleAccent],
      alpha: { from: 1, to: 0.8 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createNameSection(): void {
    const { width } = this.scale;

    // Name label
    this.add.text(width / 2, 260, 'PLAYER NAME', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#8B5CF6'
    }).setOrigin(0.5);

    // Name display box
    const nameBox = this.add.graphics();
    nameBox.lineStyle(2, COLORS.VIOLET);
    nameBox.strokeRoundedRect(width / 2 - 125, 280, 250, 50, 8);

    // Name display text
    this.nameDisplay = this.add.text(width / 2, 305, 'TAP TO ENTER NAME', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#00FFFF'
    }).setOrigin(0.5).setAlpha(0.5);

    // Make clickable
    const hitArea = this.add.rectangle(width / 2, 305, 250, 50, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.showNameInput());

    // Check for saved name
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      this.playerName = savedName;
      this.nameDisplay.setText(savedName.toUpperCase());
      this.nameDisplay.setAlpha(1);
    }
  }

  private createButtons(): void {
    const { width } = this.scale;

    // Play button
    this.createButton(width / 2, 420, 'PLAY', COLORS.GREEN, () => {
      this.joinQueue();
    });

    // Private game button
    this.createButton(width / 2, 500, 'PRIVATE GAME', COLORS.VIOLET, () => {
      this.showPrivateOptions();
    });
  }

  private createButton(x: number, y: number, text: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.graphics();
    bg.lineStyle(3, color);
    bg.strokeRoundedRect(-100, -25, 200, 50, 12);

    // Button text
    const buttonText = this.add.text(0, 0, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    // Glow effect
    buttonText.setShadow(0, 0, '#' + color.toString(16).padStart(6, '0'), 10, true, true);

    container.add([bg, buttonText]);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 200, 50, 0x000000, 0);
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
      if (!this.playerName) {
        this.showNameInput();
        return;
      }
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
        onComplete: callback
      });
    });

    return container;
  }

  private createStatusIndicator(): void {
    const { width, height } = this.scale;

    const dot = this.add.circle(width / 2 - 50, height - 40, 6, COLORS.GREEN);
    this.statusText = this.add.text(width / 2 - 35, height - 40, 'CONNECTED', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#39FF14'
    }).setOrigin(0, 0.5);

    // Update status periodically
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const connected = this.registry.get('connected');
        if (connected) {
          dot.setFillStyle(COLORS.GREEN);
          this.statusText.setText('CONNECTED');
          this.statusText.setColor('#39FF14');
        } else {
          dot.setFillStyle(COLORS.MAGENTA);
          this.statusText.setText('CONNECTING...');
          this.statusText.setColor('#FF00FF');
        }
      }
    });
  }

  private createDecorations(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();

    // Corner decorations
    graphics.lineStyle(1, COLORS.VIOLET, 0.3);

    // Top left
    graphics.moveTo(20, 60);
    graphics.lineTo(20, 20);
    graphics.lineTo(60, 20);

    // Top right
    graphics.moveTo(width - 20, 60);
    graphics.lineTo(width - 20, 20);
    graphics.lineTo(width - 60, 20);

    // Bottom left
    graphics.moveTo(20, height - 60);
    graphics.lineTo(20, height - 20);
    graphics.lineTo(60, height - 20);

    // Bottom right
    graphics.moveTo(width - 20, height - 60);
    graphics.lineTo(width - 20, height - 20);
    graphics.lineTo(width - 60, height - 20);

    graphics.strokePath();

    // Animated scanlines effect
    const scanlines = this.add.graphics();
    scanlines.setAlpha(0.03);
    for (let y = 0; y < height; y += 4) {
      scanlines.lineStyle(1, 0xFFFFFF);
      scanlines.moveTo(0, y);
      scanlines.lineTo(width, y);
    }
    scanlines.strokePath();
  }

  private setupNameInput(): void {
    this.nameInput.addEventListener('input', () => {
      this.playerName = this.nameInput.value.trim();
      if (this.playerName) {
        this.nameDisplay.setText(this.playerName.toUpperCase());
        this.nameDisplay.setAlpha(1);
      } else {
        this.nameDisplay.setText('TAP TO ENTER NAME');
        this.nameDisplay.setAlpha(0.5);
      }
    });

    this.nameInput.addEventListener('blur', () => {
      this.hideNameInput();
    });

    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.hideNameInput();
      }
    });
  }

  private showNameInput(): void {
    this.nameOverlay.classList.add('active');
    this.nameInput.value = this.playerName;
    this.nameInput.focus();
  }

  private hideNameInput(): void {
    this.nameOverlay.classList.remove('active');
    this.playerName = this.nameInput.value.trim();
    if (this.playerName) {
      localStorage.setItem('playerName', this.playerName);
      this.nameDisplay.setText(this.playerName.toUpperCase());
      this.nameDisplay.setAlpha(1);
    }
  }

  private joinQueue(): void {
    if (!this.playerName) {
      this.showNameInput();
      return;
    }

    const socket: Socket = this.registry.get('socket');
    if (!socket || !this.registry.get('connected')) {
      this.statusText.setText('NOT CONNECTED');
      return;
    }

    this.registry.set('playerName', this.playerName);
    this.registry.set('lobbyMode', 'matchmaking');

    socket.emit('join-queue', { playerName: this.playerName });
    this.scene.start('LobbyScene');
  }

  private showPrivateOptions(): void {
    if (!this.playerName) {
      this.showNameInput();
      return;
    }

    const socket: Socket = this.registry.get('socket');
    if (!socket || !this.registry.get('connected')) {
      this.statusText.setText('NOT CONNECTED');
      return;
    }

    this.registry.set('playerName', this.playerName);
    this.registry.set('lobbyMode', 'private-menu');
    this.scene.start('LobbyScene');
  }
}
