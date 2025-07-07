import React, { useState, useEffect } from 'react';
import Card from './Card';
import './PokerGame.css';
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  getBestHand, 
  compareHands, 
  getComputerAction, 
  formatChips, 
  getHandDescription 
} from '../utils/pokerUtils';

const PokerGame = ({ onBackToWelcome, playerCount }) => {
  const [gameState, setGameState] = useState({
    deck: [],
    players: [],
    communityCards: [],
    pot: 0,
    currentBet: 0,
    gamePhase: 'pre-flop', // pre-flop, flop, turn, river, showdown
    currentPlayerIndex: 0,
    winner: null,
    message: 'Place your bet to start the hand',
    showAllCards: false,
    gameOver: false
  });

  const [betAmount, setBetAmount] = useState(50);

  // Initialize game
  useEffect(() => {
    startNewHand();
  }, []);

  const startNewHand = () => {
    const deck = shuffleDeck(createDeck());
    
    // Initialize players
    const players = [];
    for (let i = 0; i < playerCount; i++) {
      players.push({
        id: i,
        name: i === 0 ? 'You' : `Computer ${i}`,
        isHuman: i === 0,
        cards: [],
        chips: 1000,
        bet: 0,
        folded: false,
        action: null,
        position: i
      });
    }
    
    // Deal cards to all players
    let remainingDeck = deck;
    for (let i = 0; i < playerCount; i++) {
      const { cards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
      players[i].cards = cards;
      remainingDeck = newDeck;
    }

    setGameState(prev => ({
      ...prev,
      deck: remainingDeck,
      players,
      communityCards: [],
      currentBet: 0,
      gamePhase: 'pre-flop',
      currentPlayerIndex: 0,
      winner: null,
      message: 'New hand dealt! Place your bet or check.',
      showAllCards: false,
      gameOver: false
    }));
  };

  const handlePlayerAction = (action) => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isHuman) return;
    
    let newState = { ...gameState };
    let newPlayers = [...newState.players];
    let player = { ...newPlayers[gameState.currentPlayerIndex] };
    
    switch (action) {
      case 'fold':
        player.folded = true;
        player.action = 'fold';
        newState.message = 'You folded.';
        break;
        
      case 'check':
        player.action = 'check';
        newState.message = 'You checked.';
        break;
        
      case 'call':
        const callAmount = newState.currentBet - player.bet;
        if (callAmount <= player.chips) {
          player.chips -= callAmount;
          player.bet += callAmount;
          newState.pot += callAmount;
          player.action = 'call';
          newState.message = `You called $${callAmount}.`;
        }
        break;
        
      case 'bet':
        if (betAmount <= player.chips) {
          player.chips -= betAmount;
          player.bet += betAmount;
          newState.pot += betAmount;
          newState.currentBet = Math.max(newState.currentBet, player.bet);
          player.action = 'bet';
          newState.message = `You bet $${betAmount}.`;
        }
        break;
    }

    newPlayers[gameState.currentPlayerIndex] = player;
    newState.players = newPlayers;
    
    // Move to next player
    newState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    
    setGameState(newState);
    
    // Process computer players if game isn't over
    if (!newState.winner && action !== 'fold') {
      setTimeout(() => processNextPlayer(), 1000);
    }
  };

  const processNextPlayer = () => {
    setGameState(prev => {
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      
      // If it's a human player or player is folded, move to next
      if (currentPlayer.isHuman || currentPlayer.folded) {
        const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
        return {
          ...prev,
          currentPlayerIndex: nextPlayerIndex
        };
      }
      
      // Process computer player
      const computerDecision = getComputerAction(
        currentPlayer.cards,
        prev.communityCards,
        prev.currentBet - currentPlayer.bet,
        currentPlayer.chips,
        prev.pot
      );

      let newState = { ...prev };
      let newPlayers = [...newState.players];
      let player = { ...newPlayers[prev.currentPlayerIndex] };
      
      switch (computerDecision.action) {
        case 'fold':
          player.folded = true;
          player.action = 'fold';
          newState.message = `${player.name} folded.`;
          break;
          
        case 'check':
          player.action = 'check';
          newState.message = `${player.name} checked.`;
          break;
          
        case 'call':
          const callAmount = newState.currentBet - player.bet;
          if (callAmount <= player.chips) {
            player.chips -= callAmount;
            player.bet += callAmount;
            newState.pot += callAmount;
            player.action = 'call';
            newState.message = `${player.name} called $${callAmount}.`;
          }
          break;
          
        case 'raise':
          const raiseAmount = computerDecision.amount;
          if (raiseAmount <= player.chips) {
            player.chips -= raiseAmount;
            player.bet += raiseAmount;
            newState.pot += raiseAmount;
            newState.currentBet = player.bet;
            player.action = 'raise';
            newState.message = `${player.name} raised to $${player.bet}.`;
          }
          break;
      }

      newPlayers[prev.currentPlayerIndex] = player;
      newState.players = newPlayers;
      
      // Move to next player
      newState.currentPlayerIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      
      return newState;
    });

    // Continue with next player or advance phase
    setTimeout(() => checkRoundComplete(), 1000);
  };

  const checkRoundComplete = () => {
    // Check if all players have acted in this round
    const activePlayers = gameState.players.filter(p => !p.folded);
    const allActed = activePlayers.every(p => p.action !== null);
    
    if (allActed || activePlayers.length === 1) {
      // Reset actions for next round
      setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, action: null }))
      }));
      
      setTimeout(() => advanceGamePhase(), 1000);
    } else {
      // Continue with next player
      setTimeout(() => processNextPlayer(), 1000);
    }
  };

  const advanceGamePhase = () => {
    setGameState(prev => {
      if (prev.winner) return prev;

      let newState = { ...prev };
      
      switch (prev.gamePhase) {
        case 'pre-flop':
          // Deal flop (3 cards)
          const { cards: flopCards, remainingDeck: afterFlop } = dealCards(prev.deck, 3);
          newState.communityCards = flopCards;
          newState.deck = afterFlop;
          newState.gamePhase = 'flop';
          newState.message = 'Flop dealt!';
          break;
          
        case 'flop':
          // Deal turn (1 card)
          const { cards: turnCards, remainingDeck: afterTurn } = dealCards(prev.deck, 1);
          newState.communityCards = [...prev.communityCards, ...turnCards];
          newState.deck = afterTurn;
          newState.gamePhase = 'turn';
          newState.message = 'Turn dealt!';
          break;
          
        case 'turn':
          // Deal river (1 card)
          const { cards: riverCards, remainingDeck: afterRiver } = dealCards(prev.deck, 1);
          newState.communityCards = [...prev.communityCards, ...riverCards];
          newState.deck = afterRiver;
          newState.gamePhase = 'river';
          newState.message = 'River dealt!';
          break;
          
        case 'river':
          // Showdown
          newState.gamePhase = 'showdown';
          newState.showAllCards = true;
          
          // Determine winner among active players
          const activePlayers = prev.players.filter(p => !p.folded);
          
          if (activePlayers.length === 1) {
            // Only one player left
            const winner = activePlayers[0];
            winner.chips += newState.pot;
            newState.winner = winner.name;
            newState.message = `${winner.name} wins by elimination!`;
          } else {
            // Compare hands
            let bestHand = null;
            let winners = [];
            
            activePlayers.forEach(player => {
              const hand = getBestHand(player.cards, prev.communityCards);
              if (!bestHand || compareHands(hand, bestHand) > 0) {
                bestHand = hand;
                winners = [player];
              } else if (compareHands(hand, bestHand) === 0) {
                winners.push(player);
              }
            });
            
            // Distribute pot among winners
            const winnerChips = Math.floor(newState.pot / winners.length);
            winners.forEach(winner => {
              winner.chips += winnerChips;
            });
            
            if (winners.length === 1) {
              newState.winner = winners[0].name;
              newState.message = `${winners[0].name} wins with ${getHandDescription(bestHand)}!`;
            } else {
              newState.winner = 'tie';
              newState.message = `Tie between ${winners.map(w => w.name).join(', ')}!`;
            }
          }
          
          newState.pot = 0;
          newState.players = newState.players.map(p => ({ ...p, bet: 0 }));
          break;
      }

      // Reset actions for next betting round
      newState.playerAction = null;
      newState.computerAction = null;
      
      return newState;
    });
  };

  const canPlayerAct = () => {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return !gameState.winner && !gameState.gameOver && gameState.gamePhase !== 'showdown' && 
           currentPlayer && currentPlayer.isHuman && !currentPlayer.folded;
  };

  const getPlayerHand = (playerIndex = 0) => {
    if (!gameState.players[playerIndex] || gameState.players[playerIndex].cards.length === 0) return null;
    return getBestHand(gameState.players[playerIndex].cards, gameState.communityCards);
  };

  const getPlayerPosition = (playerIndex, totalPlayers) => {
    // Calculate position around the table
    const angle = (playerIndex / totalPlayers) * 360;
    const radius = 200; // Distance from center
    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
    
    return {
      left: `calc(50% + ${x}px)`,
      top: `calc(50% + ${y}px)`,
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div className="poker-game">
      <div className="game-header">
        <button className="back-button" onClick={onBackToWelcome}>
          ← Back to Menu
        </button>
        <h2>Texas Hold'em Poker</h2>
        <div className="pot-info">
          Pot: {formatChips(gameState.pot)}
        </div>
      </div>

      <div className="game-table">
        {/* Players around the table */}
        {gameState.players.map((player, index) => (
          <div 
            key={player.id}
            className={`player-area ${player.isHuman ? 'human-area' : 'computer-area'} ${gameState.currentPlayerIndex === index ? 'active' : ''}`}
            style={getPlayerPosition(index, gameState.players.length)}
          >
            <div className="player-info">
              <h3>{player.name}</h3>
              <div className="chips">💰 {formatChips(player.chips)}</div>
              <div className="bet">Bet: {formatChips(player.bet)}</div>
              {player.folded && <div className="folded-indicator">FOLDED</div>}
              {player.action && <div className="action-indicator">{player.action.toUpperCase()}</div>}
              {player.isHuman && getPlayerHand(index) && (
                <div className="hand-description">
                  {getHandDescription(getPlayerHand(index))}
                </div>
              )}
            </div>
            <div className="player-cards">
              {player.cards.map((card, cardIndex) => (
                <Card
                  key={cardIndex}
                  suit={card.suit}
                  value={card.value}
                  isHidden={!player.isHuman && !gameState.showAllCards}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Community Cards */}
        <div className="community-area">
          <h3>Community Cards</h3>
          <div className="community-cards">
            {gameState.communityCards.map((card, index) => (
              <Card
                key={index}
                suit={card.suit}
                value={card.value}
                isHighlighted={false}
              />
            ))}
            {/* Placeholder cards */}
            {[...Array(5 - gameState.communityCards.length)].map((_, index) => (
              <div key={`placeholder-${index}`} className="card-placeholder"></div>
            ))}
          </div>
        </div>
      </div>

      <div className="game-controls">
        <div className="game-message">{gameState.message}</div>
        
        {canPlayerAct() && (
          <div className="action-buttons">
            <button onClick={() => handlePlayerAction('fold')}>
              Fold
            </button>
            
            {gameState.currentBet === (gameState.players[0]?.bet || 0) && (
              <button onClick={() => handlePlayerAction('check')}>
                Check
              </button>
            )}
            
            {gameState.currentBet > (gameState.players[0]?.bet || 0) && (
              <button onClick={() => handlePlayerAction('call')}>
                Call ${gameState.currentBet - (gameState.players[0]?.bet || 0)}
              </button>
            )}
            
            <div className="bet-controls">
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max={gameState.players[0]?.chips || 0}
                className="bet-input"
              />
              <button onClick={() => handlePlayerAction('bet')}>
                {gameState.currentBet === (gameState.players[0]?.bet || 0) ? 'Bet' : 'Raise'}
              </button>
            </div>
          </div>
        )}
        
        {gameState.winner && (
          <div className="game-over">
            <button onClick={startNewHand} className="new-hand-button">
              Deal New Hand
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokerGame; 