import { Injectable } from '@nestjs/common';
import { TrainingExample, MatchResult } from './training.types';

/**
 * TrainingRankingService
 *
 * Implementa o algoritmo de ranking adaptativo. Combina:
 *  - similarity (cosine via embedding TF-IDF)
 *  - confidence (Laplace-smoothed pos/neg ratio)
 *  - priorityBoost (manual override do usuário)
 *  - decay temporal leve para favorecer exemplos usados recentemente
 *
 * Equivalente acadêmico: "reinforcement-weighted retrieval".
 */
@Injectable()
export class TrainingRankingService {

  /**
   * Calcula confidence de um exemplo via Laplace smoothing.
   * Garante que exemplos sem feedback comecem em 50% (neutral prior).
   */
  computeConfidence(positiveCount: number, negativeCount: number): number {
    const total = positiveCount + negativeCount;
    const smoothed = (positiveCount + 1) / (total + 2);
    return Math.round(smoothed * 100);
  }

  /**
   * Score final usado para ordenar matches.
   *  rankScore = similarity × (confidence/100) × (1 + priorityBoost/100) × recencyFactor
   */
  computeRankScore(example: TrainingExample, similarity: number): number {
    const conf = example.confidence / 100;
    const boost = 1 + (example.priorityBoost || 0) / 100;
    const recency = this.recencyFactor(example.lastUsedAt);
    return Math.max(0, similarity) * conf * boost * recency;
  }

  /**
   * Decay temporal suave — exemplos não-usados há semanas perdem ~10% de relevância.
   * Mantém o piso em 0.85 para evitar penalização exagerada.
   */
  private recencyFactor(lastUsedAt?: string): number {
    if (!lastUsedAt) return 1;
    const ageDays = (Date.now() - new Date(lastUsedAt).getTime()) / 86400000;
    return Math.max(0.85, 1 - ageDays * 0.005);
  }

  /**
   * Ordena MatchResults e aplica corte por threshold mínimo.
   */
  rank(matches: MatchResult[], minThreshold = 0.1): MatchResult[] {
    return matches
      .filter((m) => m.rankScore >= minThreshold)
      .sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * Classifica o modelo conforme volume de treino acumulado.
   * Usado para o badge "Model Status" no dashboard.
   */
  classifyModelStatus(
    totalExamples: number,
    accuracy: number,
  ): 'COLD' | 'LEARNING' | 'TRAINED' | 'EXPERT' {
    if (totalExamples < 3) return 'COLD';
    if (totalExamples < 10 || accuracy < 0.6) return 'LEARNING';
    if (accuracy < 0.85) return 'TRAINED';
    return 'EXPERT';
  }
}
