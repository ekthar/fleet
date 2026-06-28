import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

interface User {
  id: string;
  name: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await api.clearToken();
    await SecureStore.deleteItemAsync('auth_user');
    setUser(null);
  }, []);

  useEffect(() => {
    // Set up unauthorized callback
    api.setOnUnauthorized(() => {
      logout();
    });

    // Check for existing session
    (async () => {
      try {
        const token = await api.getToken();
        const storedUser = await SecureStore.getItemAsync('auth_user');
        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // No valid session
      } finally {
        setIsLoading(false);
      }
    })();
  }, [logout]);

  const login = async (phone: string, password: string) => {
    const result = await api.login(phone, password);
    setUser(result.user);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(result.user));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
