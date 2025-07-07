import { GameRoom } from './GameRoom.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> GameRoom
    this.playerRooms = new Map(); // playerId -> roomId
    
    // Word lists for generating friendly room names
    this.adjectives = [
      'LUCKY', 'ROYAL', 'WILD', 'GOLDEN', 'MYSTIC', 'BRAVE', 'SWIFT', 'EPIC', 'MEGA', 'SUPER',
      'CRAZY', 'MAGIC', 'BRIGHT', 'SHINY', 'FANCY', 'TURBO', 'COSMIC', 'ELECTRIC', 'FIRE', 'ICE',
      'SHADOW', 'DIAMOND', 'SILVER', 'PURPLE', 'CRIMSON', 'JADE', 'NEON', 'LASER', 'QUANTUM', 'PIXEL'
    ];
    
    this.nouns = [
      'CATS', 'DOGS', 'LIONS', 'TIGERS', 'BEARS', 'WOLVES', 'EAGLES', 'SHARKS', 'DRAGONS', 'WIZARDS',
      'KNIGHTS', 'PIRATES', 'ROBOTS', 'NINJAS', 'HEROES', 'LEGENDS', 'STARS', 'DIAMONDS', 'ROCKETS', 'BOMBS',
      'LASERS', 'SWORDS', 'SHIELDS', 'CROWNS', 'TOWERS', 'CASTLES', 'TEMPLES', 'BRIDGES', 'GARDENS', 'BOXES'
    ];
  }

  generateFriendlyRoomName() {
    let roomName;
    let attempts = 0;
    const maxAttempts = 50;
    
    do {
      const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
      const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
      const number = Math.floor(Math.random() * 100);
      
      roomName = `${adjective}${noun}${number}`;
      attempts++;
      
      // Fallback to UUID if we can't generate a unique name
      if (attempts >= maxAttempts) {
        roomName = uuidv4();
        break;
      }
    } while (this.rooms.has(roomName));
    
    return roomName;
  }

  createRoom(maxPlayers = 6) {
    const roomId = this.generateFriendlyRoomName();
    const room = new GameRoom(roomId, maxPlayers);
    this.rooms.set(roomId, room);
    
    console.log(`Created room ${roomId} with max ${maxPlayers} players`);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId, playerId, playerName) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      throw new Error('Room does not exist');
    }

    if (room.isFull()) {
      throw new Error('Room is full');
    }

    // Remove player from previous room if they were in one
    this.leaveCurrentRoom(playerId);

    // Add player to the room
    const success = room.addPlayer(playerId, playerName);
    
    if (success) {
      this.playerRooms.set(playerId, roomId);
      return room;
    }
    
    return null;
  }

  leaveCurrentRoom(playerId) {
    const currentRoomId = this.playerRooms.get(playerId);
    if (currentRoomId) {
      const room = this.rooms.get(currentRoomId);
      if (room) {
        room.removePlayer(playerId);
        
        // Clean up empty rooms
        if (room.isEmpty()) {
          this.removeRoom(currentRoomId);
        }
      }
      this.playerRooms.delete(playerId);
    }
  }

  removeRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      // Remove all players from the mapping
      for (const playerId of room.getPlayerIds()) {
        this.playerRooms.delete(playerId);
      }
      
      this.rooms.delete(roomId);
      console.log(`Removed room ${roomId}`);
    }
  }

  getRoomCount() {
    return this.rooms.size;
  }

  getTotalPlayers() {
    let total = 0;
    for (const room of this.rooms.values()) {
      total += room.getPlayerCount();
    }
    return total;
  }

  // Get list of available rooms for lobby
  getAvailableRooms() {
    const availableRooms = [];
    
    for (const [roomId, room] of this.rooms.entries()) {
      if (!room.isFull()) {
        availableRooms.push({
          id: roomId,
          playerCount: room.getPlayerCount(),
          maxPlayers: room.maxPlayers,
          gamePhase: room.gameState.gamePhase,
          isGameActive: room.isGameActive()
        });
      }
    }
    
    return availableRooms;
  }

  // Clean up disconnected players (called periodically)
  cleanupDisconnectedPlayers() {
    for (const [roomId, room] of this.rooms.entries()) {
      // This would be called with a list of disconnected socket IDs
      // room.removeDisconnectedPlayers(disconnectedIds);
      
      if (room.isEmpty()) {
        this.removeRoom(roomId);
      }
    }
  }

  // Get player's current room
  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : null;
  }

  // Get room statistics for monitoring
  getRoomStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalPlayers: this.getTotalPlayers(),
      roomDetails: []
    };

    for (const [roomId, room] of this.rooms.entries()) {
      stats.roomDetails.push({
        id: roomId,
        playerCount: room.getPlayerCount(),
        maxPlayers: room.maxPlayers,
        gamePhase: room.gameState.gamePhase,
        pot: room.gameState.pot,
        isActive: room.isGameActive()
      });
    }

    return stats;
  }
} 