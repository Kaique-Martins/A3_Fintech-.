import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ValidationModule } from './validation/validation.module';
import { AgentModule } from './agent/agent.module';
import { NotificationModule } from './notifications/notification.module';
import { HealthModule } from './health/health.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    ValidationModule,
    AgentModule,
    TrainingModule,
    NotificationModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
