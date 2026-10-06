import { createContext, useState, useEffect } from 'react';
import { getCurrentUser } from './api-auth';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [sessionError, setSessionError] = useState(null);

  const userId = user ? user.id : null;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let actual = true;

    getCurrentUser(userId)
      .then((data) => {
        if (actual) {
          setUser(data.user);
          setSessionError(null);
        }
      })
      .catch(() => {
        if (actual) {
          setSessionError('Сервер временно недоступен. Попробуйте обновить страницу позже.');
        }
      });

    return () => {
      actual = false;
    };
  }, [userId]);

  const login = (userData) => {
    setUser(userData);
    setSessionError(null);
  };

  const logout = () => {
    setUser(null);
  };

  const updateUser = (newData) => {
    setUser({ ...user, ...newData });
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, sessionError }}>
      {children}
    </AuthContext.Provider>
  );
}
