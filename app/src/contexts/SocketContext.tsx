import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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
  joinQueue: (playerName: string) => void;
  leaveQueue: () => void;
  createRoom: (playerName: string) => void;
  joinRoom: (code: string, playerName: string) => void;
  movePaddle: (position: Vector2D) => void;
  leaveRoom: () => void;
  clearGoalData: () => void;
  resetState: () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be inside SocketProvider');
  return ctx;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => { setIsConnected(true); setError(null); });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setError('Unable to connect'));

    socket.on('game-state', (state: GameState) => setGameState(state));
    socket.on('matched', (data: MatchData) => { setMatchData(data); setIsWaiting(false); });
    socket.on('room-created', (data: RoomData) => { setRoomData(data); setIsWaiting(true); });
    socket.on('room-joined', (data: MatchData) => { setMatchData(data); setIsWaiting(false); });
    socket.on('waiting-for-opponent', () => setIsWaiting(true));
    socket.on('countdown', (count: number) => setCountdown(count));
    socket.on('goal', (data: GoalData) => setGoalData(data));
    socket.on('game-over', (data: GameOverData) => setGameOverData(data));
    socket.on('collision', (data: CollisionEvent) => setLastCollision(data));
    socket.on('opponent-disconnected', () => setOpponentDisconnected(true));
    socket.on('error', (msg: string) => setError(msg));

    return () => { socket.disconnect(); };
  }, []);

  const joinQueue = useCallback((playerName: string) => {
    socketRef.current?.emit('join-queue', { playerName });
    setIsWaiting(true); setError(null);
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current?.emit('leave-queue');
    setIsWaiting(false);
  }, []);

  const createRoom = useCallback((playerName: string) => {
    socketRef.current?.emit('create-room', { playerName });
    setError(null);
  }, []);

  const joinRoom = useCallback((code: string, playerName: string) => {
    socketRef.current?.emit('join-room', { code, playerName });
    setError(null);
  }, []);

  const movePaddle = useCallback((position: Vector2D) => {
    socketRef.current?.emit('paddle-move', { position });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leave-room');
    resetState();
  }, []);

  const clearGoalData = useCallback(() => setGoalData(null), []);

  const resetState = useCallback(() => {
    setGameState(null); setMatchData(null); setRoomData(null);
    setCountdown(null); setGoalData(null); setGameOverData(null);
    setOpponentDisconnected(false); setIsWaiting(false);
  }, []);

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current, isConnected, gameState, matchData, roomData,
      countdown, goalData, gameOverData, lastCollision, error, isWaiting,
      opponentDisconnected, joinQueue, leaveQueue, createRoom, joinRoom,
      movePaddle, leaveRoom, clearGoalData, resetState,
    }}>
      {children}
    </SocketContext.Provider>
  );
}
