/**
 * Классы исключений Rosemа. Критические ситуации не роняют приложение:
 * точка входа ловит их и возвращает код ошибки.
 */

export class RosemaError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'RosemaError';
    this.code = code;
  }
}

export class ValidationError extends RosemaError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, code);
    this.name = 'ValidationError';
  }
}

export class AuthError extends RosemaError {
  constructor(message, code = 'NOT_AUTHORIZED') {
    super(message, code);
    this.name = 'AuthError';
  }
}

export class StorageError extends RosemaError {
  constructor(message) {
    super(message, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}

export class NetworkError extends RosemaError {
  constructor(message) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/** Fail fast: пустой ввод сразу становится ValidationError. */
export function assertNonEmpty(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`Поле «${field}» обязательно`);
  }
}
