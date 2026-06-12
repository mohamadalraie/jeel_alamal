/**
 * Domain-level errors are framework-free. The presentation layer maps them to
 * HTTP responses, keeping the domain ignorant of transport concerns.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Thrown when an invariant or business rule is violated. */
export class BusinessRuleError extends DomainError {}

/** Thrown when a requested aggregate does not exist. */
export class NotFoundError extends DomainError {}

/** Thrown when uniqueness or a conflict constraint is breached. */
export class ConflictError extends DomainError {}

/** Thrown when the actor lacks permission for the attempted action. */
export class ForbiddenError extends DomainError {}

/** Thrown when credentials are invalid or a token is unusable. */
export class UnauthorizedError extends DomainError {}
