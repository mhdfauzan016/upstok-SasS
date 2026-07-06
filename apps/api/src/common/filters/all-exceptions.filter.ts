import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorEnvelope {
  code: string;
  message: string;
  details?: unknown;
}

const STATUS_CODE_MAP: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
};

/**
 * Converts every thrown error into the stable API envelope `{ code, message,
 * details }`. Services already throw HttpExceptions whose response IS the
 * envelope — those pass through unchanged. Everything else is mapped (and
 * unknown errors are logged and reduced to a generic 500, never leaking stacks).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} → ${status} ${body.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    body: ErrorEnvelope;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // Service-thrown envelope: { code, message, details }
      if (
        typeof response === 'object' &&
        response !== null &&
        'code' in response
      ) {
        return { status, body: response as ErrorEnvelope };
      }

      // Framework/validation exception: { statusCode, message, error }
      const message =
        typeof response === 'object' && response !== null
          ? ((response as { message?: unknown }).message ?? exception.message)
          : exception.message;

      return {
        status,
        body: {
          code: STATUS_CODE_MAP[status] ?? 'ERROR',
          message: Array.isArray(message)
            ? 'validation failed'
            : String(message),
          ...(Array.isArray(message) ? { details: message } : {}),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL', message: 'internal server error' },
    };
  }
}
