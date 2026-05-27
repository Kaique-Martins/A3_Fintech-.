import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/exceptions';
import { LoggingInterceptor, AppLogger } from './common/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  // Enable CORS
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Validate and transform incoming request bodies
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Register global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Register global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('FinTech Validation System API')
    .setDescription(
      'API para validação de dados em tempo real para compliance em transações fintech. ' +
        'Sistema autônomo com inteligência artificial e detecção de anomalias.',
    )
    .setVersion('3.0.0')
    .addTag('validation', 'Operações de validação de dados')
    .addTag('agent', 'Controle do agente autônomo')
    .addTag('health', 'Status e saúde do sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  AppLogger.logStartup();
  console.log(`FinTech Validation Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
