import './Matches.css'
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const Matches = ({ user }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.guestId) return;

    const fetchMatches = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users/${user.guestId}/matches`);
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        }
      } catch (error) {
        console.error('error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user]);

  if (loading) {
    return (
      <div className="matches-wrapper">
        <h2 className="matches-title">match history</h2>
        <div className="matches-loading">loading...</div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches-wrapper">
        <h2 className="matches-title">match history</h2>
        <div className="matches-empty">no matches played yet</div>
      </div>
    );
  }

  return (
    <div className="matches-wrapper">
      <h2 className="matches-title">match history</h2>
      <div className="matches-table-container">
        <table className="matches-table">
          <thead>
            <tr>
              <th>result</th>
              <th>opponent</th>
              <th>your wpm</th>
              <th>opp wpm</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr key={match.id} className={index % 2 === 0 ? 'even' : 'odd'}>
                <td className={`result ${match.result === 'WIN' ? 'WIN' : 'LOSS'}`}>
                  {match.result}
                </td>
                <td>{match.opponent}</td>
                <td>{match.playerWpm}</td>
                <td>{match.opponentWpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Matches;
