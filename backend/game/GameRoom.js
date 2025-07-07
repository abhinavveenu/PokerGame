import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  getBestHand, 
  compareHands, 
  getComputerAction,
  getHandDescription 
} from './pokerUtils.js';

export class GameRoom {
  constructor(id, maxPlayers = 6) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // playerId -> player object
    this.gameState = {
      deck: [],
      communityCards: [],
      pot: 0,
      currentBet: 0,
      gamePhase: 'waiting', // waiting, pre-flop, flop, turn, river, showdown
      currentPlayerIndex: 0,
      dealerIndex: 0,
      winner: null,
      message: 'Waiting for players to join...',
      showAllCards: false,
      roundStartTime: null
    };
    
    this.gameActive = false;
    this.autoAdvanceTimer = null;
  }

  // Player management
  addPlayer(playerId, playerName) {
    if (this.players.size >= this.maxPlayers) {
      return false;
    }

    const player = {
      id: playerId,
      name: playerName,
      cards: [],
      chips: 1000,
      bet: 0,
      folded: false,
      action: null,
      position: this.players.size,
      isConnected: true,
      lastActionTime: Date.now()
    };

    this.players.set(playerId, player);
    
    // Start game if we have at least 2 players
    if (this.players.size >= 2 && this.gameState.gamePhase === 'waiting') {
      this.startNewHand();
    }

    return true;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;

    // If game is active and player was in the hand, handle appropriately
    if (this.gameActive && !player.folded) {
      player.folded = true;
      player.action = 'disconnect';
      
      // Check if game should end due to insufficient players
      const activePlayers = this.getActivePlayers();
      if (activePlayers.length <= 1) {
        this.endHand();
      }
    }

    this.players.delete(playerId);
    
    // Adjust positions
    this.reassignPositions();
    
    return true;
  }

  reassignPositions() {
    let position = 0;
    for (const player of this.players.values()) {
      player.position = position++;
    }
  }

  // Game state management
  getGameState() {
    // Return sanitized game state (hide other players' cards)
    const sanitizedPlayers = Array.from(this.players.values()).map(player => ({
      id: player.id,
      name: player.name,
      chips: player.chips,
      bet: player.bet,
      folded: player.folded,
      action: player.action,
      position: player.position,
      isConnected: player.isConnected,
      cardCount: player.cards.length, // Don't reveal actual cards
      cards: this.gameState.showAllCards || this.gameState.gamePhase === 'showdown' 
        ? player.cards 
        : player.cards.map(() => ({ suit: 'hidden', value: 'hidden' }))
    }));

    return {
      ...this.gameState,
      players: sanitizedPlayers,
      roomId: this.id,
      maxPlayers: this.maxPlayers,
      playerCount: this.players.size
    };
  }

  // Get game state for a specific player (shows their cards)
  getPlayerGameState(playerId) {
    const gameState = this.getGameState();
    const player = this.players.get(playerId);
    
    if (player) {
      // Show this player's actual cards
      const playerIndex = gameState.players.findIndex(p => p.id === playerId);
      if (playerIndex !== -1) {
        gameState.players[playerIndex].cards = player.cards;
      }
    }
    
    return gameState;
  }

  startNewHand() {
    if (this.players.size < 2) {
      this.gameState.message = 'Waiting for more players...';
      return;
    }

    console.log(`Starting new hand in room ${this.id}`);
    
    // Initialize deck and shuffle
    const deck = shuffleDeck(createDeck());
    
    // Reset all players for new hand
    for (const player of this.players.values()) {
      player.cards = [];
      player.bet = 0;
      player.folded = false;
      player.action = null;
    }
    
    // Deal 2 cards to each player
    let remainingDeck = deck;
    for (const player of this.players.values()) {
      const { cards, remainingDeck: newDeck } = dealCards(remainingDeck, 2);
      player.cards = cards;
      remainingDeck = newDeck;
    }

    // Reset game state
    this.gameState = {
      ...this.gameState,
      deck: remainingDeck,
      communityCards: [],
      pot: 0,
      currentBet: 0,
      gamePhase: 'pre-flop',
      currentPlayerIndex: 0,
      winner: null,
      message: 'New hand started! Place your bets.',
      showAllCards: false,
      roundStartTime: Date.now()
    };

    this.gameActive = true;
    
    // Start auto-advance timer for AI players
    this.scheduleNextAction();
  }

  handlePlayerAction(playerId, action, amount = 0) {
    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.folded) {
      return { success: false, error: 'Player has already folded' };
    }

    if (this.gameState.gamePhase === 'showdown' || this.gameState.gamePhase === 'waiting') {
      return { success: false, error: 'Cannot act during this phase' };
    }

    // Validate action
    const validation = this.validateAction(player, action, amount);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Execute action
    this.executeAction(player, action, amount);
    
    // Move to next player or phase
    this.advanceGame();

    return { success: true };
  }

  validateAction(player, action, amount) {
    switch (action) {
      case 'fold':
        return { valid: true };
        
      case 'check':
        if (this.gameState.currentBet > player.bet) {
          return { valid: false, error: 'Cannot check when there is a bet to call' };
        }
        return { valid: true };
        
      case 'call':
        const callAmount = this.gameState.currentBet - player.bet;
        if (callAmount > player.chips) {
          return { valid: false, error: 'Insufficient chips to call' };
        }
        return { valid: true };
        
      case 'bet':
      case 'raise':
        if (amount <= 0) {
          return { valid: false, error: 'Bet amount must be positive' };
        }
        if (amount > player.chips) {
          return { valid: false, error: 'Insufficient chips for bet' };
        }
        if (action === 'raise' && this.gameState.currentBet === 0) {
          return { valid: false, error: 'Cannot raise when there is no bet' };
        }
        return { valid: true };
        
      default:
        return { valid: false, error: 'Invalid action' };
    }
  }

  executeAction(player, action, amount) {
    player.lastActionTime = Date.now();
    
    switch (action) {
      case 'fold':
        player.folded = true;
        player.action = 'fold';
        this.gameState.message = `${player.name} folded`;
        break;
        
      case 'check':
        player.action = 'check';
        this.gameState.message = `${player.name} checked`;
        break;
        
      case 'call':
        const callAmount = this.gameState.currentBet - player.bet;
        player.chips -= callAmount;
        player.bet += callAmount;
        this.gameState.pot += callAmount;
        player.action = 'call';
        this.gameState.message = `${player.name} called $${callAmount}`;
        break;
        
      case 'bet':
        player.chips -= amount;
        player.bet += amount;
        this.gameState.pot += amount;
        this.gameState.currentBet = Math.max(this.gameState.currentBet, player.bet);
        player.action = 'bet';
        this.gameState.message = `${player.name} bet $${amount}`;
        break;
        
      case 'raise':
        const totalRaise = amount;
        player.chips -= totalRaise;
        player.bet += totalRaise;
        this.gameState.pot += totalRaise;
        this.gameState.currentBet = player.bet;
        player.action = 'raise';
        this.gameState.message = `${player.name} raised to $${player.bet}`;
        break;
    }
  }

  advanceGame() {
    // Check if all active players have acted
    const activePlayers = this.getActivePlayers();
    const playersWhoNeedToAct = activePlayers.filter(p => 
      p.action === null || (this.gameState.currentBet > p.bet && !p.folded)
    );

    if (playersWhoNeedToAct.length === 0 || activePlayers.length <= 1) {
      this.advanceToNextPhase();
    } else {
      // Move to next player
      this.moveToNextPlayer();
      this.scheduleNextAction();
    }
  }

  moveToNextPlayer() {
    const playersArray = Array.from(this.players.values());
    let attempts = 0;
    
    do {
      this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % playersArray.length;
      attempts++;
    } while (
      attempts < playersArray.length && 
      (playersArray[this.gameState.currentPlayerIndex].folded || 
       !playersArray[this.gameState.currentPlayerIndex].isConnected)
    );
  }

  scheduleNextAction() {
    // Clear existing timer
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }

    // Schedule next action for AI players
    const playersArray = Array.from(this.players.values());
    const currentPlayer = playersArray[this.gameState.currentPlayerIndex];
    
    if (currentPlayer && !currentPlayer.id.startsWith('human-')) {
      // This is an AI player - auto-play after delay
      this.autoAdvanceTimer = setTimeout(() => {
        this.executeAIAction(currentPlayer);
      }, 1500); // 1.5 second delay for realism
    }
  }

  executeAIAction(player) {
    const decision = getComputerAction(
      player.cards,
      this.gameState.communityCards,
      this.gameState.currentBet - player.bet,
      player.chips,
      this.gameState.pot
    );

    this.executeAction(player, decision.action, decision.amount);
    this.advanceGame();
  }

  advanceToNextPhase() {
    // Reset actions for next round
    for (const player of this.players.values()) {
      player.action = null;
    }

    switch (this.gameState.gamePhase) {
      case 'pre-flop':
        this.dealFlop();
        break;
      case 'flop':
        this.dealTurn();
        break;
      case 'turn':
        this.dealRiver();
        break;
      case 'river':
        this.showdown();
        break;
      default:
        break;
    }
  }

  dealFlop() {
    const { cards: flopCards, remainingDeck } = dealCards(this.gameState.deck, 3);
    this.gameState.communityCards = flopCards;
    this.gameState.deck = remainingDeck;
    this.gameState.gamePhase = 'flop';
    this.gameState.currentBet = 0;
    this.gameState.message = 'Flop dealt!';
    
    // Reset bets for new round
    for (const player of this.players.values()) {
      player.bet = 0;
    }
    
    this.scheduleNextAction();
  }

  dealTurn() {
    const { cards: turnCards, remainingDeck } = dealCards(this.gameState.deck, 1);
    this.gameState.communityCards.push(...turnCards);
    this.gameState.deck = remainingDeck;
    this.gameState.gamePhase = 'turn';
    this.gameState.currentBet = 0;
    this.gameState.message = 'Turn dealt!';
    
    // Reset bets for new round
    for (const player of this.players.values()) {
      player.bet = 0;
    }
    
    this.scheduleNextAction();
  }

  dealRiver() {
    const { cards: riverCards, remainingDeck } = dealCards(this.gameState.deck, 1);
    this.gameState.communityCards.push(...riverCards);
    this.gameState.deck = remainingDeck;
    this.gameState.gamePhase = 'river';
    this.gameState.currentBet = 0;
    this.gameState.message = 'River dealt!';
    
    // Reset bets for new round
    for (const player of this.players.values()) {
      player.bet = 0;
    }
    
    this.scheduleNextAction();
  }

  showdown() {
    this.gameState.gamePhase = 'showdown';
    this.gameState.showAllCards = true;
    
    const activePlayers = this.getActivePlayers();
    
    if (activePlayers.length === 1) {
      // Only one player left
      const winner = activePlayers[0];
      winner.chips += this.gameState.pot;
      this.gameState.winner = winner.name;
      this.gameState.message = `${winner.name} wins by elimination! (+$${this.gameState.pot})`;
    } else {
      // Compare hands
      this.determineWinner(activePlayers);
    }
    
    this.endHand();
  }

  determineWinner(activePlayers) {
    let bestHand = null;
    let winners = [];
    
    // Evaluate all hands
    const playerHands = activePlayers.map(player => ({
      player,
      hand: getBestHand(player.cards, this.gameState.communityCards)
    }));
    
    // Find the best hand(s)
    for (const { player, hand } of playerHands) {
      if (!bestHand || compareHands(hand, bestHand) > 0) {
        bestHand = hand;
        winners = [player];
      } else if (compareHands(hand, bestHand) === 0) {
        winners.push(player);
      }
    }
    
    // Distribute pot
    const winnerChips = Math.floor(this.gameState.pot / winners.length);
    winners.forEach(winner => {
      winner.chips += winnerChips;
    });
    
    if (winners.length === 1) {
      this.gameState.winner = winners[0].name;
      this.gameState.message = `${winners[0].name} wins with ${getHandDescription(bestHand)}! (+$${winnerChips})`;
    } else {
      this.gameState.winner = 'tie';
      this.gameState.message = `Tie between ${winners.map(w => w.name).join(', ')}! Each wins $${winnerChips}`;
    }
  }

  endHand() {
    this.gameActive = false;
    this.gameState.pot = 0;
    
    // Reset player bets
    for (const player of this.players.values()) {
      player.bet = 0;
    }
    
    // Schedule next hand
    setTimeout(() => {
      if (this.players.size >= 2) {
        this.startNewHand();
      } else {
        this.gameState.gamePhase = 'waiting';
        this.gameState.message = 'Waiting for more players...';
      }
    }, 5000); // 5 second delay before next hand
  }

  // Helper methods
  getActivePlayers() {
    return Array.from(this.players.values()).filter(p => !p.folded && p.isConnected);
  }

  getPlayerCount() {
    return this.players.size;
  }

  getPlayerIds() {
    return Array.from(this.players.keys());
  }

  isEmpty() {
    return this.players.size === 0;
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  isGameActive() {
    return this.gameActive;
  }

  // Cleanup
  destroy() {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
    }
    this.players.clear();
  }
} 