import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationException } from './validation.exception';

interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string;
  code?: string;
  details?: any;
  error: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let code: string | undefined;
    let details: any;

    // Tratamento de ValidationException customizada
    if (exception instanceof ValidationException) {
      statusCode = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
    }
    // Tratamento de HttpException do NestJS
    else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || 'Erro HTTP';
    }
    // Tratamento de Error genérico
    else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      this.logger.error(`Erro não tratado: ${exception.message}`, exception.stack);
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: HttpStatus[statusCode] || 'Unknown Error',
    };

    if (code) {
      errorResponse.code = code;
    }

    if (details && statusCode !== HttpStatus.INTERNAL_SERVER_ERROR) {
      errorResponse.details = details;
    }

    // Log do erro
    this.logger.warn(
      `[${request.method}] ${request.url} - ${statusCode} - ${message}`,
    );

    response.status(statusCode).json(errorResponse);
  }
}
