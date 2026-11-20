import { extractApiErrorMessage, getApiErrorStatus } from './errorHandler';

describe('errorHandler', () => {
  it('extracts first string from array API error message', () => {
    const err = { response: { status: 400, data: { message: ['CPF inválido', 'Outro'] } } };
    expect(extractApiErrorMessage(err, 'Fallback')).toBe('CPF inválido');
    expect(getApiErrorStatus(err)).toBe(400);
  });

  it('extracts plain string API error message', () => {
    const err = { response: { status: 403, data: { message: 'Acesso negado' } } };
    expect(extractApiErrorMessage(err, 'Fallback')).toBe('Acesso negado');
    expect(getApiErrorStatus(err)).toBe(403);
  });

  it('falls back to Error.message or fallback text for unknown errors', () => {
    expect(extractApiErrorMessage(new Error('Falha de rede'), 'Fallback')).toBe('Falha de rede');
    expect(extractApiErrorMessage(null, 'Fallback')).toBe('Fallback');
    expect(getApiErrorStatus(null)).toBeUndefined();
  });
});
