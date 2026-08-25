import { ApiError } from '../api/http.js';

export function describeError(error) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return 'Непредвиденная ошибка. Попробуйте ещё раз.';
}
