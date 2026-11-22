const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB

export type ImageValidationError = 'invalid_type' | 'too_large' | null;

export function validateImageFile(file: File): ImageValidationError {
  if (!file) return 'invalid_type';
  const normalizedType = (file.type || '').toLowerCase();
  const hasAllowedExtension = /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');

  if (!ALLOWED_IMAGE_MIME_TYPES.has(normalizedType) && !(normalizedType === '' && hasAllowedExtension)) {
    return 'invalid_type';
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return 'too_large';
  }

  return null;
}

/**
 * Redimensiona/comprime fotos grandes tiradas em celular caso passem de ~2.4 MB
 * (mantendo GIF sem recodificar), garantindo upload fluido dentro do limite serverless.
 */
export async function prepareImageForUpload(
  file: File,
): Promise<{ file: File; error: ImageValidationError }> {
  const initialTypeError = (() => {
    const normalizedType = (file.type || '').toLowerCase();
    const hasAllowedExtension = /\.(jpe?g|png|webp|gif)$/i.test(file.name || '');
    return !ALLOWED_IMAGE_MIME_TYPES.has(normalizedType) &&
      !(normalizedType === '' && hasAllowedExtension)
      ? ('invalid_type' as const)
      : null;
  })();

  if (initialTypeError) {
    return { file, error: initialTypeError };
  }

  if (file.size <= MAX_IMAGE_BYTES) {
    return { file, error: null };
  }

  if ((file.type || '').toLowerCase() === 'image/gif') {
    return { file, error: 'too_large' };
  }

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return { file, error: 'too_large' };
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode_failed'));
      el.src = dataUrl;
    });

    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { file, error: 'too_large' };
    }
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.84),
    );
    if (!blob || blob.size > MAX_IMAGE_BYTES) {
      return { file, error: 'too_large' };
    }

    const baseName = (file.name || 'photo').replace(/\.[^/.]+$/, '');
    const compressedFile = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
    });
    return { file: compressedFile, error: null };
  } catch {
    return { file, error: 'too_large' };
  }
}

export function createPreviewDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('preview_failed'));
    reader.readAsDataURL(file);
  });
}
