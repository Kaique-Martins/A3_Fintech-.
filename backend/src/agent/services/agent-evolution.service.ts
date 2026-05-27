import { Injectable, Logger } from '@nestjs/common';
import {
  AgentEvolutionMetrics,
  RuleWeightHistory,
} from '../agent-explanation.types';
import { AgentFeedbackService } from './agent-feedback.service';

@Injectable()
export class AgentEvolutionService {
  private readonly logger = new Logger(AgentEvolutionService.name);

  // Histórico de métricas por período
  private evolutionHistory: AgentEvolutionMetrics[] = [];
  private decisionsPerPeriod: Map<string, number> = new Map();

  constructor(private readonly feedbackService: AgentFeedbackService) {
    this.initializeTracking();
  }

  /**
   * Registra um ponto de evolução (snapshot do estado atual)
   */
  recordEvolutionPoint(
    decisionCount: number,
    ruleWeightHistories: RuleWeightHistory[],
  ): void {
    const currentMetrics: AgentEvolutionMetrics = {
      timestamp: new Date().toISOString(),
      totalDecisions: decisionCount,
      userAgreementRate: this.feedbackService.getUserAgreementRate(),
      accuracyTrend: this.calculateAccuracyTrend(),
      ruleWeightChanges: ruleWeightHistories,
      behaviorChanges: this.detectBehaviorChanges(),
    };

    this.evolutionHistory.push(currentMetrics);

    this.logger.log(
      `Evolution point recorded. Decisions: ${decisionCount}, Agreement Rate: ${currentMetrics.userAgreementRate}%`,
    );
  }

  /**
   * Calcula tendência de acurácia ao longo do tempo
   */
  private calculateAccuracyTrend(): { period: string; accuracy: number }[] {
    const now = new Date();
    const periods = [
      { label: '1h', hours: 1 },
      { label: '1d', hours: 24 },
      { label: '1w', hours: 24 * 7 },
    ];

    return periods.map((period) => {
      const cutoff = new Date(now.getTime() - period.hours * 60 * 60 * 1000);
      const recentMetrics = this.evolutionHistory.filter(
        (m) => new Date(m.timestamp) > cutoff,
      );

      if (recentMetrics.length === 0) {
        return { period: period.label, accuracy: 0 };
      }

      const avgAccuracy =
        recentMetrics.reduce((sum, m) => sum + m.userAgreementRate, 0) /
        recentMetrics.length;

      return { period: period.label, accuracy: Math.round(avgAccuracy) };
    });
  }

  /**
   * Detecta mudanças de comportamento significativas no agent
   */
  private detectBehaviorChanges(): {
    timestamp: string;
    description: string;
    impactScore: number;
  }[] {
    const changes: {
      timestamp: string;
      description: string;
      impactScore: number;
    }[] = [];

    if (this.evolutionHistory.length < 2) return changes;

    const recent = this.evolutionHistory[this.evolutionHistory.length - 1];
    const previous = this.evolutionHistory[this.evolutionHistory.length - 2];

    // Detecta mudança em taxa de concordância
    const agreementChange =
      recent.userAgreementRate - previous.userAgreementRate;
    if (Math.abs(agreementChange) > 5) {
      const direction = agreementChange > 0 ? 'improved' : 'declined';
      changes.push({
        timestamp: recent.timestamp,
        description: `User agreement rate ${direction} by ${Math.abs(
          Math.round(agreementChange),
        )}%`,
        impactScore: Math.abs(agreementChange),
      });
    }

    // Detecta ajustes significativos de pesos de regras
    recent.ruleWeightChanges.forEach((ruleChange) => {
      const previousRule = previous.ruleWeightChanges.find(
        (r) => r.ruleId === ruleChange.ruleId,
      );

      if (previousRule) {
        const weightDiff =
          Math.abs(ruleChange.currentWeight - previousRule.currentWeight) /
          previousRule.currentWeight;

        if (weightDiff > 0.1) {
          // 10% mudança
          changes.push({
            timestamp: recent.timestamp,
            description: `Rule "${
              ruleChange.ruleName
            }" weight adjusted by ${Math.round(weightDiff * 100)}%`,
            impactScore: Math.round(weightDiff * 100),
          });
        }
      }
    });

    return changes;
  }

  /**
   * Retorna evolução completa do agent
   */
  getEvolutionHistory(): AgentEvolutionMetrics[] {
    return this.evolutionHistory;
  }

  /**
   * Retorna métricas de evolução do último período
   */
  getLatestEvolution(): AgentEvolutionMetrics | undefined {
    return this.evolutionHistory[this.evolutionHistory.length - 1];
  }

  /**
   * Compara estado do agent em dois pontos no tempo
   */
  compareEvolutionStates(
    startIndex: number,
    endIndex: number,
  ): {
    startState: AgentEvolutionMetrics;
    endState: AgentEvolutionMetrics;
    changes: string[];
  } | null {
    if (
      startIndex < 0 ||
      endIndex >= this.evolutionHistory.length ||
      startIndex >= endIndex
    ) {
      return null;
    }

    const startState = this.evolutionHistory[startIndex];
    const endState = this.evolutionHistory[endIndex];
    const changes: string[] = [];

    // Compara taxa de concordância
    const agreementDiff =
      endState.userAgreementRate - startState.userAgreementRate;
    if (agreementDiff !== 0) {
      changes.push(
        `Agreement rate: ${startState.userAgreementRate}% → ${
          endState.userAgreementRate
        }% (${agreementDiff > 0 ? '+' : ''}${agreementDiff}%)`,
      );
    }

    // Compara total de decisões
    const decisionDiff = endState.totalDecisions - startState.totalDecisions;
    if (decisionDiff !== 0) {
      changes.push(`Decisions processed: ${decisionDiff} new`);
    }

    return { startState, endState, changes };
  }

  /**
   * Gera relatório de evolução formatado
   */
  generateEvolutionReport(): string {
    const latest = this.getLatestEvolution();
    if (!latest) return 'No evolution data available yet';

    const lines = [
      '📊 AGENT EVOLUTION REPORT',
      '═'.repeat(40),
      `Timestamp: ${latest.timestamp}`,
      `Total Decisions: ${latest.totalDecisions}`,
      `User Agreement Rate: ${latest.userAgreementRate}%`,
      '',
      '📈 Accuracy Trend:',
    ];

    latest.accuracyTrend.forEach((trend) => {
      lines.push(`  ${trend.period}: ${trend.accuracy}%`);
    });

    if (latest.ruleWeightChanges.length > 0) {
      lines.push('', '⚖️ Rule Weight Changes:');
      latest.ruleWeightChanges.forEach((rule) => {
        if (rule.weights.length > 0) {
          const lastWeight = rule.weights[rule.weights.length - 1];
          lines.push(`  ${rule.ruleName}: ${lastWeight.weight.toFixed(2)}`);
        }
      });
    }

    if (latest.behaviorChanges.length > 0) {
      lines.push('', '🔄 Behavior Changes:');
      latest.behaviorChanges.forEach((change) => {
        lines.push(`  • ${change.description} (Impact: ${change.impactScore})`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Inicia rastreamento de evolução
   */
  private initializeTracking(): void {
    // Registra primeiro ponto de evolução
    this.recordEvolutionPoint(0, []);
    this.logger.log('Agent evolution tracking initialized');
  }

  /**
   * Reseta histórico de evolução (para testes)
   */
  resetEvolutionHistory(): void {
    this.evolutionHistory = [];
    this.decisionsPerPeriod.clear();
    this.initializeTracking();
    this.logger.warn('Evolution history reset');
  }
}
