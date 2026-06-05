/**
 * Typed application errors shared across the API and worker. Each carries a
 * stable `code` (mapped to HTTP/tRPC codes at the boundary) so callers and the
 * UI can branch on failures without string-matching messages.
 */

export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  UNPROCESSABLE: 'UNPROCESSABLE',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  readonly code: ErrorCode;
  override readonly cause?: unknown;
  /** Optional structured detail safe to expose to clients. */
  readonly detail?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    options?: { cause?: unknown; detail?: Record<string, unknown> },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = options?.cause;
    this.detail = options?.detail;
  }
}

export const notFound = (message = 'Not found', detail?: Record<string, unknown>) =>
  new AppError(ErrorCode.NOT_FOUND, message, { detail });

export const forbidden = (message = 'Forbidden', detail?: Record<string, unknown>) =>
  new AppError(ErrorCode.FORBIDDEN, message, { detail });

export const unauthorized = (message = 'Authentication required') =>
  new AppError(ErrorCode.UNAUTHORIZED, message);

export const badRequest = (message: string, detail?: Record<string, unknown>) =>
  new AppError(ErrorCode.BAD_REQUEST, message, { detail });

export const conflict = (message: string, detail?: Record<string, unknown>) =>
  new AppError(ErrorCode.CONFLICT, message, { detail });

export const planLimitExceeded = (message: string, detail?: Record<string, unknown>) =>
  new AppError(ErrorCode.PLAN_LIMIT_EXCEEDED, message, { detail });

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
