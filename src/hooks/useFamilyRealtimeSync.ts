import { useEffect, useRef } from 'react';
import api, { resolveApiBaseUrl } from '../api';
import { getApiErrorStatus } from '../utils/errorHandler';

interface UseFamilyRealtimeSyncOptions {
  onDataChange: () => void;
  onFamilyChange: () => void;
  onUnauthorized?: () => void;
}

export function useFamilyRealtimeSync({
  onDataChange,
  onFamilyChange,
  onUnauthorized,
}: UseFamilyRealtimeSyncOptions): void {
  const lastSyncVersionRef = useRef<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const controller = new AbortController();
    const baseURL = resolveApiBaseUrl();

    const checkSyncVersion = async () => {
      try {
        const res = await api.get('/family/sync');
        const nextVersion = res.data?.version || '';
        if (
          lastSyncVersionRef.current &&
          nextVersion &&
          nextVersion !== lastSyncVersionRef.current
        ) {
          onFamilyChange();
          onDataChange();
        }
        lastSyncVersionRef.current = nextVersion;
      } catch (error: unknown) {
        if (getApiErrorStatus(error) === 401) {
          onUnauthorized?.();
        }
      }
    };

    const connectSse = async () => {
      try {
        const response = await fetch(`${baseURL}/family/stream`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (response.status === 401) {
          onUnauthorized?.();
          return;
        }
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes('data:')) {
            if (chunk.includes('invite_received') || chunk.includes('family_changed')) {
              onFamilyChange();
              onDataChange();
            } else if (chunk.includes('data_updated')) {
              onDataChange();
            }
          }
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        lastSyncVersionRef.current = '';
      }
    };

    connectSse();

    const interval = setInterval(checkSyncVersion, 8000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSyncVersion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onDataChange, onFamilyChange, onUnauthorized]);
}
