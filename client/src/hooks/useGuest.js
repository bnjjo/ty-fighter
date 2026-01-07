import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function useGuest() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeGuest();
  }, []);

  const initializeGuest = async () => {
    try {
      let guestId = localStorage.getItem('ty-fighter-guest-id');

      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem('ty-fighter-guest-id', guestId);
      }

      console.log('Initializing guest with API_URL:', API_URL);

      const response = await fetch(`${API_URL}/api/users/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guestId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize guest user: ${response.status}`);
      }

      const userData = await response.json();
      console.log('Guest user initialized:', userData);
      setUser(userData);
    } catch (error) {
      console.error('Error initializing guest:', error);
      console.error('API_URL was:', API_URL);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading };
}
