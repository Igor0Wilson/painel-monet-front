import api from '../api';
import type { User } from '../context/AuthContext';

export const LOCAL_PIN_TOKEN_KEY = 'pm_pin_device_cred';
export const LOCAL_PROVIDER_HINT_KEY = 'pm_auth_provider_hint';

export interface SecurityPinStatus {
  hasPin: boolean;
  updatedAt: string | null;
  lockedUntilMs: number | null;
  authProvider: 'password' | 'google';
}

export interface LocalPinTokenRecord {
  pinDeviceToken: string;
  authProvider: 'password' | 'google';
  userName?: string;
}

export interface SecurityAuthResponse {
  access_token: string;
  user: User;
}

export function saveLocalPinToken(record: LocalPinTokenRecord): void {
  try {
    localStorage.setItem(
      LOCAL_PIN_TOKEN_KEY,
      JSON.stringify({
        pinDeviceToken: record.pinDeviceToken,
        authProvider: record.authProvider,
        userName: record.userName || undefined,
      }),
    );
    localStorage.setItem(LOCAL_PROVIDER_HINT_KEY, record.authProvider);
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function getLocalPinToken(): LocalPinTokenRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_PIN_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalPinTokenRecord>;
    if (!parsed.pinDeviceToken) return null;
    return {
      pinDeviceToken: parsed.pinDeviceToken,
      authProvider: parsed.authProvider === 'google' ? 'google' : 'password',
      userName: parsed.userName,
    };
  } catch {
    return null;
  }
}

export function clearLocalPinToken(): void {
  try {
    localStorage.removeItem(LOCAL_PIN_TOKEN_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function saveAuthProviderHint(provider: 'password' | 'google'): void {
  try {
    localStorage.setItem(LOCAL_PROVIDER_HINT_KEY, provider);
  } catch {
    // Ignore storage errors
  }
}

export function getAuthProviderHint(): 'password' | 'google' | null {
  try {
    const value = localStorage.getItem(LOCAL_PROVIDER_HINT_KEY);
    if (value === 'google' || value === 'password') return value;
    return null;
  } catch {
    return null;
  }
}

export async function fetchSecurityPinStatus(): Promise<SecurityPinStatus> {
  const res = await api.get<SecurityPinStatus>('/auth/security-pin/status');
  const data = res.data || {
    hasPin: false,
    updatedAt: null,
    lockedUntilMs: null,
    authProvider: 'password',
  };
  if (data.authProvider === 'google' || data.authProvider === 'password') {
    saveAuthProviderHint(data.authProvider);
  }
  return data;
}

export async function syncSecurityPinDeviceToken(
  userName?: string,
): Promise<{
  hasPin: boolean;
  authProvider: 'password' | 'google';
}> {
  const res = await api.post<{
    hasPin: boolean;
    updatedAt: string | null;
    pinDeviceToken: string | null;
    authProvider: 'password' | 'google';
  }>('/auth/security-pin/device-token', {});
  const data = res.data;
  if (data?.authProvider === 'google' || data?.authProvider === 'password') {
    saveAuthProviderHint(data.authProvider);
  }
  if (data?.hasPin && data?.pinDeviceToken) {
    saveLocalPinToken({
      pinDeviceToken: data.pinDeviceToken,
      authProvider: data.authProvider === 'google' ? 'google' : 'password',
      userName,
    });
  } else if (data && data.hasPin === false) {
    clearLocalPinToken();
  }
  return {
    hasPin: Boolean(data?.hasPin),
    authProvider: data?.authProvider === 'google' ? 'google' : 'password',
  };
}

export async function setSecurityPin(
  pin: string,
  userName?: string,
): Promise<{
  hasPin: boolean;
  updatedAt: string;
  authProvider: 'password' | 'google';
}> {
  const res = await api.post<{
    hasPin: boolean;
    updatedAt: string;
    pinDeviceToken: string;
    authProvider: 'password' | 'google';
  }>('/auth/security-pin', { pin });
  const data = res.data;
  if (data?.pinDeviceToken) {
    saveLocalPinToken({
      pinDeviceToken: data.pinDeviceToken,
      authProvider: data.authProvider === 'google' ? 'google' : 'password',
      userName,
    });
  }
  return {
    hasPin: Boolean(data?.hasPin),
    updatedAt: data?.updatedAt || new Date().toISOString(),
    authProvider: data?.authProvider === 'google' ? 'google' : 'password',
  };
}

export async function removeSecurityPin(): Promise<void> {
  await api.delete('/auth/security-pin');
  clearLocalPinToken();
}

export async function verifySecurityPinLogin(
  pin: string,
): Promise<SecurityAuthResponse> {
  const stored = getLocalPinToken();
  if (!stored?.pinDeviceToken) {
    throw new Error('Código de acesso não configurado neste dispositivo.');
  }
  const res = await api.post<SecurityAuthResponse>('/auth/security-pin/verify', {
    pinDeviceToken: stored.pinDeviceToken,
    pin,
  });
  return res.data;
}
