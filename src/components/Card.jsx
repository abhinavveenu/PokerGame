import React from 'react';
import './Card.css';

const Card = ({ suit, value, isHidden = false, isHighlighted = false }) => {
  const getSuitSymbol = (suit) => {
    const symbols = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠'
    };
    return symbols[suit] || '♠';
  };

  const getDisplayValue = (value) => {
    if (value === 1) return 'A';
    if (value === 11) return 'J';
    if (value === 12) return 'Q';
    if (value === 13) return 'K';
    return value.toString();
  };

  const isRed = suit === 'hearts' || suit === 'diamonds';

  if (isHidden) {
    return (
      <div className="card card-hidden">
        <div className="card-back">
          <div className="card-back-pattern"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${isRed ? 'red' : 'black'} ${isHighlighted ? 'highlighted' : ''}`}>
      <div className="card-front">
        <div className="card-corner top-left">
          <div className="card-value">{getDisplayValue(value)}</div>
          <div className="card-suit">{getSuitSymbol(suit)}</div>
        </div>
        <div className="card-center">
          <div className="card-suit-large">{getSuitSymbol(suit)}</div>
        </div>
        <div className="card-corner bottom-right">
          <div className="card-value">{getDisplayValue(value)}</div>
          <div className="card-suit">{getSuitSymbol(suit)}</div>
        </div>
      </div>
    </div>
  );
};

export default Card; 