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
  platformAuthenticatorAvailable?: boolean;
}

const LOCAL_DEVICE_CRED_KEY = 'pm_bio_device_cred';
const LOCAL_DEVICE_CREDS_MAP_KEY = 'pm_bio_device_creds';

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

function sendNativeBridgeRequest<T>(
  payload: Record<string, unknown>,
  timeoutMs = 45000,
): Promise<T> {
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
      window.removeEventListener(
        'PM_NATIVE_BIOMETRIC_RESPONSE',
        onResponse as EventListener,
      );
      reject(new Error('BIOMETRIC_TIMEOUT'));
    }, timeoutMs);

    const onResponse = (event: CustomEvent<Record<string, unknown>>) => {
      const detail = event?.detail;
      if (!detail || detail.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener(
        'PM_NATIVE_BIOMETRIC_RESPONSE',
        onResponse as EventListener,
      );
      if (detail.success) {
        resolve(detail as unknown as T);
      } else {
        reject(new Error(String(detail.error || 'BIOMETRIC_FAILED')));
      }
    };

    window.addEventListener(
      'PM_NATIVE_BIOMETRIC_RESPONSE',
      onResponse as EventListener,
    );
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

function readLegacyPointer(): LocalBiometricDevicePointer | null {
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

function persistPointerSlots(slots: LocalBiometricDevicePointer[]): void {
  try {
    const cleaned = slots.filter(
      (item) => Boolean(item?.credentialId) && Boolean(item?.protocol),
    );
    if (cleaned.length === 0) {
      localStorage.removeItem(LOCAL_DEVICE_CREDS_MAP_KEY);
      localStorage.removeItem(LOCAL_DEVICE_CRED_KEY);
      return;
    }
    localStorage.setItem(LOCAL_DEVICE_CREDS_MAP_KEY, JSON.stringify(cleaned));
    const preferredPrimary =
      cleaned.find((s) => s.kind === 'fingerprint') ||
      cleaned.find((s) => s.kind === 'biometric') ||
      cleaned.find((s) => s.kind === 'facial') ||
      cleaned[0];
    localStorage.setItem(LOCAL_DEVICE_CRED_KEY, JSON.stringify(preferredPrimary));
  } catch {
    // ignore storage errors
  }
}

export function getLocalBiometricPointers(): LocalBiometricDevicePointer[] {
  const list: LocalBiometricDevicePointer[] = [];
  const seenKinds = new Set<string>();
  const seenCreds = new Set<string>();

  try {
    const rawMap = localStorage.getItem(LOCAL_DEVICE_CREDS_MAP_KEY);
    if (rawMap) {
      const parsed = JSON.parse(rawMap) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const ptr = item as LocalBiometricDevicePointer;
          if (!ptr?.credentialId || !ptr?.protocol) continue;
          const kindKey = ptr.kind || 'biometric';
          if (seenKinds.has(kindKey) || seenCreds.has(ptr.credentialId)) continue;
          seenKinds.add(kindKey);
          seenCreds.add(ptr.credentialId);
          list.push(ptr);
        }
      }
    }
  } catch {
    // ignore malformed cache
  }

  const legacy = readLegacyPointer();
  if (
    legacy &&
    !seenCreds.has(legacy.credentialId) &&
    !seenKinds.has(legacy.kind || 'biometric')
  ) {
    list.push(legacy);
  }

  return list;
}

export function getLocalBiometricPointer(
  preferredKind?: BiometricKind,
): LocalBiometricDevicePointer | null {
  const all = getLocalBiometricPointers();
  if (all.length === 0) return null;

  if (preferredKind === 'facial') {
    return all.find((p) => p.kind === 'facial') || null;
  }

  if (preferredKind === 'fingerprint') {
    return (
      all.find((p) => p.kind === 'fingerprint') ||
      all.find((p) => p.kind === 'biometric') ||
      null
    );
  }

  if (preferredKind === 'biometric') {
    return (
      all.find((p) => p.kind === 'biometric') ||
      all.find((p) => p.kind === 'fingerprint') ||
      all.find((p) => p.kind === 'facial') ||
      null
    );
  }

  // Priority order when no explicit kind requested: Fingerprint -> Generic Biometric -> Facial
  return (
    all.find((p) => p.kind === 'fingerprint') ||
    all.find((p) => p.kind === 'biometric') ||
    all.find((p) => p.kind === 'facial') ||
    all[0] ||
    null
  );
}

export function saveLocalBiometricPointer(
  pointer: LocalBiometricDevicePointer,
): void {
  const existing = getLocalBiometricPointers().filter(
    (item) =>
      item.kind !== pointer.kind && item.credentialId !== pointer.credentialId,
  );
  persistPointerSlots([pointer, ...existing]);
}

export function clearLocalBiometricPointer(credentialIdOrKind?: string): void {
  if (!credentialIdOrKind) {
    persistPointerSlots([]);
    return;
  }
  const remaining = getLocalBiometricPointers().filter(
    (item) =>
      item.credentialId !== credentialIdOrKind &&
      item.id !== credentialIdOrKind &&
      item.kind !== credentialIdOrKind,
  );
  persistPointerSlots(remaining);
}

/**
 * Reconciles server credentials with local device slots after Google or Password login
 * without discarding local native_hmac secrets for this device or losing WebAuthn facial pointers.
 */
export function syncLocalBiometricPointersWithServer(
  serverCreds: BiometricCredentialView[],
  userId?: string,
): LocalBiometricDevicePointer[] {
  const byCredId = new Map<string, BiometricCredentialView>();
  for (const cred of serverCreds) {
    byCredId.set(cred.credentialId, cred);
  }

  const currentLocal = getLocalBiometricPointers();
  const nextSlots: LocalBiometricDevicePointer[] = [];

  for (const ptr of currentLocal) {
    const match = byCredId.get(ptr.credentialId);
    if (match) {
      if (match.isEnabled) {
        nextSlots.push({
          ...ptr,
          kind: match.kind,
          deviceLabel: match.deviceLabel,
          platform: match.platform,
          userId: userId || ptr.userId,
        });
      }
    } else if (!userId || (ptr.userId && ptr.userId !== userId)) {
      nextSlots.push(ptr);
    }
  }

  // Re-attach enabled WebAuthn credentials from server if their modality is not locally populated yet
  if (typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined') {
    for (const cred of serverCreds) {
      if (!cred.isEnabled || cred.protocol !== 'webauthn') continue;
      const alreadyHasCred = nextSlots.some(
        (s) => s.credentialId === cred.credentialId,
      );
      const alreadyHasKind = nextSlots.some((s) => s.kind === cred.kind);
      if (!alreadyHasCred && !alreadyHasKind) {
        nextSlots.push({
          id: cred.id,
          credentialId: cred.credentialId,
          protocol: cred.protocol,
          kind: cred.kind,
          platform: cred.platform,
          deviceLabel: cred.deviceLabel,
          userId,
        });
      }
    }
  }

  persistPointerSlots(nextSlots);
  return nextSlots;
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
        platformAuthenticatorAvailable: Boolean(nativeInfo.available),
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
        platformAuthenticatorAvailable: false,
      };
    }
  }

  const hasWebAuthnApi =
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.credentials);

  let platformAuthAvailable = false;
  try {
    if (
      hasWebAuthnApi &&
      typeof window.PublicKeyCredential
        .isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      platformAuthAvailable =
        await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } else {
      platformAuthAvailable = hasWebAuthnApi;
    }
  } catch {
    platformAuthAvailable = false;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  return {
    available: hasWebAuthnApi,
    isNativeApp: false,
    isInstalledApp: installed,
    protocol: 'webauthn',
    platform: installed ? (isIOS ? 'mobile_ios' : 'pwa') : 'web',
    hasFacial: hasWebAuthnApi,
    hasFingerprint: platformAuthAvailable,
    platformAuthenticatorAvailable: platformAuthAvailable,
  };
}

export async function registerBiometricCredential(params: {
  kind: BiometricKind;
  deviceLabel?: string;
  promptTitle?: string;
  userId?: string;
}): Promise<BiometricCredentialView> {
  const caps = await detectBiometricCapabilities();
  if (caps.isNativeApp && !caps.available) {
    throw new Error('BIOMETRIC_UNSUPPORTED_DEVICE');
  }
  if (!caps.isNativeApp && !caps.available) {
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
      mode: params.kind,
      disableDeviceFallback: false,
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
      userId: params.userId,
    });
    return saved;
  }

  const webPlatform: BiometricPlatform = caps.isInstalledApp ? 'pwa' : 'web';
  const optRes = await api.post<{
    challengeId: string;
    challenge: string;
    userId: string;
    userName: string;
    excludeCredentialIds?: string[];
  }>('/auth/biometric/register/options', {
    protocol: 'webauthn',
    kind: params.kind,
    platform: webPlatform,
    deviceLabel: params.deviceLabel,
  });

  const { challengeId, challenge, userId, userName } = optRes.data;

  // When a local platform authenticator is reported ready, prefer platform (Face ID / Touch ID / Windows Hello).
  // Otherwise omit authenticatorAttachment so hybrid/phone passkeys also remain usable for Facial setup.
  const authenticatorSelection: AuthenticatorSelectionCriteria =
    caps.platformAuthenticatorAvailable !== false
      ? {
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required',
        }
      : {
          residentKey: 'preferred',
          userVerification: 'required',
        };

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
      authenticatorSelection,
      timeout: 60000,
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
      platform: webPlatform,
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
    userId: params.userId || userId,
  });
  return saved;
}

export async function loginWithBiometricCredential(
  promptOrOptions?:
    | string
    | {
        promptTitle?: string;
        preferredKind?: BiometricKind;
        disableDeviceFallback?: boolean;
      },
): Promise<{
  access_token: string;
  user: Record<string, unknown>;
}> {
  const options =
    typeof promptOrOptions === 'string'
      ? { promptTitle: promptOrOptions }
      : promptOrOptions || {};

  const pointer = getLocalBiometricPointer(options.preferredKind);
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
      mode: pointer.kind,
      disableDeviceFallback: options.disableDeviceFallback ?? true,
      promptTitle: options.promptTitle,
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
