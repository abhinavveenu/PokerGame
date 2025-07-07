import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.roomId = null;
    this.playerId = null;
    this.serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  }

  connect() {
    if (this.socket) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
      });

      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket.id);
        this.isConnected = true;
        this.playerId = this.socket.id;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        this.isConnected = false;
        this.notifyListeners('disconnected', { reason });
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.isConnected = false;
        reject(error);
      });

      // Game event listeners
      this.socket.on('room-created', (data) => {
        console.log('Room created:', data);
        if (data.success) {
          this.roomId = data.roomId;
        }
        this.notifyListeners('room-created', data);
      });

      this.socket.on('room-joined', (data) => {
        console.log('Room joined:', data);
        if (data.success) {
          this.roomId = data.roomId;
        }
        this.notifyListeners('room-joined', data);
      });

      this.socket.on('player-joined', (data) => {
        console.log('Player joined:', data);
        this.notifyListeners('player-joined', data);
      });

      this.socket.on('player-left', (data) => {
        console.log('Player left:', data);
        this.notifyListeners('player-left', data);
      });

      this.socket.on('game-state-update', (data) => {
        console.log('Game state update:', data);
        this.notifyListeners('game-state-update', data);
      });

      this.socket.on('action-error', (data) => {
        console.log('Action error:', data);
        this.notifyListeners('action-error', data);
      });

      // Set up reconnection handling
      this.socket.on('reconnect', () => {
        console.log('Reconnected to server');
        this.isConnected = true;
        this.notifyListeners('reconnected');
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
        this.notifyListeners('reconnection-error', error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.roomId = null;
      this.playerId = null;
    }
  }

  // Room management
  createRoom(maxPlayers, playerName) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room creation timeout'));
      }, 5000);

      this.addListener('room-created', (data) => {
        clearTimeout(timeout);
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Failed to create room'));
        }
      }, { once: true });

      this.socket.emit('create-room', {
        maxPlayers,
        playerName
      });
    });
  }

  joinRoom(roomId, playerName) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room join timeout'));
      }, 5000);

      this.addListener('room-joined', (data) => {
        clearTimeout(timeout);
        if (data.success) {
          resolve(data);
        } else {
          reject(new Error(data.error || 'Failed to join room'));
        }
      }, { once: true });

      this.socket.emit('join-room', {
        roomId,
        playerName
      });
    });
  }

  // Game actions
  performAction(action, amount = 0) {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    this.socket.emit('player-action', {
      action,
      amount
    });
  }

  startNewHand() {
    if (!this.isConnected) {
      throw new Error('Not connected to server');
    }

    this.socket.emit('start-new-hand');
  }

  // Event listener management
  addListener(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listener = {
      callback,
      once: options.once || false,
      id: Date.now() + Math.random()
    };

    this.listeners.get(event).push(listener);
    return listener.id;
  }

  removeListener(event, listenerId) {
    if (!this.listeners.has(event)) {
      return false;
    }

    const eventListeners = this.listeners.get(event);
    const index = eventListeners.findIndex(l => l.id === listenerId);
    
    if (index !== -1) {
      eventListeners.splice(index, 1);
      return true;
    }

    return false;
  }

  removeAllListeners(event) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  notifyListeners(event, data) {
    if (!this.listeners.has(event)) {
      return;
    }

    const eventListeners = this.listeners.get(event);
    const toRemove = [];

    eventListeners.forEach(listener => {
      try {
        listener.callback(data);
        if (listener.once) {
          toRemove.push(listener.id);
        }
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    });

    // Remove one-time listeners
    toRemove.forEach(id => {
      this.removeListener(event, id);
    });
  }

  // Utility methods
  isConnectedToServer() {
    return this.isConnected;
  }

  getCurrentRoomId() {
    return this.roomId;
  }

  getCurrentPlayerId() {
    return this.playerId;
  }

  getServerUrl() {
    return this.serverUrl;
  }

  // Health check
  checkServerHealth() {
    return fetch(`${this.serverUrl}/health`)
      .then(response => response.json())
      .catch(error => {
        console.error('Health check failed:', error);
        return { status: 'offline', error: error.message };
      });
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService; 