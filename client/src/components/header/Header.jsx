import './Header.css'
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

const Header = ({ user }) => {
  const [theme, setTheme] = useState('rose-pine');

  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
      document.documentElement.setAttribute('data-theme', user.theme);
    }
  }, [user]);

  const handleThemeChange = async (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    if (user?.guestId) {
      try {
        await fetch(`${API_URL}/api/users/${user.guestId}/theme`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <header className="header">
      <div className="header-logo"></div>
      <div className="header-right">
        <div className="header-theme-selector">
          <select value={theme} onChange={handleThemeChange} className="theme-dropdown">
            <option value="rose-pine">rose pine</option>
            <option value="rose-pine-dawn">rose pine dawn</option>
            <option value="gruvbox">gruvbox</option>
          </select>
        </div>
        {user && (
          <div className="header-user">
            <div className="user-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" fill="currentColor"/>
                <path d="M6.5 18.5C7.5 16 9.5 14.5 12 14.5C14.5 14.5 16.5 16 17.5 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="user-name">{user.displayName}</span>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
