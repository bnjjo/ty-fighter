import './App.css'
import './index.css'

import { useState } from 'react'
import { useSocket } from './hooks/useSocket.js'

import MainMenu from './components/mainMenu/MainMenu.jsx'
import Lobby from './components/lobby/Lobby.jsx'
import Game from './components/game/Game.jsx'
import Results from './components/results/Results.jsx'

function App() {
  const { socket, isConnected } = useSocket();
  const [roomCode, setRoomCode] = useState(null);
  const [gameState, setGameState] = useState('home');

  if (!isConnected) {
    return <div>Connecting to server...</div>;
  }

  return (
    <>
      {gameState === 'home' &&
        <MainMenu
          socket={socket}
          setRoomCode={setRoomCode} app
          setGameState={setGameState}
        />}
      {gameState === 'lobby' &&
        <Lobby
          socket={socket}
          roomCode={roomCode}
          setGameState={setGameState}
        />}
      {gameState === 'game' &&
        <Game
          socket={socket}
          roomCode={roomCode}
          gameState={gameState}
        />}
      {gameState === 'results' &&
        <Results
          socket={socket}
          roomCode={roomCode}
          gameState={gameState}
        />}
    </>
  )
}

export default App
