import React, { createContext, useContext, useState, useEffect } from 'react';
import { signOutFirebase } from '../services/firebaseAuth';

interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
}

interface AuthContextData {
  user: User | null;
  signed: boolean;
  login(token: string, user: User): void;
  logout(): void;
  updateUser(updatedUser: User): void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storagedUser = localStorage.getItem('user');
    const storagedToken = localStorage.getItem('token');

    if (storagedUser && storagedToken) {
      try {
        setUser(JSON.parse(storagedUser));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, []);

  const login = (token: string, nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    signOutFirebase().catch(() => undefined);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ signed: !!user, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
