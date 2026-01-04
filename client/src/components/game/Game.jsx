import './Game.css'
import { useState, useEffect, useRef } from 'react'
import TypingTest from '../typingTest/TypingTest.jsx'

const Game = ({ socket, roomCode, setGameState, setGameResults, setIsWinner }) => {
  const [text, setText] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasMistakes, setHasMistakes] = useState(false);
  const opponentFinishedFirst = useRef(false);

  useEffect(() => {
    socket.on('countdown', ({ count, text }) => {
      setText(text);
      setCountdown(count);
    });

    socket.on('game-start', () => {
      setCountdown(null);
      setGameStarted(true);
    });

    socket.on('opponent-finished', () => {
      opponentFinishedFirst.current = true;
    });

    return () => {
      socket.off('countdown');
      socket.off('game-start');
      socket.off('opponent-finished');
    };
  }, [socket]);

  const handleGameComplete = (results) => {
    setIsWinner(!opponentFinishedFirst.current);

    socket.emit('player-finished', {
      roomCode,
      wpm: results.wpm,
      accuracy: results.accuracy,
      time: results.time
    });

    setGameResults(results);
    setGameState('results');
  };

  return (
    <div className='game-wrapper'>
      <div className='game-header'>
        {countdown !== null && (
          <>
            <div className='game-countdown'>
              {countdown > 0 ? countdown : 'GO!'}
            </div>
            <div className='game-status'>
              Get ready...
            </div>
          </>
        )}
        {gameStarted && hasMistakes && (
          <div className='game-status game-status-error'>
            Fix your mistakes to finish!
          </div>
        )}
      </div>
      <div className='game-text'>
        <TypingTest
          text={text}
          gameStarted={gameStarted}
          onComplete={handleGameComplete}
          onHasMistakesChange={setHasMistakes}
        />
      </div>
    </div>
  )
}

export default Game
