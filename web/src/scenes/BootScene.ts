import Phaser from 'phaser';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL, COLORS } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBox = this.add.graphics();
    const progressBar = this.add.graphics();

    progressBox.fillStyle(COLORS.DARK_VIOLET, 0.8);
    progressBox.fillRoundedRect(width / 2 - 120, height / 2 - 15, 240, 30, 8);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'LOADING...', {
      fontFamily: '"Courier New", monospace',
      fontSize: '20px',
      color: '#00FFFF'
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(COLORS.CYAN, 1);
      progressBar.fillRoundedRect(width / 2 - 115, height / 2 - 10, 230 * value, 20, 6);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Create particle texture programmatically
    this.createParticleTexture();
  }

  createParticleTexture(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('particle', 32, 32);
    graphics.destroy();
  }

  create(): void {
    // Initialize socket connection
    const socket: Socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Store socket in registry for other scenes
    this.registry.set('socket', socket);
    this.registry.set('connected', false);

    socket.on('connect', () => {
      console.log('Connected to server');
      this.registry.set('connected', true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.registry.set('connected', false);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.registry.set('connected', false);
    });

    // Transition to menu
    this.time.delayedCall(500, () => {
      this.scene.start('MenuScene');
    });
  }
}
