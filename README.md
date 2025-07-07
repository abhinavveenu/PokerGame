# 🃏 Online Multiplayer Texas Hold'em Poker

A real-time multiplayer poker game built with React, Node.js, and Socket.IO. Play Texas Hold'em with friends online or practice against AI opponents locally!

## ✨ Features

### 🎮 Game Modes
- **Local Game**: Play against AI opponents (2-6 players)
- **Online Multiplayer**: Real-time gameplay with friends (2-6 players)

### 🌟 Multiplayer Features
- Real-time WebSocket communication
- Create or join game rooms with unique IDs
- Live player status and connection indicators
- Synchronized game state across all players
- Graceful handling of player disconnections

### 🎯 Poker Features
- Complete Texas Hold'em implementation
- All betting actions: fold, check, call, bet, raise
- Proper hand evaluation (Royal Flush to High Card)
- Turn-based gameplay with automatic progression
- Pot management and chip tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd WebApp
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:3001

4. **Start the frontend** (in a new terminal)
   ```bash
   npm run dev
   ```
   Frontend runs on http://127.0.0.1:5173

5. **Play!**
   - Open your browser to the frontend URL
   - Choose "Play Local" for single-player vs AI
   - Choose "Play Online" for multiplayer (requires backend running)

## 🌐 Online Multiplayer Setup

### For Friends to Join:
1. Deploy the backend (see deployment section)
2. Update frontend environment variable
3. Share the frontend URL with friends

### Environment Variables
Create a `.env` file in the project root:
```env
# Local development
VITE_SERVER_URL=http://localhost:3001

# Production (replace with your deployed backend URL)
# VITE_SERVER_URL=https://your-backend.railway.app
```

## 🚢 Deployment

### Backend Deployment (Railway)
1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Deploy the `/backend` folder
4. Note the deployed URL

### Frontend Deployment (Vercel)
1. Sign up at [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Set environment variable: `VITE_SERVER_URL=https://your-backend-url`
4. Deploy!

### Alternative Hosting Options
- **Backend**: Heroku, DigitalOcean, AWS, Google Cloud
- **Frontend**: Netlify, GitHub Pages, Firebase Hosting

## 🛠️ Technology Stack

### Frontend
- React 19 with Hooks
- Socket.IO Client for WebSocket communication
- CSS3 with animations and responsive design
- Vite for fast development and building

### Backend
- Node.js with Express
- Socket.IO for real-time communication
- UUID for unique room generation
- Modular game logic architecture

## 📁 Project Structure

```
WebApp/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   │   ├── Welcome.jsx     # Landing page
│   │   ├── PokerGame.jsx   # Local poker game
│   │   ├── Lobby.jsx       # Online lobby
│   │   ├── OnlinePokerGame.jsx # Online poker game
│   │   └── Card.jsx        # Playing card component
│   ├── services/           # Frontend services
│   │   └── socketService.js # WebSocket client
│   └── utils/              # Utility functions
│       └── pokerUtils.js   # Poker game logic
├── backend/                # Backend Node.js server
│   ├── game/               # Game logic modules
│   │   ├── GameRoom.js     # Individual game room
│   │   ├── RoomManager.js  # Room management
│   │   └── pokerUtils.js   # Server-side poker logic
│   └── server.js           # Main server file
└── README.md              # This file
```

## 🎯 Game Rules

### Texas Hold'em Basics
1. Each player gets 2 private cards
2. 5 community cards are dealt (flop, turn, river)
3. Players make the best 5-card hand
4. Betting rounds after each phase
5. Best hand wins the pot!

### Betting Actions
- **Fold**: Give up your hand
- **Check**: Pass (if no bet to call)
- **Call**: Match the current bet
- **Bet**: Make the first bet in a round
- **Raise**: Increase the current bet

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.

## 🎮 Screenshots

_Add screenshots of your game here once deployed!_

## 🔮 Future Enhancements

- [ ] Player accounts and authentication
- [ ] Game history and statistics
- [ ] Tournament mode
- [ ] Video/voice chat
- [ ] Mobile app
- [ ] Spectator mode
- [ ] Custom avatars

---

**Have fun playing poker with your friends! 🃏**
