import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../shared/domain/domain.error';

/**
 * Catches every thrown error and returns a consistent JSON envelope.
 * Domain errors are translated to HTTP statuses HERE — in one place — so
 * controllers stay thin and use-cases stay framework-free.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  private static readonly DOMAIN_STATUS: Array<
    [new (...args: never[]) => DomainError, HttpStatus]
  > = [
    [BusinessRuleError, HttpStatus.BAD_REQUEST],
    [UnauthorizedError, HttpStatus.UNAUTHORIZED],
    [ForbiddenError, HttpStatus.FORBIDDEN],
    [NotFoundError, HttpStatus.NOT_FOUND],
    [ConflictError, HttpStatus.CONFLICT],
  ];

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      message =
        typeof payload === 'string'
          ? payload
          : ((payload as Record<string, unknown>).message ?? payload);
    } else if (exception instanceof DomainError) {
      const match = HttpExceptionFilter.DOMAIN_STATUS.find(
        ([type]) => exception instanceof type,
      );
      status = match?.[1] ?? HttpStatus.BAD_REQUEST;
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
