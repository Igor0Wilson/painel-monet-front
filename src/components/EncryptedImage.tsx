import React, { useEffect, useState } from 'react';
import api from '../api';

const MAX_CACHE_SIZE = 100;
const decryptedBlobCache = new Map<string, string>();

export function clearEncryptedImageCache(): void {
  decryptedBlobCache.forEach((objectUrl) => {
    try {
      URL.revokeObjectURL(objectUrl);
    } catch {
      // ignore revoke errors in test/non-DOM environments
    }
  });
  decryptedBlobCache.clear();
}

function isDirectRenderableSrc(src: string): boolean {
  return (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('http://') ||
    src.startsWith('https://')
  );
}

interface EncryptedImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  'data-testid'?: string;
  fallback?: React.ReactNode;
}

const EncryptedImage: React.FC<EncryptedImageProps> = ({
  src,
  alt,
  className,
  'data-testid': dataTestId,
  fallback = null,
}) => {
  const cleanSrc = typeof src === 'string' ? src.trim() : '';
  const isDirect = cleanSrc ? isDirectRenderableSrc(cleanSrc) : false;
  const cachedUrl = cleanSrc && !isDirect ? decryptedBlobCache.get(cleanSrc) || '' : '';

  const [resolvedSrc, setResolvedSrc] = useState<string>(
    isDirect ? cleanSrc : cachedUrl,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!cleanSrc) {
      setResolvedSrc('');
      return;
    }

    if (isDirect) {
      setResolvedSrc(cleanSrc);
      return;
    }

    const cached = decryptedBlobCache.get(cleanSrc);
    if (cached) {
      setResolvedSrc(cached);
      return;
    }

    let cancelled = false;
    setResolvedSrc('');

    api
      .get<Blob>(cleanSrc, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const blob = res.data;
        if (!(blob instanceof Blob) || blob.size === 0) {
          setFailed(true);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        if (decryptedBlobCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = decryptedBlobCache.keys().next().value;
          if (oldestKey) {
            const oldestVal = decryptedBlobCache.get(oldestKey);
            if (oldestVal) {
              try {
                URL.revokeObjectURL(oldestVal);
              } catch {
                // ignore
              }
            }
            decryptedBlobCache.delete(oldestKey);
          }
        }
        decryptedBlobCache.set(cleanSrc, objectUrl);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cleanSrc, isDirect]);

  if (!cleanSrc || failed || !resolvedSrc) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      data-testid={dataTestId}
    />
  );
};

export default EncryptedImage;
