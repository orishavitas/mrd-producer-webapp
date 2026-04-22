/**
 * Error class hierarchy for the application.
 *
 * Provides typed, standardized error handling across the API layer.
 * Each error carries a code, message, and HTTP status code.
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400);
    this.name = 'ValidationError';
  }
}

export class AuthError extends AppError {
  constructor() {
    super('UNAUTHORIZED', 'Unauthorized', 401);
    this.name = 'AuthError';
  }
}

export class ProviderError extends AppError {
  constructor(message: string) {
    super('PROVIDER_ERROR', message, 502);
    this.name = 'ProviderError';
  }
}
