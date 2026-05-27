import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface LearningInsight {
  type:
    | 'rule_effectiveness'
    | 'threshold_adjustment'
    | 'pattern_detection'
    | 'anomaly_alert';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  affectedDecisions: number;
  timestamp: string;
}

export interface LearningStats {
  totalDecisions: number;
  approvalRate: number;
  rejectionRate: number;
  flagRate: number;
  avgConfidence: number;
  decisionAccuracy: number;
  topPerformingRules: Record<string, number>;
  bottomPerformingRules: Record<string, number>;
  anomalies: LearningInsight[];
  trends: {
    improvingMetric: string;
    decreasingMetric: string;
  };
}

@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);
  private insights: LearningInsight[] = [];

  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Analyze decision history and generate learning insights
   */
  async analyzeBehavior(): Promise<LearningStats> {
    const decisions = await this.dbService.loadDecisions();
    const aggregate = await this.dbService.getAggregate();
    const trends = await this.dbService.getDecisionTrends(30);

    this.insights = [];

    // Calculate performance metrics
    const stats: LearningStats = {
      totalDecisions: aggregate.totalDecisions,
      approvalRate: 0,
      rejectionRate: 0,
      flagRate: 0,
      avgConfidence: aggregate.avgConfidence,
      decisionAccuracy: this.calculateAccuracy(decisions),
      topPerformingRules: this.getTopPerformingRules(decisions, aggregate),
      bottomPerformingRules: this.getBottomPerformingRules(
        decisions,
        aggregate,
      ),
      anomalies: [],
      trends: {
        improvingMetric: this.getTrendingImprovement(trends),
        decreasingMetric: this.getTrendingDecline(trends),
      },
    };

    // Generate insights
    this.generateRuleEffectivenessInsights(stats, decisions);
    this.generateThresholdAdjustmentInsights(stats, decisions);
    this.generatePatternDetectionInsights(stats, decisions);
    this.generateAnomalyAlerts(stats, decisions);

    stats.anomalies = this.insights;

    return stats;
  }

  /**
   * Calculate decision accuracy based on confidence levels
   */
  private calculateAccuracy(decisions: any[]): number {
    if (decisions.length === 0) return 0;

    // Accuracy = average confidence of all decisions
    const totalConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0);
    return totalConfidence / decisions.length;
  }

  /**
   * Get rules with highest performance
   */
  private getTopPerformingRules(
    decisions: any[],
    aggregate: any,
  ): Record<string, number> {
    const rules = { ...aggregate.topRules } as Record<string, number>;
    const sorted = Object.entries(rules)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);

    return Object.fromEntries(sorted) as Record<string, number>;
  }

  /**
   * Get rules with lowest performance
   */
  private getBottomPerformingRules(
    decisions: any[],
    aggregate: any,
  ): Record<string, number> {
    const rules = { ...aggregate.topRules } as Record<string, number>;
    const sorted = Object.entries(rules)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .filter(([_, count]) => (count as number) > 0)
      .slice(0, 3);

    return Object.fromEntries(sorted) as Record<string, number>;
  }

  /**
   * Generate insights about rule effectiveness
   */
  private generateRuleEffectivenessInsights(
    stats: LearningStats,
    decisions: any[],
  ): void {
    // Check if approval rate is too high (potential false positives)
    if (stats.approvalRate > 85) {
      this.addInsight({
        type: 'rule_effectiveness',
        severity: 'medium',
        title: '📈 Taxa de Aprovação Elevada',
        description: `${stats.approvalRate.toFixed(
          1,
        )}% dos registros estão sendo aprovados automaticamente.`,
        recommendation:
          'Considere aumentar os critérios de qualidade para regras de aprovação automática.',
        confidence: 0.75,
        affectedDecisions: decisions.filter((d) => d.decision === 'APPROVED')
          .length,
      });
    }

    // Check if rejection rate is too high
    if (stats.rejectionRate > 20) {
      this.addInsight({
        type: 'rule_effectiveness',
        severity: 'high',
        title: '❌ Taxa de Rejeição Elevada',
        description: `${stats.rejectionRate.toFixed(
          1,
        )}% dos registros estão sendo rejeitados.`,
        recommendation:
          'Analise os critérios de rejeição - pode estar rejeitando registros válidos.',
        confidence: 0.85,
        affectedDecisions: decisions.filter((d) => d.decision === 'REJECTED')
          .length,
      });
    }

    // Check if flag rate is too high
    if (stats.flagRate > 30) {
      this.addInsight({
        type: 'rule_effectiveness',
        severity: 'medium',
        title: '🚩 Taxa de Marcação Alta',
        description: `${stats.flagRate.toFixed(
          1,
        )}% dos registros estão sendo marcados para revisão.`,
        recommendation:
          'Considere automatizar mais decisões para reduzir carga de revisão manual.',
        confidence: 0.7,
        affectedDecisions: decisions.filter((d) => d.decision === 'FLAGGED')
          .length,
      });
    }
  }

  /**
   * Generate insights about threshold adjustments
   */
  private generateThresholdAdjustmentInsights(
    stats: LearningStats,
    decisions: any[],
  ): void {
    // Check if decision confidence is below threshold
    if (stats.avgConfidence < 60) {
      this.addInsight({
        type: 'threshold_adjustment',
        severity: 'high',
        title: '📉 Confiança Média Baixa',
        description: `Confiança média das decisões: ${stats.avgConfidence.toFixed(
          1,
        )}%`,
        recommendation:
          'Aumente os critérios de confiança nas regras do agente ou revise a qualidade dos dados.',
        confidence: 0.8,
        affectedDecisions: decisions.length,
      });
    }

    // Check if some rules are not being applied
    const lowPerformingRules = Object.entries(
      stats.bottomPerformingRules,
    ).filter(([_, count]) => count < 2);

    if (lowPerformingRules.length > 0) {
      this.addInsight({
        type: 'threshold_adjustment',
        severity: 'low',
        title: '⚠️ Regras Pouco Utilizadas',
        description: `${lowPerformingRules.length} regra(s) estão sendo aplicadas raramente.`,
        recommendation:
          'Considere revisar os critérios dessas regras ou removê-las se não forem relevantes.',
        confidence: 0.65,
        affectedDecisions: lowPerformingRules.reduce(
          (sum, [_, count]) => sum + count,
          0,
        ),
      });
    }
  }

  /**
   * Generate insights about pattern detection
   */
  private generatePatternDetectionInsights(
    stats: LearningStats,
    decisions: any[],
  ): void {
    // Group decisions by hour to detect patterns
    const decisionsPerHour: Record<string, any[]> = {};
    decisions.forEach((d) => {
      const hour = new Date(d.timestamp).getHours();
      if (!decisionsPerHour[hour]) decisionsPerHour[hour] = [];
      decisionsPerHour[hour].push(d);
    });

    // Find hours with significantly different approval rates
    const avgApprovalRate = stats.approvalRate;
    Object.entries(decisionsPerHour).forEach(([hour, hourDecisions]) => {
      const hourApprovalRate =
        (hourDecisions.filter((d) => d.decision === 'APPROVED').length /
          hourDecisions.length) *
        100;
      const deviation = Math.abs(hourApprovalRate - avgApprovalRate);

      if (deviation > 20 && hourDecisions.length > 5) {
        this.addInsight({
          type: 'pattern_detection',
          severity: 'low',
          title: `📊 Padrão Horário Detectado`,
          description: `Hora ${hour}:00 - Taxa de aprovação: ${hourApprovalRate.toFixed(
            1,
          )}% (desvio: ${deviation.toFixed(1)}%)`,
          recommendation:
            'Dados em horários específicos têm características diferentes. Considere regras específicas por horário.',
          confidence: 0.6,
          affectedDecisions: hourDecisions.length,
        });
      }
    });
  }

  /**
   * Generate anomaly alerts
   */
  private generateAnomalyAlerts(stats: LearningStats, decisions: any[]): void {
    // Check for sudden changes in decision patterns
    const recentDecisions = decisions.slice(-50);
    const olderDecisions = decisions.slice(-100, -50);

    if (recentDecisions.length > 0 && olderDecisions.length > 0) {
      const recentApprovalRate =
        (recentDecisions.filter((d) => d.decision === 'APPROVED').length /
          recentDecisions.length) *
        100;
      const olderApprovalRate =
        (olderDecisions.filter((d) => d.decision === 'APPROVED').length /
          olderDecisions.length) *
        100;
      const change = Math.abs(recentApprovalRate - olderApprovalRate);

      if (change > 25) {
        this.addInsight({
          type: 'anomaly_alert',
          severity: 'high',
          title: '🚨 Mudança Significativa Detectada',
          description: `Taxa de aprovação mudou de ${olderApprovalRate.toFixed(
            1,
          )}% para ${recentApprovalRate.toFixed(1)}%`,
          recommendation:
            'Investigue a causa da mudança - pode indicar mudanças nos dados ou problemas com as regras.',
          confidence: 0.9,
          affectedDecisions: recentDecisions.length,
        });
      }
    }

    // Check for Low confidence decisions
    const lowConfidenceDecisions = decisions.filter((d) => d.confidence < 0.3);
    if (lowConfidenceDecisions.length > decisions.length * 0.1) {
      this.addInsight({
        type: 'anomaly_alert',
        severity: 'medium',
        title: '⚠️ Muitas Decisões com Baixa Confiança',
        description: `${(
          (lowConfidenceDecisions.length / decisions.length) *
          100
        ).toFixed(1)}% das decisões têm confiança < 30%`,
        recommendation:
          'Revise os dados de entrada - qualidade abaixo do esperado. Atualize as regras de confiança.',
        confidence: 0.75,
        affectedDecisions: lowConfidenceDecisions.length,
      });
    }
  }

  /**
   * Get the metric that is improving the most
   */
  private getTrendingImprovement(trends: Record<string, number>): string {
    const entries = Object.entries(trends).reverse();
    if (entries.length < 2) return 'N/A';

    const recent = entries[0][1];
    const older = entries[Math.min(entries.length - 1, 7)][1];
    const improvement = recent - older;

    return improvement > 0
      ? `Volume (+${improvement} decisões)`
      : 'Sem melhora';
  }

  /**
   * Get the metric that is declining
   */
  private getTrendingDecline(trends: Record<string, number>): string {
    const entries = Object.entries(trends).reverse();
    if (entries.length < 2) return 'N/A';

    const recent = entries[0][1];
    const older = entries[Math.min(entries.length - 1, 7)][1];
    const decline = older - recent;

    return decline > 0 ? `Volume (-${decline} decisões)` : 'Sem declínio';
  }

  /**
   * Add insight to collection
   */
  private addInsight(insight: Omit<LearningInsight, 'timestamp'>): void {
    this.insights.push({
      ...insight,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get all learning insights
   */
  getInsights(): LearningInsight[] {
    return [...this.insights];
  }

  /**
   * Get recommendations for rule adjustments
   */
  getRecommendations(): string[] {
    return this.insights.map((i) => i.recommendation);
  }

  /**
   * Export learning report
   */
  generateReport() {
    return {
      insights: this.insights,
      summary: {
        totalInsights: this.insights.length,
        highSeverity: this.insights.filter((i) => i.severity === 'high').length,
        avgConfidence: (
          this.insights.reduce((sum, i) => sum + i.confidence, 0) /
          this.insights.length
        ).toFixed(2),
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
