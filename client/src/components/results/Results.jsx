import './Results.css'
import { useState, useEffect } from 'react'
import confetti from 'canvas-confetti'

const Results = ({ socket, roomCode, gameResults, setGameState, isWinner }) => {
  const [ready, setReady] = useState('Not ready');
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);

  const handleReadyUp = () => {
    socket.emit('rematch-vote', roomCode);
    setReady('Ready!');
  };

  const handleMainMenu = () => {
    socket.emit('leave-room', roomCode);
    setGameState('home');
  };

  useEffect(() => {
    socket.on('countdown', () => {
      setGameState('game');
    });
    socket.on('opponent-finished', () => {
      setOpponentFinished(true);
    });
    socket.on('player-left', () => {
      setOpponentLeft(true);
    });
    return () => {
      socket.off('countdown');
      socket.off('opponent-finished');
      socket.off('player-left');
    };
  }, [socket, setGameState]);

  // confetti :D
  useEffect(() => {
    if (isWinner) {
      const fireConfetti = () => {
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 }
        });
      };
      fireConfetti();
      const timer1 = setTimeout(fireConfetti, 500);
      const timer2 = setTimeout(fireConfetti, 1000);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isWinner]);

  if (!gameResults) {
    return (
      <div className="results-wrapper">
        <div className="results-loading">Loading results...</div>
      </div>
    );
  }

  const waitingForOpponent = isWinner && !opponentFinished && !opponentLeft;

  return (
    <div className="results-wrapper">
      <h1 className={`results-title ${isWinner ? 'results-title-winner' : 'results-title-loser'}`}>
        {isWinner ? 'You won!' : 'Better luck next time...'}
      </h1>
      <div className="results-stats">
        <div className="stat-card stat-wpm">
          <span className="stat-value">{gameResults.wpm}</span>
          <span className="stat-label">WPM</span>
        </div>
        <div className="stat-card stat-accuracy">
          <span className="stat-value">{gameResults.accuracy}%</span>
          <span className="stat-label">Accuracy</span>
        </div>
        <div className="stat-card stat-time">
          <span className="stat-value">{gameResults.time}s</span>
          <span className="stat-label">Time</span>
        </div>
      </div>
      <div className="results-details">
        <p>Correct characters: {gameResults.correctChars}</p>
        <p>Total characters: {gameResults.totalChars}</p>
      </div>
      <div className="results-actions">
        {!opponentLeft && (
          <button
            className={`results-button ${waitingForOpponent ? 'results-button-disabled' : ''}`}
            onClick={handleReadyUp}
            disabled={waitingForOpponent}
          >
            {ready}
          </button>
        )}
        <button className="results-button results-button-secondary" onClick={handleMainMenu}>
          Main Menu
        </button>
      </div>
      {waitingForOpponent && (
        <div className="opponent-status">
          Opponent is still typing...
        </div>
      )}
      {opponentLeft && (
        <div className="opponent-status opponent-left">
          Opponent has left the match
        </div>
      )}
    </div>
  );
};

export default Results
