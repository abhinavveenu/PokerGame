import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';
import './Lobby.css';

const Lobby = ({ onJoinRoom, onGoBack }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    checkServerStatus();
    
    // Set up connection listeners
    const disconnectListener = socketService.addListener('disconnected', (data) => {
      setIsConnected(false);
      setError(`Disconnected from server: ${data.reason}`);
    });

    const reconnectListener = socketService.addListener('reconnected', () => {
      setIsConnected(true);
      setError('');
    });

    return () => {
      socketService.removeListener('disconnected', disconnectListener);
      socketService.removeListener('reconnected', reconnectListener);
    };
  }, []);

  const checkServerStatus = async () => {
    try {
      const health = await socketService.checkServerHealth();
      if (health.status === 'online') {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
        setError('Server is offline. Please start the backend server.');
      }
    } catch (error) {
      setServerStatus('offline');
      setError('Cannot connect to server. Please start the backend server.');
    }
  };

  const handleConnect = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      await socketService.connect();
      setIsConnected(true);
    } catch (error) {
      setError('Failed to connect to server: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await socketService.createRoom(maxPlayers, playerName.trim());
      
      if (response.success) {
        onJoinRoom(response.gameState, response.playerId);
      } else {
        setError('Failed to create room: ' + response.error);
      }
    } catch (error) {
      setError('Failed to create room: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      const response = await socketService.joinRoom(roomId.trim(), playerName.trim());
      
      if (response.success) {
        onJoinRoom(response.gameState, response.playerId);
      } else {
        setError('Failed to join room: ' + response.error);
      }
    } catch (error) {
      setError('Failed to join room: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    socketService.disconnect();
    setIsConnected(false);
    setError('');
  };

  if (serverStatus === 'checking') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h2>🃏 Online Poker Lobby</h2>
          <div className="server-status checking">
            <div className="spinner"></div>
            <p>Checking server status...</p>
          </div>
        </div>
      </div>
    );
  }

  if (serverStatus === 'offline') {
    return (
      <div className="lobby-container">
        <div className="lobby-card">
          <h2>🃏 Online Poker Lobby</h2>
          <div className="server-status offline">
            <p>❌ Server is offline</p>
            <p>Please start the backend server with:</p>
            <code>cd backend && npm run dev</code>
          </div>
          <button onClick={onGoBack} className="back-button">
            Back to Local Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h2>🃏 Online Poker Lobby</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="server-status online">
          <p>✅ Server is online</p>
          {isConnected && <p>🔗 Connected as {playerName}</p>}
        </div>

        {!isConnected ? (
          <div className="connection-section">
            <div className="input-group">
              <label htmlFor="playerName">Your Name:</label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                maxLength={20}
                disabled={isConnecting}
              />
            </div>

            <button 
              onClick={handleConnect}
              disabled={isConnecting || !playerName.trim()}
              className="connect-button"
            >
              {isConnecting ? 'Connecting...' : 'Connect to Server'}
            </button>
          </div>
        ) : (
          <div className="room-section">
            <div className="room-actions">
              <div className="create-room">
                <h3>Create New Room</h3>
                <div className="input-group">
                  <label htmlFor="maxPlayers">Max Players:</label>
                  <select
                    id="maxPlayers"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    disabled={isConnecting}
                  >
                    <option value={2}>2 Players</option>
                    <option value={3}>3 Players</option>
                    <option value={4}>4 Players</option>
                    <option value={5}>5 Players</option>
                    <option value={6}>6 Players</option>
                  </select>
                </div>
                <button 
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="create-button"
                >
                  {isConnecting ? 'Creating...' : 'Create Room'}
                </button>
              </div>

              <div className="divider">OR</div>

              <div className="join-room">
                <h3>Join Existing Room</h3>
                <div className="input-group">
                  <label htmlFor="roomId">Room ID:</label>
                  <input
                    id="roomId"
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    placeholder="Enter room ID"
                    disabled={isConnecting}
                  />
                </div>
                <button 
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !roomId.trim()}
                  className="join-button"
                >
                  {isConnecting ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            </div>

            <div className="connection-controls">
              <button onClick={handleDisconnect} className="disconnect-button">
                Disconnect
              </button>
            </div>
          </div>
        )}

        <button onClick={onGoBack} className="back-button">
          Back to Local Game
        </button>
      </div>
    </div>
  );
};

export default Lobby; 