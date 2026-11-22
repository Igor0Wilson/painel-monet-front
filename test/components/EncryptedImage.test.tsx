import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import api from '../../src/api';
import EncryptedImage, {
  clearEncryptedImageCache,
} from '../../src/components/EncryptedImage';

jest.mock('../../src/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: jest.Mock;
};

describe('EncryptedImage', () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    clearEncryptedImageCache();
    mockedApi.get.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(() => 'blob:decrypted-avatar-url'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  afterAll(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevokeObjectURL,
    });
  });

  it('fetches protected /users/avatar/:id endpoints with responseType blob and renders object URL', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: new Blob(['avatar-bytes'], { type: 'image/png' }),
    });

    render(
      <EncryptedImage
        src="/users/avatar/user-enc-1?v=abc"
        alt="Avatar Criptografado"
        className="w-8 h-8 rounded-full"
      />,
    );

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith(
        '/users/avatar/user-enc-1?v=abc',
        { responseType: 'blob' },
      );
    });

    await waitFor(() => {
      expect(screen.getByAltText('Avatar Criptografado')).toHaveAttribute(
        'src',
        'blob:decrypted-avatar-url',
      );
    });
  });
});
