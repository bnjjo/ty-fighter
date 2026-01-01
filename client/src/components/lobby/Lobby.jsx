import './Lobby.css'

const Lobby = ({ socket, roomCode, gameState }) => {
  return (
    <div className='lobby-wrapper'>
      <div className='lobby-text'>
        Welcome!<br />
        Room code: <strong>{roomCode}</strong>
      </div>
    </div>
  )
}

export default Lobby
