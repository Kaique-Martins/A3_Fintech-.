import { Module } from '@nestjs/common';
import { TrainingMemoryService } from './training-memory.service';
import { TrainingRankingService } from './training-ranking.service';
import { TrainingEngineService } from './training-engine.service';
import { TrainingFeedbackService } from './training-feedback.service';
import { TrainingAnalyticsService } from './training-analytics.service';
import { AutoTrainingService } from './auto-training.service';
import { TrainingController } from './training.controller';
import { DatabaseModule } from '../database/database.module';

/**
 * TrainingModule
 *
 * Camadas (composition):
 *  Memory  ← persistência JSON + embeddings
 *  Ranking ← scoring algorithm
 *  Engine  ← orquestra retrieval + adaptive suggestions (consome Memory + Ranking)
 *  Feedback← reinforcement loop (consome Memory + Ranking)
 *  Analytics← KPIs e evolution timeline (consome Memory + Ranking)
 *
 * Exporta TrainingEngineService para que o AgentModule possa consumir e
 * permitir que o agente "consulte exemplos antes de responder".
 */
@Module({
  imports: [DatabaseModule],
  providers: [
    TrainingMemoryService,
    TrainingRankingService,
    TrainingEngineService,
    TrainingFeedbackService,
    TrainingAnalyticsService,
    AutoTrainingService,
  ],
  controllers: [TrainingController],
  exports: [
    TrainingEngineService,
    TrainingAnalyticsService,
    TrainingFeedbackService,
    AutoTrainingService,
  ],
})
export class TrainingModule {}
