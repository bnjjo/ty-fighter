import './Header.css'
import { useState, useEffect } from 'react'

const Header = () => {
  const [theme, setTheme] = useState('rose-pine');

  useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'rose-pine';
    setTheme(currentTheme);
  }, []);

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <header className="header">
      <div className="header-logo"></div>
      <div className="header-theme-selector">
        <select value={theme} onChange={handleThemeChange} className="theme-dropdown">
          <option value="rose-pine">rose pine</option>
          <option value="rose-pine-dawn">rose pine dawn</option>
          <option value="gruvbox">gruvbox</option>
        </select>
      </div>
    </header>
  )
}

export default Header
