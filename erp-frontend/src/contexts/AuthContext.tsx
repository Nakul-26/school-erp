import React, { createContext, useContext, useState, useEffect } from 'react';
import { BASE_URL } from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role?: string;
  permissions?: string[];
  institution_id: string;
  institution_name?: string;
  profile_photo?: string;
  username?: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_user');
    const cachedUser = savedUser ? JSON.parse(savedUser) : null;
    if (cachedUser) setUser(cachedUser);

    // The session itself lives in an httpOnly cookie; validate it against the
    // server rather than trusting the cached profile alone.
    fetch(`${BASE_URL}/auth/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error('unauthorized');
        }
        if (!res.ok) return;
        const data = await res.json();
        const refreshedUser = { ...(cachedUser || {}), ...(data.user || {}) };
        setUser(refreshedUser);
        localStorage.setItem('erp_user', JSON.stringify(refreshedUser));
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'unauthorized') {
          setUser(null);
          localStorage.removeItem('erp_user');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('erp_user', JSON.stringify(newUser));
  };

  const logout = () => {
    fetch(`${BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).finally(() => {
      setUser(null);
      localStorage.removeItem('erp_user');
      window.location.href = '/login';
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
