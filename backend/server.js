import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameRoom } from './game/GameRoom.js';
import { RoomManager } from './game/RoomManager.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ["http://127.0.0.1:5173", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Initialize room manager
const roomManager = new RoomManager();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    rooms: roomManager.getRoomCount(),
    players: roomManager.getTotalPlayers()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Handle player joining a room
  socket.on('join-room', (data) => {
    const { roomId, playerName } = data;
    
    try {
      const room = roomManager.joinRoom(roomId, socket.id, playerName);
      
      if (room) {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.playerName = playerName;
        
        // Send room state to the player
        socket.emit('room-joined', {
          success: true,
          roomId: roomId,
          gameState: room.getGameState(),
          playerId: socket.id
        });
        
        // Notify other players in the room
        socket.to(roomId).emit('player-joined', {
          playerId: socket.id,
          playerName: playerName,
          gameState: room.getGameState()
        });
        
        console.log(`Player ${playerName} joined room ${roomId}`);
      } else {
        socket.emit('room-joined', {
          success: false,
          error: 'Room is full or does not exist'
        });
      }
    } catch (error) {
      socket.emit('room-joined', {
        success: false,
        error: error.message
      });
    }
  });
  
  // Handle creating a new room
  socket.on('create-room', (data) => {
    const { maxPlayers, playerName } = data;
    
    try {
      const room = roomManager.createRoom(maxPlayers);
      const roomId = room.id;
      
      // Join the creator to the room
      room.addPlayer(socket.id, playerName);
      socket.join(roomId);
      socket.roomId = roomId;
      socket.playerName = playerName;
      
      socket.emit('room-created', {
        success: true,
        roomId: roomId,
        gameState: room.getGameState(),
        playerId: socket.id
      });
      
      console.log(`Player ${playerName} created room ${roomId}`);
    } catch (error) {
      socket.emit('room-created', {
        success: false,
        error: error.message
      });
    }
  });
  
  // Handle player actions (bet, call, fold, etc.)
  socket.on('player-action', (data) => {
    const { action, amount } = data;
    const roomId = socket.roomId;
    
    if (!roomId) {
      socket.emit('action-error', { error: 'Not in a room' });
      return;
    }
    
    try {
      const room = roomManager.getRoom(roomId);
      if (room) {
        const result = room.handlePlayerAction(socket.id, action, amount);
        
        if (result.success) {
          // Broadcast game state update to all players in room
          io.to(roomId).emit('game-state-update', {
            gameState: room.getGameState(),
            action: {
              playerId: socket.id,
              playerName: socket.playerName,
              action: action,
              amount: amount
            }
          });
        } else {
          socket.emit('action-error', { error: result.error });
        }
      }
    } catch (error) {
      socket.emit('action-error', { error: error.message });
    }
  });
  
  // Handle starting a new hand
  socket.on('start-new-hand', () => {
    const roomId = socket.roomId;
    
    if (!roomId) {
      socket.emit('action-error', { error: 'Not in a room' });
      return;
    }
    
    try {
      const room = roomManager.getRoom(roomId);
      if (room) {
        room.startNewHand();
        
        // Broadcast new game state to all players
        io.to(roomId).emit('game-state-update', {
          gameState: room.getGameState(),
          message: 'New hand started!'
        });
      }
    } catch (error) {
      socket.emit('action-error', { error: error.message });
    }
  });
  
  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const roomId = socket.roomId;
    if (roomId) {
      try {
        const room = roomManager.getRoom(roomId);
        if (room) {
          room.removePlayer(socket.id);
          
          // Notify other players
          socket.to(roomId).emit('player-left', {
            playerId: socket.id,
            playerName: socket.playerName,
            gameState: room.getGameState()
          });
          
          // Clean up empty rooms
          if (room.isEmpty()) {
            roomManager.removeRoom(roomId);
            console.log(`Room ${roomId} removed (empty)`);
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Poker server running on port ${PORT}`);
  console.log(`🃏 WebSocket server ready for connections`);
  console.log(`📡 Server accessible at http://localhost:${PORT}`);
}); 