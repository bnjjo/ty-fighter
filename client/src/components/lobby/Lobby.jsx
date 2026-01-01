import './Lobby.css'
import { useState, useEffect } from 'react'

const Lobby = ({ socket, roomCode, setGameState }) => {
  const [ready, setReady] = useState('Not ready');

  const readyUp = () => {
    socket.emit('player-ready', roomCode);
    setReady('Ready!');
  }

  useEffect(() => {
    socket.on('countdown', () => {
      setGameState('game')
    });

    return () => {
      socket.off('countdown');
    };
  }, [socket])

  return (
    <div className='lobby-wrapper'>
      <div className='lobby-text'>
        Welcome!<br />
        Room code: <strong>{roomCode}</strong>
      </div>
      <button className='lobby-ready-button' onClick={readyUp}>{ready}</button>
    </div>
  )
}

export default Lobby
