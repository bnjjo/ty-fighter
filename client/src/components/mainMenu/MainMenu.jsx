import './MainMenu.css'
import { useState, useEffect } from 'react'

const MainMenu = ({ socket, setRoomCode, setGameState }) => {
  const [inputtedCode, setInputtedCode] = useState('');

  const joinRoom = () => {
    if (inputtedCode.trim()) {
      socket.emit('join-room', inputtedCode.toUpperCase());
    }
  }

  const createRoom = () => {
    socket.emit('create-room');
  }

  useEffect(() => {
    socket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setGameState('lobby');
    });

    socket.on('room-ready', () => {
      setGameState('lobby');
    });

    socket.on('room-joined', ({ roomCode }) => {
      setRoomCode(roomCode);
    })

    return () => {
      socket.off('room-created');
      socket.off('room-ready');
    };
  }, [socket]);

  return (
    <div className='home-wrapper'>
      <textarea
        rows=""
        cols=""
        className='home-code-input'
        value={inputtedCode}
        onChange={(e) => setInputtedCode(e.target.value)}
        placeholder='enter room code'>
      </textarea>
      <button onClick={joinRoom} className='home-button'>join room</button>
      <button onClick={createRoom} className='home-button'>create room</button>
    </div>
  )
}

export default MainMenu
