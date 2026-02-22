import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { SERVER_URL } from '../constants/config';
import {
  GameState,
  MatchData,
  RoomData,
  GoalData,
  GameOverData,
  CollisionEvent,
  Vector2D,
} from '../types/game';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  gameState: GameState | null;
  matchData: MatchData | null;
  roomData: RoomData | null;
  countdown: number | null;
  goalData: GoalData | null;
  gameOverData: GameOverData | null;
  lastCollision: CollisionEvent | null;
  error: string | null;
  isWaiting: boolean;
  opponentDisconnected: boolean;

  // Actions
  joinQueue: (playerName: string) => void;
  leaveQueue: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  movePaddle: (position: Vector2D) => void;
  leaveRoom: () => void;
  clearGoalData: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [lastCollision, setLastCollision] = useState<CollisionEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // Initialize socket connection once on mount
  useEffect(() => {
    console.log('[SocketProvider] Initializing socket connection to', SERVER_URL);

    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[SocketProvider] Connected to server, socket id:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      console.log('[SocketProvider] Disconnected from server');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[SocketProvider] Connection error:', err);
      setError('Unable to connect to server');
    });

    socket.on('game-state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('matched', (data: MatchData) => {
      console.log('[SocketProvider] Matched!', data);
      setMatchData(data);
      setIsWaiting(false);
    });

    socket.on('room-created', (data: RoomData) => {
      console.log('[SocketProvider] Room created:', data);
      setRoomData(data);
      setIsWaiting(true);
    });

    socket.on('room-joined', (data: MatchData) => {
      console.log('[SocketProvider] Room joined:', data);
      setMatchData(data);
      setIsWaiting(false);
    });

    socket.on('waiting-for-opponent', () => {
      console.log('[SocketProvider] Waiting for opponent');
      setIsWaiting(true);
    });

    socket.on('countdown', (count: number) => {
      setCountdown(count);
    });

    socket.on('goal', (data: GoalData) => {
      setGoalData(data);
    });

    socket.on('game-over', (data: GameOverData) => {
      setGameOverData(data);
    });

    socket.on('collision', (data: CollisionEvent) => {
      setLastCollision(data);
    });

    socket.on('opponent-disconnected', () => {
      setOpponentDisconnected(true);
    });

    socket.on('error', (message: string) => {
      console.error('[SocketProvider] Server error:', message);
      setError(message);
    });

    // Cleanup on unmount (app close)
    return () => {
      console.log('[SocketProvider] Cleaning up socket connection');
      socket.disconnect();
    };
  }, []);

  const joinQueue = useCallback((playerName: string) => {
    console.log('[SocketProvider] joinQueue', playerName);
    socketRef.current?.emit('join-queue', { playerName });
    setIsWaiting(true);
    setError(null);
  }, []);

  const leaveQueue = useCallback(() => {
    console.log('[SocketProvider] leaveQueue');
    socketRef.current?.emit('leave-queue');
    setIsWaiting(false);
  }, []);

  const createRoom = useCallback((playerName: string) => {
    console.log('[SocketProvider] createRoom', playerName);
    socketRef.current?.emit('create-room', { playerName });
    setError(null);
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    console.log('[SocketProvider] joinRoom', code, playerName);
    socketRef.current?.emit('join-room', { code, playerName });
    setError(null);
  }, []);

  const movePaddle = useCallback((position: Vector2D) => {
    socketRef.current?.emit('paddle-move', { position });
  }, []);

  const leaveRoom = useCallback(() => {
    console.log('[SocketProvider] leaveRoom');
    socketRef.current?.emit('leave-room');
    setGameState(null);
    setMatchData(null);
    setRoomData(null);
    setCountdown(null);
    setGoalData(null);
    setGameOverData(null);
    setOpponentDisconnected(false);
  }, []);

  const clearGoalData = useCallback(() => {
    setGoalData(null);
  }, []);

  const value: SocketContextValue = {
    socket: socketRef.current,
    isConnected,
    gameState,
    matchData,
    roomData,
    countdown,
    goalData,
    gameOverData,
    lastCollision,
    error,
    isWaiting,
    opponentDisconnected,
    joinQueue,
    leaveQueue,
    createRoom,
    joinRoom,
    movePaddle,
    leaveRoom,
    clearGoalData,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}
