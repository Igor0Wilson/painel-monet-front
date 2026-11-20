import {
  extractApiErrorMessage,
  getApiErrorCode,
  getApiErrorStatus,
} from '../../src/utils/errorHandler';

describe('errorHandler', () => {
  it('extracts first string from array API error message', () => {
    const err = {
      response: { status: 400, data: { message: ['CPF inválido', 'Outro'] } },
    };
    expect(extractApiErrorMessage(err, 'Fallback')).toBe('CPF inválido');
    expect(getApiErrorStatus(err)).toBe(400);
  });

  it('extracts plain string API error message and code', () => {
    const err = {
      response: {
        status: 409,
        data: {
          message: 'Este CPF já está cadastrado em outra conta.',
          code: 'CPF_ALREADY_EXISTS',
        },
      },
    };
    expect(extractApiErrorMessage(err, 'Fallback')).toBe(
      'Este CPF já está cadastrado em outra conta.',
    );
    expect(getApiErrorStatus(err)).toBe(409);
    expect(getApiErrorCode(err)).toBe('CPF_ALREADY_EXISTS');
  });

  it('falls back to Error.message or fallback text for unknown errors', () => {
    expect(extractApiErrorMessage(new Error('Falha de rede'), 'Fallback')).toBe(
      'Falha de rede',
    );
    expect(extractApiErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(getApiErrorStatus(null)).toBeUndefined();
    expect(getApiErrorCode(null)).toBeUndefined();
  });
});
