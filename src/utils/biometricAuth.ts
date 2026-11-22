import api from '../api';
import { isRunningInInstalledApp } from './appEnvironment';

export type BiometricKind = 'facial' | 'fingerprint' | 'biometric';
export type BiometricPlatform = 'web' | 'pwa' | 'mobile_ios' | 'mobile_android';
export type BiometricProtocol = 'webauthn' | 'native_hmac';

export interface BiometricCredentialView {
  id: string;
  credentialId: string;
  protocol: BiometricProtocol;
  kind: BiometricKind;
  platform: BiometricPlatform;
  deviceLabel: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
}

export interface LocalBiometricDevicePointer {
  id: string;
  credentialId: string;
  protocol: BiometricProtocol;
  kind: BiometricKind;
  platform: BiometricPlatform;
  deviceLabel: string;
  userId?: string;
}

export interface BiometricCapabilityInfo {
  available: boolean;
  isNativeApp: boolean;
  isInstalledApp: boolean;
  protocol: BiometricProtocol;
  platform: BiometricPlatform;
  hasFacial: boolean;
  hasFingerprint: boolean;
}

const LOCAL_DEVICE_CRED_KEY = 'pm_bio_device_cred';

function getReactNativeBridge():
  | { postMessage: (msg: string) => void }
  | null {
  if (typeof window === 'undefined') return null;
  const rn = (
    window as unknown as {
      ReactNativeWebView?: { postMessage?: (msg: string) => void };
    }
  ).ReactNativeWebView;
  if (rn && typeof rn.postMessage === 'function') {
    return rn as { postMessage: (msg: string) => void };
  }
  return null;
}

function sendNativeBridgeRequest<T>(payload: Record<string, unknown>, timeoutMs = 45000): Promise<T> {
  const bridge = getReactNativeBridge();
  if (!bridge) {
    return Promise.reject(new Error('NATIVE_BRIDGE_UNAVAILABLE'));
  }

  const requestId = `bio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener('PM_NATIVE_BIOMETRIC_RESPONSE', onResponse as EventListener);
      reject(new Error('BIOMETRIC_TIMEOUT'));
    }, timeoutMs);

    const onResponse = (event: CustomEvent<Record<string, unknown>>) => {
      const detail = event?.detail;
      if (!detail || detail.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener('PM_NATIVE_BIOMETRIC_RESPONSE', onResponse as EventListener);
      if (detail.success) {
        resolve(detail as unknown as T);
      } else {
        reject(new Error(String(detail.error || 'BIOMETRIC_FAILED')));
      }
    };

    window.addEventListener('PM_NATIVE_BIOMETRIC_RESPONSE', onResponse as EventListener);
    bridge.postMessage(JSON.stringify({ ...payload, requestId }));
  });
}

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function getLocalBiometricPointer(): LocalBiometricDevicePointer | null {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICE_CRED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalBiometricDevicePointer;
    if (!parsed?.credentialId || !parsed?.protocol) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalBiometricPointer(
  pointer: LocalBiometricDevicePointer,
): void {
  try {
    localStorage.setItem(LOCAL_DEVICE_CRED_KEY, JSON.stringify(pointer));
  } catch {
    // ignore storage errors
  }
}

export function clearLocalBiometricPointer(): void {
  try {
    localStorage.removeItem(LOCAL_DEVICE_CRED_KEY);
  } catch {
    // ignore storage errors
  }
}

export async function detectBiometricCapabilities(): Promise<BiometricCapabilityInfo> {
  const installed = isRunningInInstalledApp();
  const bridge = getReactNativeBridge();

  if (bridge) {
    try {
      const nativeInfo = await sendNativeBridgeRequest<{
        available: boolean;
        hasFacial: boolean;
        hasFingerprint: boolean;
        platform?: BiometricPlatform;
      }>({ type: 'BIOMETRIC_CHECK_CAPABILITY' }, 6000);

      return {
        available: Boolean(nativeInfo.available),
        isNativeApp: true,
        isInstalledApp: true,
        protocol: 'native_hmac',
        platform: nativeInfo.platform || 'mobile_android',
        hasFacial: Boolean(nativeInfo.hasFacial),
        hasFingerprint: Boolean(nativeInfo.hasFingerprint),
      };
    } catch {
      return {
        available: false,
        isNativeApp: true,
        isInstalledApp: true,
        protocol: 'native_hmac',
        platform: 'mobile_android',
        hasFacial: false,
        hasFingerprint: false,
      };
    }
  }

  let webAuthnAvailable = false;
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.credentials)
    ) {
      if (
        typeof window.PublicKeyCredential
          .isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        webAuthnAvailable =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } else {
        webAuthnAvailable = true;
      }
    }
  } catch {
    webAuthnAvailable = false;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return {
    available: webAuthnAvailable,
    isNativeApp: false,
    isInstalledApp: installed,
    protocol: 'webauthn',
    platform: installed ? (isIOS ? 'mobile_ios' : 'pwa') : 'web',
    hasFacial: webAuthnAvailable,
    hasFingerprint: installed && webAuthnAvailable,
  };
}

export async function registerBiometricCredential(params: {
  kind: BiometricKind;
  deviceLabel?: string;
  promptTitle?: string;
}): Promise<BiometricCredentialView> {
  const caps = await detectBiometricCapabilities();
  if (!caps.available) {
    throw new Error('BIOMETRIC_UNSUPPORTED_DEVICE');
  }

  if (caps.protocol === 'native_hmac') {
    const optRes = await api.post<{
      challengeId: string;
      challenge: string;
      credentialIdSuggestion: string;
      enrollmentSecretHex: string;
    }>('/auth/biometric/register/options', {
      protocol: 'native_hmac',
      kind: params.kind,
      platform: caps.platform,
      deviceLabel: params.deviceLabel,
    });

    const { challengeId, challenge, credentialIdSuggestion, enrollmentSecretHex } =
      optRes.data;

    const signRes = await sendNativeBridgeRequest<{ signature: string }>({
      type: 'BIOMETRIC_ENROLL_AND_SIGN',
      credentialId: credentialIdSuggestion,
      challenge,
      enrollmentSecretHex,
      promptTitle: params.promptTitle,
    });

    const verifyRes = await api.post<BiometricCredentialView>(
      '/auth/biometric/register/verify',
      {
        challengeId,
        protocol: 'native_hmac',
        kind: params.kind,
        platform: caps.platform,
        deviceLabel: params.deviceLabel,
        credentialId: credentialIdSuggestion,
        signature: signRes.signature,
      },
    );

    const saved = verifyRes.data;
    saveLocalBiometricPointer({
      id: saved.id,
      credentialId: saved.credentialId,
      protocol: saved.protocol,
      kind: saved.kind,
      platform: saved.platform,
      deviceLabel: saved.deviceLabel,
    });
    return saved;
  }

  const optRes = await api.post<{
    challengeId: string;
    challenge: string;
    userId: string;
    userName: string;
    excludeCredentialIds?: string[];
  }>('/auth/biometric/register/options', {
    protocol: 'webauthn',
    kind: params.kind,
    platform: caps.platform === 'pwa' || caps.platform === 'mobile_ios' ? 'pwa' : 'web',
    deviceLabel: params.deviceLabel,
  });

  const { challengeId, challenge, userId, userName, excludeCredentialIds = [] } =
    optRes.data;

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: base64UrlToUint8Array(challenge) as unknown as BufferSource,
      rp: {
        name: 'Painel Monet',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId) as unknown as BufferSource,
        name: userName || 'Painel Monet User',
        displayName: userName || 'Painel Monet User',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      timeout: 60000,
      excludeCredentials: excludeCredentialIds.map((id) => ({
        id: base64UrlToUint8Array(id) as unknown as BufferSource,
        type: 'public-key',
      })),
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('BIOMETRIC_CANCELLED');
  }

  const attResp = credential.response as AuthenticatorAttestationResponse;
  const verifyRes = await api.post<BiometricCredentialView>(
    '/auth/biometric/register/verify',
    {
      challengeId,
      protocol: 'webauthn',
      kind: params.kind,
      platform: caps.isInstalledApp ? 'pwa' : 'web',
      deviceLabel: params.deviceLabel,
      credentialId: credential.id,
      clientDataJSON: bufferToBase64Url(attResp.clientDataJSON),
      attestationObject: bufferToBase64Url(attResp.attestationObject),
    },
  );

  const saved = verifyRes.data;
  saveLocalBiometricPointer({
    id: saved.id,
    credentialId: saved.credentialId,
    protocol: saved.protocol,
    kind: saved.kind,
    platform: saved.platform,
    deviceLabel: saved.deviceLabel,
  });
  return saved;
}

export async function loginWithBiometricCredential(promptTitle?: string): Promise<{
  access_token: string;
  user: Record<string, unknown>;
}> {
  const pointer = getLocalBiometricPointer();
  if (!pointer) {
    throw new Error('BIOMETRIC_NOT_CONFIGURED');
  }

  const optRes = await api.post<{
    challengeId: string;
    challenge: string;
    credentialId: string;
    protocol: BiometricProtocol;
    kind: BiometricKind;
  }>('/auth/biometric/login/options', {
    credentialId: pointer.credentialId,
  });

  const { challengeId, challenge, credentialId, protocol } = optRes.data;

  if (protocol === 'native_hmac') {
    const signRes = await sendNativeBridgeRequest<{ signature: string }>({
      type: 'BIOMETRIC_AUTHENTICATE',
      credentialId,
      challenge,
      promptTitle,
    });

    const verifyRes = await api.post<{
      access_token: string;
      user: Record<string, unknown>;
    }>('/auth/biometric/login/verify', {
      challengeId,
      credentialId,
      signature: signRes.signature,
    });
    return verifyRes.data;
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: base64UrlToUint8Array(challenge) as unknown as BufferSource,
      rpId: window.location.hostname,
      allowCredentials: [
        {
          id: base64UrlToUint8Array(credentialId) as unknown as BufferSource,
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error('BIOMETRIC_CANCELLED');
  }

  const assertionResp = assertion.response as AuthenticatorAssertionResponse;
  const verifyRes = await api.post<{
    access_token: string;
    user: Record<string, unknown>;
  }>('/auth/biometric/login/verify', {
    challengeId,
    credentialId,
    clientDataJSON: bufferToBase64Url(assertionResp.clientDataJSON),
    authenticatorData: bufferToBase64Url(assertionResp.authenticatorData),
    signature: bufferToBase64Url(assertionResp.signature),
  });
  return verifyRes.data;
}

export async function removeNativeBiometricSecretIfPresent(
  credentialId: string,
): Promise<void> {
  const bridge = getReactNativeBridge();
  if (!bridge) return;
  try {
    await sendNativeBridgeRequest(
      { type: 'BIOMETRIC_REMOVE_SECRET', credentialId },
      5000,
    );
  } catch {
    // ignore cleanup failures
  }
}
