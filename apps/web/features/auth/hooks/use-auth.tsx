'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../../lib/api/api-error';
import { authService } from '../services/auth.service';
import type { AuthState, LoginCredentials } from '../types/auth.types';

type AuthContextValue = AuthState & {
  login(credentials: LoginCredentials): Promise<void>;
  logout(): Promise<void>;
  refreshSession(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionError: null,
};

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(initialState);

  const refreshSession = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true, sessionError: null }));
    try {
      await authService.refreshSession();
      const user = await authService.getCurrentUser();
      setState({ user, isAuthenticated: true, isLoading: false, sessionError: null });
    } catch (error) {
      authService.clearSession();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionError: error instanceof ApiError ? error.message : 'Sessão indisponível.',
      });
    }
  }, []);

  useEffect(() => {
    const sessionInitialization = window.setTimeout(() => {
      void refreshSession();
    }, 0);
    return () => window.clearTimeout(sessionInitialization);
  }, [refreshSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((current) => ({ ...current, isLoading: true, sessionError: null }));
    try {
      await authService.login(credentials);
      const user = await authService.getCurrentUser();
      setState({ user, isAuthenticated: true, isLoading: false, sessionError: null });
    } catch (error) {
      authService.clearSession();
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionError: error instanceof ApiError ? error.message : 'Não foi possível autenticar.',
      });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((current) => ({ ...current, isLoading: true }));
    try {
      await authService.logout();
    } finally {
      authService.clearSession();
      queryClient.clear();
      setState({ user: null, isAuthenticated: false, isLoading: false, sessionError: null });
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({ ...state, login, logout, refreshSession }),
    [login, logout, refreshSession, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return context;
}
