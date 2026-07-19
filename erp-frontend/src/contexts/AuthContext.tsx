import React, { createContext, useContext, useState, useEffect } from 'react';

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
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('erp_token');
    const savedUser = localStorage.getItem('erp_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      const baseUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8787' : '');
      fetch(`${baseUrl}/auth/me`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${savedToken}`
        }
      })
        .then(async (res) => {
          if (res.status === 401) {
            throw new Error('unauthorized');
          }
          if (!res.ok) return;
          const data = await res.json();
          const refreshedUser = { ...parsedUser, ...(data.user || {}) };
          setUser(refreshedUser);
          localStorage.setItem('erp_user', JSON.stringify(refreshedUser));
        })
        .catch((err) => {
          if (err instanceof Error && err.message === 'unauthorized') {
            setToken(null);
            setUser(null);
            localStorage.removeItem('erp_token');
            localStorage.removeItem('erp_user');
          }
        });
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('erp_token', newToken);
    localStorage.setItem('erp_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser }}>
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
