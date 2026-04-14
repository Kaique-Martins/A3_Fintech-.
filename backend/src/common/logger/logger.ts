import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');

// Criar diretório de logs se não existir
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'fintech-validation' },
  transports: [
    // Arquivo para todos os logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Arquivo apenas para erros
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Arquivo para validações
    new winston.transports.File({
      filename: path.join(logsDir, 'validation.log'),
      maxsize: 5242880,
      maxFiles: 10,
    }),
  ],
});

// Adicionar console em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        }),
      ),
    }),
  );
}

/**
 * Tipos de log estruturado para a aplicação
 */
export class AppLogger {
  static logValidation(data: any) {
    logger.info('Validation executed', {
      category: 'validation',
      ...data,
    });
  }

  static logValidationError(error: any, data?: any) {
    logger.error('Validation error occurred', {
      category: 'validation_error',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    });
  }

  static logDatabaseOperation(operation: string, data?: any) {
    logger.info(`Database ${operation}`, {
      category: 'database',
      operation,
      ...data,
    });
  }

  static logDatabaseError(operation: string, error: any, data?: any) {
    logger.error(`Database ${operation} failed`, {
      category: 'database_error',
      operation,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    });
  }

  static logAgentDecision(decision: any) {
    logger.info('Agent decision made', {
      category: 'agent',
      decision,
      timestamp: new Date().toISOString(),
    });
  }

  static logBatchProcess(recordsCount: number, successCount: number, failureCount: number) {
    logger.info('Batch processing completed', {
      category: 'batch',
      totalRecords: recordsCount,
      successful: successCount,
      failed: failureCount,
      successRate: ((successCount / recordsCount) * 100).toFixed(2) + '%',
    });
  }

  static logApiRequest(method: string, path: string, statusCode: number, duration: number) {
    logger.info(`${method} ${path}`, {
      category: 'api',
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
    });
  }

  static logApiError(method: string, path: string, error: any, statusCode: number) {
    logger.error(`${method} ${path} - Error`, {
      category: 'api_error',
      method,
      path,
      statusCode,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  static logStartup() {
    logger.info('Application started', {
      category: 'startup',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  }

  static logShutdown(reason?: string) {
    logger.info('Application shutting down', {
      category: 'shutdown',
      reason,
      timestamp: new Date().toISOString(),
    });
  }
}
