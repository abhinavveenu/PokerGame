import React, { useState } from 'react';
import './Welcome.css';

const Welcome = ({ onStartGame, onStartOnlineGame }) => {
  const [playerCount, setPlayerCount] = useState(2);

  const handleStartGame = () => {
    onStartGame(playerCount);
  };

  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <div className="poker-chips">
          <div className="chip red"></div>
          <div className="chip blue"></div>
          <div className="chip green"></div>
        </div>
        <h1 className="welcome-title">
          🃏 Texas Hold'em Poker 🃏
        </h1>
        
        <div className="game-modes">
          <div className="game-mode local-mode">
            <h3>🏠 Local Game</h3>
            <div className="player-selection">
              <h4>Number of Players</h4>
              <div className="player-count-selector">
                {[2, 3, 4, 5, 6].map(count => (
                  <button
                    key={count}
                    className={`player-count-button ${playerCount === count ? 'active' : ''}`}
                    onClick={() => setPlayerCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="player-selection-note">
                You + {playerCount - 1} computer opponent{playerCount > 2 ? 's' : ''}
              </p>
            </div>
            
            <button 
              className="play-button local"
              onClick={handleStartGame}
            >
              <span className="button-text">Play Local</span>
              <span className="button-icon">🎮</span>
            </button>
          </div>

          <div className="game-mode-divider">OR</div>

          <div className="game-mode online-mode">
            <h3>🌐 Online Multiplayer</h3>
            <div className="online-features">
              <div className="feature">👥 Play with real players</div>
              <div className="feature">🎲 Create or join rooms</div>
              <div className="feature">⚡ Real-time gameplay</div>
              <div className="feature">🏆 2-6 players per room</div>
            </div>
            
            <button 
              className="play-button online"
              onClick={onStartOnlineGame}
            >
              <span className="button-text">Play Online</span>
              <span className="button-icon">🌐</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 