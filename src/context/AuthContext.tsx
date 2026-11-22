import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';
import { clearEncryptedImageCache } from '../components/EncryptedImage';
import { signOutFirebase } from '../services/firebaseAuth';

export interface User {
  id: string;
  name: string;
  maskedEmail?: string;
  maskedCpf?: string | null;
  maskedPhone?: string | null;
  hasCpf?: boolean;
  avatarUrl?: string | null;
}

interface AuthContextData {
  user: User | null;
  signed: boolean;
  login(token: string, user: User): void;
  logout(): void;
  updateUser(updatedUser: User): void;
}

/**
 * Garante minimização de dados no armazenamento local do navegador (LGPD):
 * nunca persiste CPF, telefone ou e-mail completos em localStorage/sessionStorage.
 */
function sanitizeSessionUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : '';
  const name = typeof record.name === 'string' ? record.name : '';
  if (!id || !name) return null;

  return {
    id,
    name,
    ...(typeof record.maskedEmail === 'string'
      ? { maskedEmail: record.maskedEmail }
      : {}),
    ...(record.maskedCpf !== undefined
      ? { maskedCpf: record.maskedCpf ? String(record.maskedCpf) : null }
      : {}),
    ...(record.maskedPhone !== undefined
      ? { maskedPhone: record.maskedPhone ? String(record.maskedPhone) : null }
      : {}),
    hasCpf:
      typeof record.hasCpf === 'boolean'
        ? record.hasCpf
        : Boolean(record.maskedCpf || record.cpf),
    ...(record.avatarUrl !== undefined
      ? {
          avatarUrl:
            typeof record.avatarUrl === 'string' && record.avatarUrl.trim()
              ? record.avatarUrl
              : null,
        }
      : {}),
  };
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storagedUser = localStorage.getItem('user');
    const storagedToken = localStorage.getItem('token');

    if (storagedUser && storagedToken) {
      try {
        const sanitized = sanitizeSessionUser(JSON.parse(storagedUser));
        if (!sanitized) {
          throw new Error('Sessão inválida');
        }
        setUser(sanitized);
        localStorage.setItem('user', JSON.stringify(sanitized));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, []);

  const login = (token: string, nextUser: User) => {
    const sanitized = sanitizeSessionUser(nextUser);
    if (!sanitized) return;
    setUser(sanitized);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(sanitized));
  };

  const logout = () => {
    const activeToken = localStorage.getItem('token');
    if (activeToken) {
      api
        .post(
          '/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${activeToken}` } },
        )
        .catch(() => undefined);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearEncryptedImageCache();
    setUser(null);
    Promise.resolve(signOutFirebase()).catch(() => undefined);
  };

  const updateUser = (updatedUser: User) => {
    const sanitized = sanitizeSessionUser(updatedUser);
    if (!sanitized) return;
    setUser(sanitized);
    localStorage.setItem('user', JSON.stringify(sanitized));
  };

  return (
    <AuthContext.Provider value={{ signed: !!user, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
