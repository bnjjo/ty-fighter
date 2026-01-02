import './Game.css'
import { useState, useEffect } from 'react'
import TypingTest from '../typingTest/TypingTest.jsx'

const Game = ({ socket, roomCode, setGameState }) => {
  const [text, setText] = useState('');
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    socket.on('countdown', ({ count, text }) => {
      setText(text);
      setCountdown(count);
    });

    socket.on('game-start', () => {
      setCountdown(null);
    });

    return () => {
      socket.off('countdown');
      socket.off('game-start');
    };
  }, [socket]);

  return (
    <div className='game-wrapper'>
      <div className='game-countdown'>
        {countdown}
      </div>
      <div className='game-text'>
        <TypingTest text={text} setGameState={setGameState} />
      </div>
    </div>
  )
}

export default Game
