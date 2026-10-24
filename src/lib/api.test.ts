import { describe, expect, it } from 'vitest';
import { ApiError } from './api';

describe('ApiError', () => {
  it('prefers the backend error string', () => {
    expect(new ApiError(400, 'Bad Request', { error: 'invalid email or password' }).message).toBe('invalid email or password');
  });
});
