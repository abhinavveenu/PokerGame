import { useState } from 'react'
import Welcome from './components/Welcome'
import PokerGame from './components/PokerGame'
import Lobby from './components/Lobby'
import OnlinePokerGame from './components/OnlinePokerGame'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('welcome')
  const [playerCount, setPlayerCount] = useState(2)
  const [onlineGameState, setOnlineGameState] = useState(null)
  const [playerId, setPlayerId] = useState(null)

  const handleStartLocalGame = (numPlayers) => {
    setPlayerCount(numPlayers)
    setCurrentView('local-game')
  }

  const handleStartOnlineGame = () => {
    setCurrentView('lobby')
  }

  const handleJoinOnlineRoom = (gameState, playerIdFromServer) => {
    setOnlineGameState(gameState)
    setPlayerId(playerIdFromServer)
    setCurrentView('online-game')
  }

  const handleBackToWelcome = () => {
    setCurrentView('welcome')
    setOnlineGameState(null)
    setPlayerId(null)
  }

  const handleBackToLobby = () => {
    setCurrentView('lobby')
    setOnlineGameState(null)
    setPlayerId(null)
  }

  const handleLeaveOnlineGame = () => {
    setCurrentView('welcome')
    setOnlineGameState(null)
    setPlayerId(null)
  }

  return (
    <div className="App">
      {currentView === 'welcome' && (
        <Welcome 
          onStartGame={handleStartLocalGame}
          onStartOnlineGame={handleStartOnlineGame}
        />
      )}
      {currentView === 'local-game' && (
        <PokerGame 
          onBackToWelcome={handleBackToWelcome} 
          playerCount={playerCount}
        />
      )}
      {currentView === 'lobby' && (
        <Lobby 
          onJoinRoom={handleJoinOnlineRoom}
          onGoBack={handleBackToWelcome}
        />
      )}
      {currentView === 'online-game' && (
        <OnlinePokerGame
          initialGameState={onlineGameState}
          playerId={playerId}
          onLeaveGame={handleLeaveOnlineGame}
        />
      )}
    </div>
  )
}

export default App
