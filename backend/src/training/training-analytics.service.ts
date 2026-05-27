import { Injectable } from '@nestjs/common';
import { TrainingMemoryService } from './training-memory.service';
import { TrainingRankingService } from './training-ranking.service';
import { TrainingAnalytics, EvolutionPoint } from './training.types';

/**
 * TrainingAnalyticsService
 *
 * Produz métricas inteligentes para o dashboard:
 *  - taxa de acerto (positive feedback ratio)
 *  - confiança média global
 *  - série temporal de evolução
 *  - top/weak examples
 *  - status do modelo (COLD/LEARNING/TRAINED/EXPERT)
 *
 * Cada chamada também grava um snapshot na evolution time-series.
 */
@Injectable()
export class TrainingAnalyticsService {
  constructor(
    private readonly memory: TrainingMemoryService,
    private readonly ranking: TrainingRankingService,
  ) {}

  computeAnalytics(recordSnapshot = true): TrainingAnalytics {
    const examples = this.memory.getAllExamples();
    const feedback = this.memory.getAllFeedback();

    const positives = feedback.filter((f) => f.rating === 'positive').length;
    const negatives = feedback.filter((f) => f.rating === 'negative').length;
    const totalFb = positives + negatives;
    const accuracyRatio = totalFb > 0 ? positives / totalFb : 0;
    const accuracyRate = Math.round(accuracyRatio * 100);

    const avgConfidence =
      examples.length > 0
        ? Math.round(
            examples.reduce((s, e) => s + e.confidence, 0) / examples.length,
          )
        : 0;

    const sortedByConfidence = [...examples].sort(
      (a, b) => b.confidence - a.confidence,
    );
    const topExamples = sortedByConfidence.slice(0, 5);
    const weakExamples = [...sortedByConfidence].reverse().slice(0, 5);

    const lastTrainedAt = examples
      .map((e) => e.updatedAt)
      .sort()
      .pop();

    const correctedResponses = feedback.filter(
      (f) => f.rating === 'negative' && f.notes && f.notes.length > 0,
    ).length;

    const modelStatus = this.ranking.classifyModelStatus(
      examples.length,
      accuracyRatio,
    );

    if (recordSnapshot) {
      const point: EvolutionPoint = {
        timestamp: new Date().toISOString(),
        accuracy: accuracyRate,
        totalExamples: examples.length,
        totalFeedbacks: feedback.length,
      };
      this.memory.recordEvolution(point);
    }

    return {
      totalExamples: examples.length,
      totalFeedbacks: feedback.length,
      positiveFeedbacks: positives,
      negativeFeedbacks: negatives,
      accuracyRate,
      avgConfidence,
      evolutionTrend: this.memory.getEvolution(),
      topExamples,
      weakExamples,
      correctedResponses,
      modelStatus,
      lastTrainedAt,
    };
  }

  /**
   * Snapshot leve (sem gravar nova evolução) para polling rápido.
   */
  quickStats(): Pick<
    TrainingAnalytics,
    'totalExamples' | 'avgConfidence' | 'accuracyRate' | 'modelStatus'
  > {
    const a = this.computeAnalytics(false);
    return {
      totalExamples: a.totalExamples,
      avgConfidence: a.avgConfidence,
      accuracyRate: a.accuracyRate,
      modelStatus: a.modelStatus,
    };
  }
}
