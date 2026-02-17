'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserInfo, ConnectionStatusResponse } from './types';
import { authApi, connectionApi, getTokens, clearTokens } from './api';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectionReady: boolean;
  connectionStatus: ConnectionStatusResponse | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  recheckConnection: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionReady, setConnectionReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatusResponse | null>(null);

  const recheckConnection = useCallback(async () => {
    try {
      const result = await connectionApi.getStatus();
      if (result.success && result.data) {
        setConnectionStatus(result.data);
        setConnectionReady(result.data.isConfigured && result.data.isConnected);
      } else {
        setConnectionReady(false);
        setConnectionStatus(null);
      }
    } catch {
      setConnectionReady(false);
      setConnectionStatus(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const tokens = getTokens();
    if (!tokens.accessToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        clearTokens();
        setUser(null);
      }
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await recheckConnection();
      await refreshUser();
    };
    init();
  }, [recheckConnection, refreshUser]);

  const login = async (username: string, password: string) => {
    try {
      const response = await authApi.login({ username, password });
      if (response.success && response.data) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        connectionReady,
        connectionStatus,
        login,
        logout,
        refreshUser,
        recheckConnection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
