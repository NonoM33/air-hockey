"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const types_1 = require("./types");
const physics_1 = require("./physics");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
// State
const rooms = new Map();
const matchmakingQueue = [];
const playerRooms = new Map(); // socketId -> roomId
const playerStats = new Map();
// Generate room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
// Generate unique room ID
function generateRoomId() {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
// Create a new player
function createPlayer(socketId, name, side) {
    const { TABLE_WIDTH, TABLE_HEIGHT, PADDLE_RADIUS } = types_1.GAME_CONFIG;
    const y = side === 'top' ? TABLE_HEIGHT * 0.15 : TABLE_HEIGHT * 0.85;
    return {
        id: socketId,
        name,
        score: 0,
        side,
        lastVolleyTime: 0,
        comboCount: 0,
        paddle: {
            position: { x: TABLE_WIDTH / 2, y },
            radius: PADDLE_RADIUS,
            playerId: socketId,
        },
    };
}
// Create initial game state
function createGameState(roomId) {
    return {
        roomId,
        players: [],
        puck: (0, physics_1.createInitialPuck)(),
        status: 'waiting',
        winner: null,
        startTime: Date.now(),
        lastGoalTime: 0,
        puckSpeed: 0,
        maxPuckSpeed: 0,
    };
}
// Create a room
function createRoom(code = null) {
    const roomId = generateRoomId();
    const room = {
        id: roomId,
        code,
        players: new Map(),
        gameState: createGameState(roomId),
        gameLoop: null,
    };
    rooms.set(roomId, room);
    return room;
}
// Start the game loop for a room
function startGameLoop(room) {
    if (room.gameLoop) {
        clearInterval(room.gameLoop);
    }
    let lastTime = Date.now();
    room.gameLoop = setInterval(() => {
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;
        if (room.gameState.status !== 'playing')
            return;
        const players = Array.from(room.players.values());
        const result = (0, physics_1.updatePhysics)(room.gameState.puck, players, deltaTime);
        room.gameState.puck = result.puck;
        room.gameState.puckSpeed = (0, physics_1.pixelsToKmh)(Math.sqrt(result.puck.velocity.x * result.puck.velocity.x +
            result.puck.velocity.y * result.puck.velocity.y));
        if (room.gameState.puckSpeed > room.gameState.maxPuckSpeed) {
            room.gameState.maxPuckSpeed = room.gameState.puckSpeed;
        }
        // Send collision events
        for (const collision of result.collisions) {
            io.to(room.id).emit('collision', collision);
            // Track shots for stats
            if (collision.type === 'paddle' && collision.playerId) {
                const stats = playerStats.get(collision.playerId);
                if (stats) {
                    stats.shots++;
                }
            }
        }
        // Handle goal
        if (result.goal) {
            handleGoal(room, result.goal);
        }
        // Broadcast game state
        const stateToSend = {
            ...room.gameState,
            players: Array.from(room.players.values()),
        };
        io.to(room.id).emit('game-state', stateToSend);
    }, types_1.GAME_CONFIG.TICK_INTERVAL);
}
// Handle a goal
function handleGoal(room, scoredOn) {
    const players = Array.from(room.players.values());
    const scorer = players.find((p) => p.side !== scoredOn);
    if (scorer) {
        scorer.score++;
        room.gameState.lastGoalTime = Date.now();
        const scores = [
            players.find((p) => p.side === 'top')?.score || 0,
            players.find((p) => p.side === 'bottom')?.score || 0,
        ];
        io.to(room.id).emit('goal', { scorer: scorer.name, score: scores });
        // Check for winner
        if (scorer.score >= types_1.GAME_CONFIG.WINNING_SCORE) {
            room.gameState.status = 'finished';
            room.gameState.winner = scorer.id;
            // Compile stats
            const stats = {
                duration: Date.now() - room.gameState.startTime,
                maxPuckSpeed: room.gameState.maxPuckSpeed,
                totalShots: {},
                maxCombo: {},
            };
            for (const player of players) {
                const pStats = playerStats.get(player.id);
                stats.totalShots[player.id] = pStats?.shots || 0;
                stats.maxCombo[player.id] = pStats?.maxCombo || 0;
            }
            io.to(room.id).emit('game-over', { winner: scorer.name, stats });
            if (room.gameLoop) {
                clearInterval(room.gameLoop);
                room.gameLoop = null;
            }
        }
        else {
            // Reset puck after goal
            room.gameState.puck = (0, physics_1.resetPuck)(scoredOn);
        }
    }
}
// Start countdown
async function startCountdown(room) {
    room.gameState.status = 'countdown';
    for (let i = types_1.GAME_CONFIG.COUNTDOWN_SECONDS; i >= 0; i--) {
        io.to(room.id).emit('countdown', i);
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    room.gameState.status = 'playing';
    room.gameState.startTime = Date.now();
    room.gameState.puck = (0, physics_1.createInitialPuck)();
    // Initialize player stats
    for (const player of room.players.values()) {
        playerStats.set(player.id, { shots: 0, maxCombo: 0 });
    }
    startGameLoop(room);
}
// Try to match players from queue
function tryMatchmaking() {
    while (matchmakingQueue.length >= 2) {
        const player1 = matchmakingQueue.shift();
        const player2 = matchmakingQueue.shift();
        const room = createRoom();
        // Add players
        const p1 = createPlayer(player1.socketId, player1.playerName, 'bottom');
        const p2 = createPlayer(player2.socketId, player2.playerName, 'top');
        room.players.set(player1.socketId, p1);
        room.players.set(player2.socketId, p2);
        room.gameState.players = [p1, p2];
        playerRooms.set(player1.socketId, room.id);
        playerRooms.set(player2.socketId, room.id);
        // Join socket room
        const socket1 = io.sockets.sockets.get(player1.socketId);
        const socket2 = io.sockets.sockets.get(player2.socketId);
        if (socket1 && socket2) {
            socket1.join(room.id);
            socket2.join(room.id);
            socket1.emit('matched', {
                roomId: room.id,
                opponent: player2.playerName,
                yourSide: 'bottom',
            });
            socket2.emit('matched', {
                roomId: room.id,
                opponent: player1.playerName,
                yourSide: 'top',
            });
            // Start countdown
            startCountdown(room);
        }
    }
}
// Socket connection handler
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);
    socket.on('join-queue', ({ playerName }) => {
        console.log(`${playerName} joining queue`);
        // Remove from queue if already in it
        const existingIndex = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
        if (existingIndex !== -1) {
            matchmakingQueue.splice(existingIndex, 1);
        }
        matchmakingQueue.push({ socketId: socket.id, playerName });
        socket.emit('waiting-for-opponent');
        tryMatchmaking();
    });
    socket.on('leave-queue', () => {
        const index = matchmakingQueue.findIndex((p) => p.socketId === socket.id);
        if (index !== -1) {
            matchmakingQueue.splice(index, 1);
        }
    });
    socket.on('create-room', ({ playerName }) => {
        const code = generateRoomCode();
        const room = createRoom(code);
        const player = createPlayer(socket.id, playerName, 'bottom');
        room.players.set(socket.id, player);
        room.gameState.players = [player];
        playerRooms.set(socket.id, room.id);
        socket.join(room.id);
        socket.emit('room-created', { roomId: room.id, code });
    });
    socket.on('join-room', ({ code, playerName }) => {
        // Find room by code
        let targetRoom;
        for (const room of rooms.values()) {
            if (room.code === code.toUpperCase() && room.players.size === 1) {
                targetRoom = room;
                break;
            }
        }
        if (!targetRoom) {
            socket.emit('error', 'Room not found or full');
            return;
        }
        const existingPlayer = Array.from(targetRoom.players.values())[0];
        const player = createPlayer(socket.id, playerName, 'top');
        targetRoom.players.set(socket.id, player);
        targetRoom.gameState.players = [existingPlayer, player];
        playerRooms.set(socket.id, targetRoom.id);
        socket.join(targetRoom.id);
        socket.emit('room-joined', {
            roomId: targetRoom.id,
            opponent: existingPlayer.name,
            yourSide: 'top',
        });
        // Notify existing player
        const existingSocket = io.sockets.sockets.get(existingPlayer.id);
        if (existingSocket) {
            existingSocket.emit('room-joined', {
                roomId: targetRoom.id,
                opponent: playerName,
                yourSide: 'bottom',
            });
        }
        // Start countdown
        startCountdown(targetRoom);
    });
    socket.on('paddle-move', ({ position }) => {
        const roomId = playerRooms.get(socket.id);
        if (!roomId)
            return;
        const room = rooms.get(roomId);
        if (!room)
            return;
        const player = room.players.get(socket.id);
        if (!player)
            return;
        // Clamp position to player's side
        player.paddle.position = (0, physics_1.clampPaddlePosition)(position, player.side);
    });
    socket.on('leave-room', () => {
        cleanupPlayer(socket.id);
    });
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        cleanupPlayer(socket.id);
    });
});
function cleanupPlayer(socketId) {
    // Remove from queue
    const queueIndex = matchmakingQueue.findIndex((p) => p.socketId === socketId);
    if (queueIndex !== -1) {
        matchmakingQueue.splice(queueIndex, 1);
    }
    // Handle room cleanup
    const roomId = playerRooms.get(socketId);
    if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
            // Notify other players
            io.to(roomId).emit('opponent-disconnected');
            // Stop game loop
            if (room.gameLoop) {
                clearInterval(room.gameLoop);
            }
            // Clean up room
            rooms.delete(roomId);
        }
        playerRooms.delete(socketId);
    }
    playerStats.delete(socketId);
}
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        rooms: rooms.size,
        queue: matchmakingQueue.length,
        players: playerRooms.size,
    });
});
const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
    console.log(`🏒 Air Hockey server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map