// Server-side poker game utility functions

export const createDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]; // A, 2-10, J, Q, K
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  
  return deck;
};

export const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealCards = (deck, numCards) => {
  const cards = deck.slice(0, numCards);
  const remainingDeck = deck.slice(numCards);
  return { cards, remainingDeck };
};

// Hand evaluation functions
export const evaluateHand = (cards) => {
  const allCards = [...cards].sort((a, b) => {
    // Handle Ace as high (14) or low (1)
    const aValue = a.value === 1 ? 14 : a.value;
    const bValue = b.value === 1 ? 14 : b.value;
    return bValue - aValue;
  });
  
  const handRank = getHandRank(allCards);
  return {
    rank: handRank.rank,
    name: handRank.name,
    cards: allCards,
    highCard: allCards[0]
  };
};

const getHandRank = (cards) => {
  const values = cards.map(card => card.value === 1 ? 14 : card.value);
  const suits = cards.map(card => card.suit);
  
  const valueCounts = {};
  values.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const uniqueValues = Object.keys(valueCounts).map(Number).sort((a, b) => b - a);
  
  const isFlush = suits.every(suit => suit === suits[0]);
  const isStraight = checkStraight(uniqueValues);
  
  // Check for Royal Flush
  if (isFlush && isStraight && uniqueValues[0] === 14 && uniqueValues[4] === 10) {
    return { rank: 10, name: 'Royal Flush' };
  }
  
  // Check for Straight Flush
  if (isFlush && isStraight) {
    return { rank: 9, name: 'Straight Flush' };
  }
  
  // Check for Four of a Kind
  if (counts[0] === 4) {
    return { rank: 8, name: 'Four of a Kind' };
  }
  
  // Check for Full House
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 7, name: 'Full House' };
  }
  
  // Check for Flush
  if (isFlush) {
    return { rank: 6, name: 'Flush' };
  }
  
  // Check for Straight
  if (isStraight) {
    return { rank: 5, name: 'Straight' };
  }
  
  // Check for Three of a Kind
  if (counts[0] === 3) {
    return { rank: 4, name: 'Three of a Kind' };
  }
  
  // Check for Two Pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 3, name: 'Two Pair' };
  }
  
  // Check for One Pair
  if (counts[0] === 2) {
    return { rank: 2, name: 'One Pair' };
  }
  
  // High Card
  return { rank: 1, name: 'High Card' };
};

const checkStraight = (values) => {
  if (values.length < 5) return false;
  
  // Check for regular straight
  for (let i = 0; i < values.length - 4; i++) {
    if (values[i] - values[i + 4] === 4) {
      return true;
    }
  }
  
  // Check for low straight (A, 2, 3, 4, 5)
  if (values.includes(14) && values.includes(5) && values.includes(4) && 
      values.includes(3) && values.includes(2)) {
    return true;
  }
  
  return false;
};

export const getBestHand = (playerCards, communityCards) => {
  const allCards = [...playerCards, ...communityCards];
  
  if (allCards.length < 5) {
    return evaluateHand(allCards);
  }
  
  // Generate all possible 5-card combinations
  const combinations = getCombinations(allCards, 5);
  let bestHand = null;
  
  for (const combo of combinations) {
    const hand = evaluateHand(combo);
    if (!bestHand || hand.rank > bestHand.rank) {
      bestHand = hand;
    } else if (hand.rank === bestHand.rank) {
      // Compare high cards for tie-breaking
      if (compareHighCards(hand.cards, bestHand.cards) > 0) {
        bestHand = hand;
      }
    }
  }
  
  return bestHand;
};

const getCombinations = (arr, k) => {
  if (k > arr.length) return [];
  if (k === 1) return arr.map(el => [el]);
  
  const combinations = [];
  for (let i = 0; i < arr.length - k + 1; i++) {
    const head = arr[i];
    const tailCombinations = getCombinations(arr.slice(i + 1), k - 1);
    for (const tail of tailCombinations) {
      combinations.push([head, ...tail]);
    }
  }
  
  return combinations;
};

const compareHighCards = (cards1, cards2) => {
  const values1 = cards1.map(card => card.value === 1 ? 14 : card.value).sort((a, b) => b - a);
  const values2 = cards2.map(card => card.value === 1 ? 14 : card.value).sort((a, b) => b - a);
  
  for (let i = 0; i < Math.min(values1.length, values2.length); i++) {
    if (values1[i] > values2[i]) return 1;
    if (values1[i] < values2[i]) return -1;
  }
  
  return 0;
};

export const compareHands = (hand1, hand2) => {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  return compareHighCards(hand1.cards, hand2.cards);
};

// AI decision making for computer player
export const getComputerAction = (playerCards, communityCards, currentBet, playerChips, pot) => {
  const hand = getBestHand(playerCards, communityCards);
  const handStrength = hand.rank;
  
  // Simple AI strategy based on hand strength
  if (handStrength >= 7) { // Full House or better
    return { action: 'raise', amount: Math.min(currentBet * 2, playerChips) };
  } else if (handStrength >= 4) { // Three of a Kind or better
    return { action: 'call', amount: currentBet };
  } else if (handStrength >= 2) { // One Pair or better
    if (currentBet <= pot * 0.3) {
      return { action: 'call', amount: currentBet };
    } else {
      return { action: 'fold', amount: 0 };
    }
  } else { // High Card
    if (currentBet === 0) {
      return { action: 'check', amount: 0 };
    } else {
      return { action: 'fold', amount: 0 };
    }
  }
};

export const formatChips = (amount) => {
  return `$${amount.toLocaleString()}`;
};

export const getHandDescription = (hand) => {
  if (!hand) return 'No hand';
  
  const { name, cards } = hand;
  const highCard = cards[0];
  const highCardName = highCard.value === 1 ? 'Ace' : 
                      highCard.value === 11 ? 'Jack' :
                      highCard.value === 12 ? 'Queen' :
                      highCard.value === 13 ? 'King' : 
                      highCard.value.toString();
  
  return `${name} (${highCardName} high)`;
}; 