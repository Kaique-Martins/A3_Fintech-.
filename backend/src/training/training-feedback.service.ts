import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TrainingMemoryService } from './training-memory.service';
import { TrainingRankingService } from './training-ranking.service';
import {
  FeedbackDto,
  TrainingFeedback,
} from './training.types';

/**
 * TrainingFeedbackService
 *
 * Recebe reinforcement signals (👍/👎) e propaga para a memória:
 *  - Atualiza positiveCount / negativeCount do exemplo associado
 *  - Recalcula confidence via Laplace smoothing
 *  - Gera registro auditável no histórico de feedback
 */
@Injectable()
export class TrainingFeedbackService {
  private readonly logger = new Logger(TrainingFeedbackService.name);

  constructor(
    private readonly memory: TrainingMemoryService,
    private readonly ranking: TrainingRankingService,
  ) {}

  recordFeedback(dto: FeedbackDto): TrainingFeedback {
    const fb: TrainingFeedback = {
      id: `fb-${randomUUID().slice(0, 8)}`,
      exampleId: dto.exampleId,
      decisionRecordId: dto.decisionRecordId,
      rating: dto.rating,
      notes: dto.notes,
      timestamp: new Date().toISOString(),
    };

    this.memory.addFeedback(fb);

    if (dto.exampleId) {
      this.applyReinforcementSignal(dto.exampleId, dto.rating === 'positive');
    }

    this.logger.log(
      `Feedback ${dto.rating.toUpperCase()} registrado` +
        (dto.exampleId ? ` para exemplo ${dto.exampleId}` : ''),
    );

    return fb;
  }

  private applyReinforcementSignal(exampleId: string, positive: boolean): void {
    const ex = this.memory.getExampleById(exampleId);
    if (!ex) return;

    if (positive) ex.positiveCount += 1;
    else ex.negativeCount += 1;

    ex.confidence = this.ranking.computeConfidence(
      ex.positiveCount,
      ex.negativeCount,
    );
    ex.updatedAt = new Date().toISOString();

    this.memory.saveExample(ex);
  }

  getRecentFeedback(limit = 50): TrainingFeedback[] {
    return this.memory.getAllFeedback().slice(0, limit);
  }
}
