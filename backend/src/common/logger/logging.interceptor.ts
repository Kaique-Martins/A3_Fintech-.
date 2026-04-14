import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AppLogger } from './logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip } = request;

    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        AppLogger.logApiRequest(method, url, statusCode, duration);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode || 500;
        AppLogger.logApiError(method, url, error, statusCode);
        throw error;
      }),
    );
  }
}
