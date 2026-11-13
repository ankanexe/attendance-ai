'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, Role } from '@/types';
import { authAPI } from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('attendai_token');
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await authAPI.getMe();
      setUser(res.data);
      setRole(res.data.role);
    } catch {
      localStorage.removeItem('attendai_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('attendai_token', res.data.access_token);
    localStorage.setItem('attendai_role', res.data.role);
    const meRes = await authAPI.getMe();
    setUser(meRes.data);
    setRole(meRes.data.role);
  };

  const logout = () => {
    localStorage.removeItem('attendai_token');
    localStorage.removeItem('attendai_role');
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, role, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
