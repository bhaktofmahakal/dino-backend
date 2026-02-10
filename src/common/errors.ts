export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(currentBalance: string, requestedAmount: string) {
    super(
      'INSUFFICIENT_BALANCE',
      `User balance (${currentBalance}) is less than requested amount (${requestedAmount})`,
      400
    );
  }
}

export class AccountNotFoundError extends AppError {
  constructor(details: string) {
    super('ACCOUNT_NOT_FOUND', `Account not found: ${details}`, 404);
  }
}

export class AssetTypeNotFoundError extends AppError {
  constructor(code: string) {
    super('ASSET_TYPE_NOT_FOUND', `Asset type not found: ${code}`, 404);
  }
}

export class DuplicateRequestError extends AppError {
  constructor(idempotencyKey: string) {
    super('DUPLICATE_REQUEST', `Request with idempotency key ${idempotencyKey} is already in progress`, 409);
  }
}

export class InvalidTransactionError extends AppError {
  constructor(reason: string) {
    super('INVALID_TRANSACTION', reason, 400);
  }
}

export class ConcurrencyError extends AppError {
  constructor() {
    super('CONCURRENCY_ERROR', 'Transaction failed due to concurrent modification. Please retry.', 409);
  }
}

export class IdempotencyKeyRequiredError extends AppError {
  constructor() {
    super('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required for this operation', 400);
  }
}
