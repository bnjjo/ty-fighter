import './MainMenu.css'
import Header from '../header/Header.jsx'
import Matches from '../matches/Matches.jsx'
import { useState, useEffect, useMemo } from 'react'

const Hexagon = ({ style }) => (
  <div className="hexagon" style={style} />
);

const MainMenu = ({ socket, user, setRoomCode, setGameState }) => {
  const [inputtedCode, setInputtedCode] = useState('');

  const hexagons = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const size = Math.random() * 590 + 10; // 10-600px (huge variation)
      const left = Math.random() * 100; // 0-100% position
      const duration = Math.random() * 15 + 20; // 20-35s fall duration
      const delay = Math.random() * -20; // stagger start times
      const initialRotation = Math.random() * 360; // 0-360 degrees
      const rotationSpeed = (Math.random() - 0.5) * 600; // -300 to 300 degrees per cycle

      return {
        id: i,
        size,
        left,
        duration,
        delay,
        initialRotation,
        rotationSpeed,
      };
    });
  }, []);

  const joinRoom = () => {
    if (inputtedCode.trim()) {
      socket.emit('join-room', { roomCode: inputtedCode.toUpperCase(), guestId: user.guestId });
    }
  }

  const createRoom = () => {
    socket.emit('create-room', { guestId: user.guestId });
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
    <>
      <Header user={user} />
      <div className='home-wrapper'>
        <div className="hexagon-container">
          {hexagons.map((hex) => (
            <div
              key={hex.id}
              className="hexagon-wrapper"
              style={{
                '--fall-duration': `${hex.duration}s`,
                '--fall-delay': `${hex.delay}s`,
                '--hex-left': `${hex.left}%`,
                '--initial-rotation': `${hex.initialRotation}deg`,
                '--rotation-speed': `${hex.rotationSpeed}deg`,
              }}
            >
              <Hexagon
                style={{
                  width: `${hex.size}px`,
                  height: `${hex.size * 1.1547}px`,
                }}
              />
            </div>
          ))}
        </div>

        <div className="home-scrollable-content">
          <div className="home-content">
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

          <Matches user={user} />
        </div>
      </div>
    </>
  )
}

export default MainMenu
