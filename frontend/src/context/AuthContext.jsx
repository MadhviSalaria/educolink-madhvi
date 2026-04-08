import { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = (nextUser) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  useEffect(() => {
    let active = true;

    const hydrateAuth = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (!savedToken || !savedUser) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        if (active) {
          setToken(savedToken);
          persistUser(parsedUser);
        }

        const data = await getCurrentUser(savedToken);
        if (active && data?.user) {
          persistUser(data.user);
        }
      } catch (error) {
        if (active && /invalid|expired|authorization|token/i.test(String(error?.message || ''))) {
          clearAuthState();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    hydrateAuth();

    return () => {
      active = false;
    };
  }, []);

  const login = (userData, authToken) => {
    setToken(authToken);
    persistUser(userData);
    localStorage.setItem('token', authToken);
  };

  const updateUser = (userData) => {
    persistUser(userData);
  };

  const refreshUser = async () => {
    const activeToken = token || localStorage.getItem('token');
    if (!activeToken) {
      return null;
    }

    const data = await getCurrentUser(activeToken);
    if (data?.user) {
      persistUser(data.user);
      return data.user;
    }

    return null;
  };

  const logout = () => {
    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
        isAuthenticated: Boolean(token && user),
        homePath: user?.role === 'wellwisher' ? '/wellwisher' : '/',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
