import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let error = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
    };
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const exceptionBody = exceptionResponse as {
        code: string;
        message: string;
        fields?: Record<string, string[]>;
      };

      if (typeof exceptionResponse === 'object') {
        error = {
          ...exceptionBody,
          code: exceptionBody['code'] ?? 'HTTP_ERROR',
          message: exceptionBody['message'] ?? 'Request failed',
        };
      }
    }
    if (!(exception instanceof HttpException) || status >= 500) {
      const cause = exception instanceof Error ? exception.cause : undefined;
      this.logger.error(
        `${request.method} ${request.url} - ${error.message}`,
        cause instanceof Error
          ? cause.stack
          : exception instanceof Error
            ? exception.stack
            : undefined,
      );
    }

    response.status(status).json({
      success: false,
      error,
    });
  }
}
