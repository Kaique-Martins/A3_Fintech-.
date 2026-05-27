import { Injectable, Logger } from '@nestjs/common';
import { UserFeedback, RuleWeightHistory } from '../agent-explanation.types';
import { DatabaseService } from '../../database/database.service';
import { AgentRule } from '../agent.types';

@Injectable()
export class AgentFeedbackService {
  private readonly logger = new Logger(AgentFeedbackService.name);

  // Armazena feedback em memória (persiste em DB)
  private feedbackHistory: UserFeedback[] = [];
  private ruleWeightHistory: Map<string, RuleWeightHistory> = new Map();

  constructor(private readonly dbService: DatabaseService) {
    this.loadFeedbackHistory();
  }

  /**
   * Registra feedback do usuário sobre uma decisão
   */
  async recordFeedback(
    feedback: UserFeedback,
    appliedRules: string[],
  ): Promise<void> {
    this.feedbackHistory.push(feedback);

    // Se usuário discorda, ajusta pesos automaticamente
    if (!feedback.userAgreement) {
      this.adjustRuleWeights(appliedRules, 'negative');
    } else {
      this.adjustRuleWeights(appliedRules, 'positive');
    }

    // Persiste feedback
    await this.persistFeedback(feedback);

    this.logger.log(
      `Feedback recorded for record ${feedback.recordId}: ${
        feedback.userAgreement ? 'AGREED' : 'DISAGREED'
      }`,
    );
  }

  /**
   * Ajusta pesos das regras baseado em feedback
   */
  private adjustRuleWeights(
    ruleIds: string[],
    sentimento: 'positive' | 'negative',
  ): void {
    ruleIds.forEach((ruleId) => {
      const history = this.ruleWeightHistory.get(ruleId) || {
        ruleId,
        ruleName: ruleId,
        weights: [],
        currentWeight: 1.0,
        totalAdjustments: 0,
      };

      // Ajusta peso
      const adjustmentFactor = sentimento === 'positive' ? 1.05 : 0.95;
      const newWeight = Math.max(
        0.1,
        Math.min(2.0, history.currentWeight * adjustmentFactor),
      );

      history.weights.push({
        timestamp: new Date().toISOString(),
        weight: newWeight,
        reason: `User feedback - ${
          sentimento === 'positive' ? 'agreed' : 'disagreed'
        } with decision`,
      });

      history.currentWeight = newWeight;
      history.totalAdjustments++;

      this.ruleWeightHistory.set(ruleId, history);

      this.logger.debug(
        `Adjusted rule ${ruleId} weight from ${(
          newWeight / adjustmentFactor
        ).toFixed(2)} to ${newWeight.toFixed(2)} (${sentimento})`,
      );
    });
  }

  /**
   * Retorna histórico de feedback
   */
  getFeedbackHistory(): UserFeedback[] {
    return this.feedbackHistory;
  }

  /**
   * Calcula taxa de concordância com usuário
   */
  getUserAgreementRate(): number {
    if (this.feedbackHistory.length === 0) return 100;

    const agreed = this.feedbackHistory.filter((f) => f.userAgreement).length;
    return Math.round((agreed / this.feedbackHistory.length) * 100);
  }

  /**
   * Retorna histórico de ajustes de peso de uma regra
   */
  getRuleWeightHistory(ruleId: string): RuleWeightHistory | undefined {
    return this.ruleWeightHistory.get(ruleId);
  }

  /**
   * Retorna todos os históricos de ajustes
   */
  getAllRuleWeightHistories(): RuleWeightHistory[] {
    return Array.from(this.ruleWeightHistory.values());
  }

  /**
   * Retorna fator de ajuste atual de uma regra (para usar no cálculo de score)
   */
  getRuleWeightFactor(ruleId: string): number {
    return this.ruleWeightHistory.get(ruleId)?.currentWeight || 1.0;
  }

  /**
   * Persiste feedback no banco de dados
   */
  private async persistFeedback(feedback: UserFeedback): Promise<void> {
    try {
      // Salva em um arquivo de feedback/audit
      const feedbackData = {
        feedbacks: this.feedbackHistory,
        ruleWeights: Array.from(this.ruleWeightHistory.values()),
      };

      // Aqui você salvaria em banco de dados
      // Por enquanto, apenas loga
      this.logger.debug(
        `Persisted feedback. Total: ${this.feedbackHistory.length}`,
      );
    } catch (error) {
      this.logger.error(`Failed to persist feedback: ${error.message}`);
    }
  }

  /**
   * Carrega histórico de feedback do banco de dados
   */
  private async loadFeedbackHistory(): Promise<void> {
    try {
      // Carregaria do banco de dados em produção
      // Por agora, inicia vazio
      this.feedbackHistory = [];
      this.ruleWeightHistory = new Map();
    } catch (error) {
      this.logger.error(`Failed to load feedback history: ${error.message}`);
    }
  }

  /**
   * Gera relatório de aprendizado do agent
   */
  generateLearningReport(): {
    totalFeedbacks: number;
    agreementRate: number;
    mostAdjustedRules: string[];
    ruleWeightTrends: Map<string, number>;
  } {
    const agreementRate = this.getUserAgreementRate();
    const ruleWeightTrends = new Map<string, number>();

    this.ruleWeightHistory.forEach((history, ruleId) => {
      ruleWeightTrends.set(ruleId, history.currentWeight);
    });

    // Ordena regras por número de ajustes
    const mostAdjustedRules = Array.from(this.ruleWeightHistory.values())
      .sort((a, b) => b.totalAdjustments - a.totalAdjustments)
      .slice(0, 5)
      .map((h) => `${h.ruleName} (${h.totalAdjustments} adjustments)`);

    return {
      totalFeedbacks: this.feedbackHistory.length,
      agreementRate,
      mostAdjustedRules,
      ruleWeightTrends,
    };
  }

  /**
   * Reseta feedback history (útil para testes)
   */
  resetFeedbackHistory(): void {
    this.feedbackHistory = [];
    this.ruleWeightHistory = new Map();
    this.logger.warn('Feedback history reset');
  }
}
