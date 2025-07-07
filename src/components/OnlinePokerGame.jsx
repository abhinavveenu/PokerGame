import React, { useState, useEffect, useCallback } from 'react';
import Card from './Card';
import socketService from '../services/socketService';
import './OnlinePokerGame.css';

const OnlinePokerGame = ({ initialGameState, playerId, onLeaveGame }) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState('');
  const [betAmount, setBetAmount] = useState(50);
  const [isActing, setIsActing] = useState(false);
  const [roomInfo, setRoomInfo] = useState('');

  useEffect(() => {
    if (initialGameState) {
      setGameState(initialGameState);
      setRoomInfo(`Room: ${initialGameState.roomId} | ${initialGameState.playerCount}/${initialGameState.maxPlayers} players`);
    }
  }, [initialGameState]);

  useEffect(() => {
    // Set up WebSocket event listeners
    const gameStateListener = socketService.addListener('game-state-update', (data) => {
      setGameState(data.gameState);
      setError('');
    });

    const playerJoinedListener = socketService.addListener('player-joined', (data) => {
      setGameState(data.gameState);
      setError('');
    });

    const playerLeftListener = socketService.addListener('player-left', (data) => {
      setGameState(data.gameState);
      setError('');
    });

    const actionErrorListener = socketService.addListener('action-error', (data) => {
      setError(data.error);
      setIsActing(false);
    });

    const disconnectedListener = socketService.addListener('disconnected', (data) => {
      setIsConnected(false);
      setError(`Disconnected: ${data.reason}`);
    });

    const reconnectedListener = socketService.addListener('reconnected', () => {
      setIsConnected(true);
      setError('');
    });

    return () => {
      socketService.removeListener('game-state-update', gameStateListener);
      socketService.removeListener('player-joined', playerJoinedListener);
      socketService.removeListener('player-left', playerLeftListener);
      socketService.removeListener('action-error', actionErrorListener);
      socketService.removeListener('disconnected', disconnectedListener);
      socketService.removeListener('reconnected', reconnectedListener);
    };
  }, []);

  const handleAction = useCallback(async (action, amount = 0) => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    setIsActing(true);
    setError('');

    try {
      await socketService.performAction(action, amount);
    } catch (error) {
      setError(`Action failed: ${error.message}`);
    } finally {
      setIsActing(false);
    }
  }, [isConnected]);

  const handleStartNewHand = useCallback(async () => {
    if (!isConnected) {
      setError('Not connected to server');
      return;
    }

    try {
      await socketService.startNewHand();
    } catch (error) {
      setError(`Failed to start new hand: ${error.message}`);
    }
  }, [isConnected]);

  const handleLeaveGame = useCallback(() => {
    socketService.disconnect();
    onLeaveGame();
  }, [onLeaveGame]);

  if (!gameState) {
    return (
      <div className="online-poker-game">
        <div className="loading-state">
          <h2>Loading game...</h2>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  const canAct = isMyTurn && !currentPlayer?.folded && gameState.gamePhase !== 'showdown' && gameState.gamePhase !== 'waiting';

  const getPlayerPosition = (index, totalPlayers) => {
    const angle = (index * 2 * Math.PI) / totalPlayers;
    const radius = 200;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const renderCommunityCards = () => {
    const cards = [...gameState.communityCards];
    while (cards.length < 5) {
      cards.push({ suit: 'empty', value: 'empty' });
    }

    return (
      <div className="community-cards">
        <h3>Community Cards</h3>
        <div className="cards-container">
          {cards.map((card, index) => (
            <Card
              key={index}
              suit={card.suit}
              value={card.value}
              isHidden={card.suit === 'empty'}
              className={card.suit === 'empty' ? 'empty-card' : ''}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderPlayer = (player, index) => {
    const position = getPlayerPosition(index, gameState.players.length);
    const isCurrentPlayer = player.id === playerId;
    const isActivePlayer = gameState.players[gameState.currentPlayerIndex]?.id === player.id;
    const isOnline = player.isConnected !== false;

    return (
      <div
        key={player.id}
        className={`player-seat ${isCurrentPlayer ? 'current-player' : ''} ${isActivePlayer ? 'active-player' : ''} ${!isOnline ? 'offline-player' : ''}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
      >
        <div className="player-info">
          <h4>{player.name} {!isOnline && '(Offline)'}</h4>
          <p className="chips">💰 ${player.chips.toLocaleString()}</p>
          {player.bet > 0 && <p className="bet">Bet: ${player.bet}</p>}
          {player.action && (
            <p className={`action ${player.action}`}>
              {player.action.toUpperCase()}
            </p>
          )}
        </div>
        
        <div className="player-cards">
          {player.cards.map((card, cardIndex) => (
            <Card
              key={cardIndex}
              suit={card.suit}
              value={card.value}
              isHidden={card.suit === 'hidden'}
              className={player.folded ? 'folded' : ''}
            />
          ))}
        </div>
        
        {player.folded && <div className="folded-indicator">FOLDED</div>}
      </div>
    );
  };

  const renderActionButtons = () => {
    if (!canAct || isActing) return null;

    const callAmount = Math.max(0, gameState.currentBet - (currentPlayer?.bet || 0));
    const canCheck = gameState.currentBet === (currentPlayer?.bet || 0);
    const canCall = callAmount > 0 && callAmount <= (currentPlayer?.chips || 0);
    const canBet = gameState.currentBet === 0 && betAmount <= (currentPlayer?.chips || 0);
    const canRaise = gameState.currentBet > 0 && betAmount <= (currentPlayer?.chips || 0);

    return (
      <div className="action-buttons">
        <button
          onClick={() => handleAction('fold')}
          className="action-button fold"
          disabled={isActing}
        >
          Fold
        </button>
        
        {canCheck && (
          <button
            onClick={() => handleAction('check')}
            className="action-button check"
            disabled={isActing}
          >
            Check
          </button>
        )}
        
        {canCall && (
          <button
            onClick={() => handleAction('call', callAmount)}
            className="action-button call"
            disabled={isActing}
          >
            Call ${callAmount}
          </button>
        )}
        
        <div className="bet-section">
          <input
            type="number"
            min="1"
            max={currentPlayer?.chips || 0}
            value={betAmount}
            onChange={(e) => setBetAmount(parseInt(e.target.value) || 0)}
            className="bet-input"
            disabled={isActing}
          />
          {canBet && (
            <button
              onClick={() => handleAction('bet', betAmount)}
              className="action-button bet"
              disabled={isActing || betAmount <= 0}
            >
              Bet ${betAmount}
            </button>
          )}
          {canRaise && (
            <button
              onClick={() => handleAction('raise', betAmount)}
              className="action-button raise"
              disabled={isActing || betAmount <= 0}
            >
              Raise ${betAmount}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="online-poker-game">
      <div className="game-header">
        <div className="room-info">
          <h2>Online Poker</h2>
          <p>{roomInfo}</p>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
        
        <button onClick={handleLeaveGame} className="leave-button">
          Leave Game
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="game-info">
        <div className="pot-info">
          <h3>Pot: ${gameState.pot?.toLocaleString() || 0}</h3>
          <p>Phase: {gameState.gamePhase}</p>
          {gameState.message && <p className="game-message">{gameState.message}</p>}
        </div>
      </div>

      <div className="poker-table">
        {renderCommunityCards()}
        
        <div className="players-container">
          {gameState.players.map((player, index) => renderPlayer(player, index))}
        </div>
      </div>

      {isMyTurn && canAct && (
        <div className="turn-indicator">
          <h3>🔥 Your Turn!</h3>
        </div>
      )}

      {renderActionButtons()}

      {gameState.gamePhase === 'showdown' && (
        <div className="showdown-section">
          <h3>Showdown!</h3>
          <button onClick={handleStartNewHand} className="new-hand-button">
            Start New Hand
          </button>
        </div>
      )}

      {gameState.gamePhase === 'waiting' && (
        <div className="waiting-section">
          <h3>Waiting for more players...</h3>
          <p>Need at least 2 players to start</p>
        </div>
      )}
    </div>
  );
};

export default OnlinePokerGame; 