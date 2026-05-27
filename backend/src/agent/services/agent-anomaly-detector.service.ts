import { Injectable, Logger } from '@nestjs/common';
import { AnomalyIndicator } from '../agent-explanation.types';

@Injectable()
export class AgentAnomalyDetectorService {
  private readonly logger = new Logger(AgentAnomalyDetectorService.name);

  // Rastreia métricas por período
  private decisionMetrics: Map<
    string,
    { approved: number; rejected: number; flagged: number; timestamp: Date }
  > = new Map();
  private confidenceHistory: number[] = [];
  private anomalies: AnomalyIndicator[] = [];

  // Configurações de threshold
  private readonly APPROVAL_RATE_THRESHOLD = 15; // % mudança considerada anómala
  private readonly CONFIDENCE_DROP_THRESHOLD = 20; // % queda considerada anómala
  private readonly MIN_DECISIONS_FOR_ANALYSIS = 10;

  /**
   * Analisa decisão para detectar anomalias
   */
  analyzeDecision(
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED',
    confidence: number,
  ): AnomalyIndicator[] {
    const detectedAnomalies: AnomalyIndicator[] = [];

    // Registra decisão
    this.recordDecision(decision, confidence);

    // Apenas analisa se temos dados suficientes
    if (this.getTotalDecisions() < this.MIN_DECISIONS_FOR_ANALYSIS) {
      return [];
    }

    // Verifica diferentes tipos de anomalia
    const rejectionRateAnomaly = this.detectUnusualRejectionRate();
    if (rejectionRateAnomaly) detectedAnomalies.push(rejectionRateAnomaly);

    const approvalRateAnomaly = this.detectUnusualApprovalRate();
    if (approvalRateAnomaly) detectedAnomalies.push(approvalRateAnomaly);

    const confidenceAnomaly = this.detectConfidenceDrop();
    if (confidenceAnomaly) detectedAnomalies.push(confidenceAnomaly);

    const weightDriftAnomaly = this.detectRuleWeightDrift();
    if (weightDriftAnomaly) detectedAnomalies.push(weightDriftAnomaly);

    // Armazena anomalias
    if (detectedAnomalies.length > 0) {
      this.anomalies.push(...detectedAnomalies);
      detectedAnomalies.forEach((anomaly) => {
        this.logger.warn(
          `🚨 ANOMALY DETECTED: ${anomaly.type} - ${anomaly.description}`,
        );
      });
    }

    return detectedAnomalies;
  }

  /**
   * Detecta taxa de rejeição anormalmente alta
   */
  private detectUnusualRejectionRate(): AnomalyIndicator | null {
    const stats = this.getDecisionStats();
    if (!stats || stats.totalDecisions < this.MIN_DECISIONS_FOR_ANALYSIS) {
      return null;
    }

    const currentRejectionRate = (stats.rejected / stats.totalDecisions) * 100;
    const historicalAverage = this.getHistoricalApprovalRate();

    // Se taxa de rejeição está 15% acima da média histórica
    if (
      currentRejectionRate >
      historicalAverage + this.APPROVAL_RATE_THRESHOLD
    ) {
      return {
        type: 'UNUSUAL_REJECTION_RATE',
        severity:
          currentRejectionRate > historicalAverage + 30 ? 'HIGH' : 'MEDIUM',
        description: `Rejection rate increased to ${currentRejectionRate.toFixed(
          1,
        )}% (historical avg: ${historicalAverage.toFixed(1)}%)`,
        metrics: {
          expected: historicalAverage,
          actual: currentRejectionRate,
          deviation: currentRejectionRate - historicalAverage,
        },
        detectedAt: new Date().toISOString(),
        suggestedAction:
          'Review agent rules - may be too conservative. Check if rule weights need adjustment.',
      };
    }

    return null;
  }

  /**
   * Detecta taxa de aprovação anormalmente alta
   */
  private detectUnusualApprovalRate(): AnomalyIndicator | null {
    const stats = this.getDecisionStats();
    if (!stats || stats.totalDecisions < this.MIN_DECISIONS_FOR_ANALYSIS) {
      return null;
    }

    const currentApprovalRate = (stats.approved / stats.totalDecisions) * 100;
    const historicalAverage = this.getHistoricalRejectionRate();

    // Se taxa de aprovação está 15% acima da média histórica
    if (currentApprovalRate > historicalAverage + 30) {
      // Maior threshold para approval
      return {
        type: 'UNUSUAL_APPROVAL_RATE',
        severity:
          currentApprovalRate > historicalAverage + 50 ? 'HIGH' : 'MEDIUM',
        description: `Approval rate increased to ${currentApprovalRate.toFixed(
          1,
        )}% (historical avg: ${historicalAverage.toFixed(1)}%)`,
        metrics: {
          expected: historicalAverage,
          actual: currentApprovalRate,
          deviation: currentApprovalRate - historicalAverage,
        },
        detectedAt: new Date().toISOString(),
        suggestedAction:
          'Review agent rules - may be too lenient. Consider increasing strictness or reviewing rule weights.',
      };
    }

    return null;
  }

  /**
   * Detecta queda de confiança anormalmente grande
   */
  private detectConfidenceDrop(): AnomalyIndicator | null {
    if (this.confidenceHistory.length < this.MIN_DECISIONS_FOR_ANALYSIS) {
      return null;
    }

    const recentConfidences = this.confidenceHistory.slice(-5);
    const olderConfidences = this.confidenceHistory.slice(0, -5);

    const avgRecent = this.calculateAverage(recentConfidences);
    const avgOlder = this.calculateAverage(olderConfidences);

    const confidenceDrop = avgOlder - avgRecent;

    if (confidenceDrop > this.CONFIDENCE_DROP_THRESHOLD) {
      return {
        type: 'CONFIDENCE_DROP',
        severity: confidenceDrop > 40 ? 'HIGH' : 'MEDIUM',
        description: `Agent confidence dropped from ${avgOlder.toFixed(
          1,
        )}% to ${avgRecent.toFixed(1)}%`,
        metrics: {
          expected: avgOlder,
          actual: avgRecent,
          deviation: confidenceDrop,
        },
        detectedAt: new Date().toISOString(),
        suggestedAction:
          'Agent is less confident in decisions. Check if validation data quality changed or if new patterns emerged.',
      };
    }

    return null;
  }

  /**
   * Detecta mudanças anormais nos pesos das regras (placeholder)
   */
  private detectRuleWeightDrift(): AnomalyIndicator | null {
    // Seria implementado com integração com AgentFeedbackService
    // Por agora, retorna null
    return null;
  }

  /**
   * Registra uma decisão no histórico
   */
  private recordDecision(
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED',
    confidence: number,
  ): void {
    const periodKey = this.getPeriodKey();
    const stats = this.decisionMetrics.get(periodKey) || {
      approved: 0,
      rejected: 0,
      flagged: 0,
      timestamp: new Date(),
    };

    switch (decision) {
      case 'APPROVED':
        stats.approved++;
        break;
      case 'REJECTED':
        stats.rejected++;
        break;
      case 'FLAGGED':
        stats.flagged++;
        break;
    }

    this.decisionMetrics.set(periodKey, stats);
    this.confidenceHistory.push(confidence);

    // Mantém histórico limitado (últimas 100 decisões)
    if (this.confidenceHistory.length > 100) {
      this.confidenceHistory.shift();
    }
  }

  /**
   * Retorna estatísticas de decisões do período atual
   */
  private getDecisionStats(): {
    totalDecisions: number;
    approved: number;
    rejected: number;
    flagged: number;
  } | null {
    const periodKey = this.getPeriodKey();
    const stats = this.decisionMetrics.get(periodKey);

    if (!stats) return null;

    return {
      totalDecisions: stats.approved + stats.rejected + stats.flagged,
      approved: stats.approved,
      rejected: stats.rejected,
      flagged: stats.flagged,
    };
  }

  /**
   * Retorna taxa média histórica de aprovação
   */
  private getHistoricalApprovalRate(): number {
    let totalApproved = 0;
    let total = 0;

    this.decisionMetrics.forEach((stats) => {
      totalApproved += stats.approved;
      total += stats.approved + stats.rejected + stats.flagged;
    });

    if (total === 0) return 70; // Default assumption
    return (totalApproved / total) * 100;
  }

  /**
   * Retorna taxa média histórica de rejeição
   */
  private getHistoricalRejectionRate(): number {
    let totalRejected = 0;
    let total = 0;

    this.decisionMetrics.forEach((stats) => {
      totalRejected += stats.rejected;
      total += stats.approved + stats.rejected + stats.flagged;
    });

    if (total === 0) return 10; // Default assumption
    return (totalRejected / total) * 100;
  }

  /**
   * Total de decisões registradas
   */
  private getTotalDecisions(): number {
    let total = 0;
    this.decisionMetrics.forEach((stats) => {
      total += stats.approved + stats.rejected + stats.flagged;
    });
    return total;
  }

  /**
   * Calcula média de um array
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b) / values.length;
  }

  /**
   * Gera chave de período (ex: "2026-05-26-10h")
   */
  private getPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(now.getDate()).padStart(2, '0')}-${String(
      now.getHours(),
    ).padStart(2, '0')}h`;
  }

  /**
   * Retorna todas as anomalias detectadas
   */
  getAnomalies(): AnomalyIndicator[] {
    return this.anomalies;
  }

  /**
   * Retorna anomalias recentes (últimas N)
   */
  getRecentAnomalies(limit = 10): AnomalyIndicator[] {
    return this.anomalies.slice(-limit);
  }

  /**
   * Retorna anomalias por severidade
   */
  getAnomaliesBySeverity(
    severity: 'LOW' | 'MEDIUM' | 'HIGH',
  ): AnomalyIndicator[] {
    return this.anomalies.filter((a) => a.severity === severity);
  }

  /**
   * Gera relatório de anomalias
   */
  generateAnomalyReport(): string {
    const lines = ['🚨 AGENT ANOMALY REPORT', '═'.repeat(40)];

    if (this.anomalies.length === 0) {
      lines.push('✅ No anomalies detected. Agent behaving normally.');
      return lines.join('\n');
    }

    const highSeverity = this.getAnomaliesBySeverity('HIGH');
    const mediumSeverity = this.getAnomaliesBySeverity('MEDIUM');

    if (highSeverity.length > 0) {
      lines.push(`\n🔴 HIGH SEVERITY (${highSeverity.length}):`);
      highSeverity.forEach((a) => {
        lines.push(`  • ${a.description}`);
        lines.push(`    → ${a.suggestedAction}`);
      });
    }

    if (mediumSeverity.length > 0) {
      lines.push(`\n🟡 MEDIUM SEVERITY (${mediumSeverity.length}):`);
      mediumSeverity.forEach((a) => {
        lines.push(`  • ${a.description}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Reseta histórico de anomalias (para testes)
   */
  resetAnomalyHistory(): void {
    this.decisionMetrics.clear();
    this.confidenceHistory = [];
    this.anomalies = [];
    this.logger.warn('Anomaly history reset');
  }
}
