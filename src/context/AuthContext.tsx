import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserStats } from '../types';
import { api, authStorage } from '../api';

interface AuthContextType {
  currentUser: User | null;
  userStats: UserStats | null;
  isLoading: boolean;
  login: (loginInput: string, password: string) => Promise<void>;
  signup: (name: string, username: string, email: string, password: string) => Promise<{ requireEmailVerification: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  showAuthModal: boolean;
  authModalTab: 'login' | 'signup' | 'forgot-password';
  setAuthModalTab: (tab: 'login' | 'signup' | 'forgot-password') => void;
  openAuthModal: (tab?: 'login' | 'signup' | 'forgot-password') => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup' | 'forgot-password'>('login');

  const refreshUser = useCallback(async () => {
    const token = authStorage.getToken();
    if (!token) {
      setCurrentUser(null);
      setUserStats(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setCurrentUser(data.user);
      setUserStats(data.stats);
    } catch (err) {
      console.warn('Session expired or invalid:', err);
      authStorage.clearToken();
      setCurrentUser(null);
      setUserStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (loginInput: string, password: string) => {
    const res = await api.login({ login: loginInput, password });
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      setCurrentUser(null);
    }
    await refreshUser();
    setShowAuthModal(false);
  };

  const signup = async (
    name: string,
    username: string,
    email: string,
    password: string
  ): Promise<{ requireEmailVerification: boolean }> => {
    const res = await api.signup({ name, username, email, password });
    if (res.requireEmailVerification || !res.token) {
      // Email verification required: do not log in immediately, keep modal open to show verification notice
      setCurrentUser(null);
      setUserStats(null);
      return { requireEmailVerification: true };
    }
    setCurrentUser(res.user);
    await refreshUser();
    setShowAuthModal(false);
    return { requireEmailVerification: false };
  };

  const logout = async () => {
    await api.logout();
    setCurrentUser(null);
    setUserStats(null);
  };

  const openAuthModal = (tab: 'login' | 'signup' | 'forgot-password' = 'login') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userStats,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        showAuthModal,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
