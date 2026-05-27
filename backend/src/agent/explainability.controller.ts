import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { DecisionExplanationService } from './services/decision-explanation.service';
import { AgentFeedbackService } from './services/agent-feedback.service';
import { AgentEvolutionService } from './services/agent-evolution.service';
import { AgentAnomalyDetectorService } from './services/agent-anomaly-detector.service';
import { DatabaseService } from '../database/database.service';
import { UserFeedback, AgentReasoningQuery } from './agent-explanation.types';
import { AgentService } from './agent.service';

@Controller('agent/explainability')
export class ExplainabilityController {
  private readonly logger = new Logger(ExplainabilityController.name);

  constructor(
    private readonly explanationService: DecisionExplanationService,
    private readonly feedbackService: AgentFeedbackService,
    private readonly evolutionService: AgentEvolutionService,
    private readonly anomalyDetector: AgentAnomalyDetectorService,
    private readonly dbService: DatabaseService,
    private readonly agentService: AgentService,
  ) {}

  /**
   * GET /api/agent/explainability/feedback
   * Retorna histórico de feedback do usuário
   */
  @Get('feedback')
  getFeedbackHistory() {
    return {
      success: true,
      data: {
        feedbacks: this.feedbackService.getFeedbackHistory(),
        agreementRate: this.feedbackService.getUserAgreementRate(),
        report: this.feedbackService.generateLearningReport(),
      },
    };
  }

  /**
   * POST /api/agent/explainability/feedback
   * Registra feedback do usuário sobre uma decisão
   */
  @Post('feedback')
  async recordFeedback(
    @Body()
    body: {
      recordId: string;
      originalDecision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
      userAgreement: boolean;
      appliedRules: string[];
      userFeedbackText?: string;
      suggestedDecision?: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
    },
  ) {
    const feedback: UserFeedback = {
      recordId: body.recordId,
      originalDecision: body.originalDecision,
      userAgreement: body.userAgreement,
      userFeedbackText: body.userFeedbackText,
      suggestedDecision: body.suggestedDecision,
      timestamp: new Date().toISOString(),
    };

    await this.feedbackService.recordFeedback(feedback, body.appliedRules);

    return {
      success: true,
      message: `Feedback recorded: ${
        body.userAgreement ? 'AGREED' : 'DISAGREED'
      }`,
      data: {
        agreementRate: this.feedbackService.getUserAgreementRate(),
      },
    };
  }

  /**
   * GET /api/agent/explainability/evolution
   * Retorna histórico de evolução do agent
   */
  @Get('evolution')
  getEvolution() {
    const latest = this.evolutionService.getLatestEvolution();
    const recentDecisions = latest
      ? this.dbService.getDecisions({ limit: 20 })
      : Promise.resolve([]);

    return Promise.resolve(recentDecisions).then((decisions) => ({
      success: true,
      data: {
        evolutionHistory: this.evolutionService.getEvolutionHistory(),
        latestMetrics: latest
          ? { ...latest, recentDecisions: decisions }
          : latest,
        report: this.evolutionService.generateEvolutionReport(),
      },
    }));
  }

  /**
   * POST /api/agent/explainability/evolution/checkpoint
   * Registra um ponto de evolução atual
   */
  @Post('evolution/checkpoint')
  recordEvolutionCheckpoint(
    @Body()
    body: {
      decisionCount: number;
    },
  ) {
    this.evolutionService.recordEvolutionPoint(
      body.decisionCount,
      this.feedbackService.getAllRuleWeightHistories(),
    );

    return {
      success: true,
      message: 'Evolution checkpoint recorded',
      data: this.evolutionService.getLatestEvolution(),
    };
  }

  /**
   * GET /api/agent/explainability/anomalies
   * Retorna anomalias detectadas no comportamento do agent
   */
  @Get('anomalies')
  getAnomalies() {
    // Also include recent persisted decisions that contain corrected data
    return this.dbService
      .getDecisions({ limit: 50 })
      .then((decisions) => {
        const correctedRecords = (decisions || [])
          .filter((d) => d.correctedData && Object.keys(d.correctedData).length > 0)
          .slice(-20)
          .map((d) => ({
            id: d.id,
            recordId: d.recordId,
            requestId: d.requestId,
            ruleVersion: d.ruleVersion,
            timestamp: d.timestamp,
            correctedData: d.correctedData,
            originalInput: d.input || {},
            motivo: d.reasoning || d.status || '',
          }));

        return {
          success: true,
          data: {
            anomalies: this.anomalyDetector.getRecentAnomalies(20),
            highSeverity: this.anomalyDetector.getAnomaliesBySeverity('HIGH'),
            mediumSeverity: this.anomalyDetector.getAnomaliesBySeverity('MEDIUM'),
            report: this.anomalyDetector.generateAnomalyReport(),
            correctedRecords,
          },
        };
      });
  }

  /**
   * GET /api/agent/explainability/insights
   * Retorna insights consolidados sobre o agent
   */
  @Get('insights')
  getInsights() {
    const feedbackReport = this.feedbackService.generateLearningReport();
    const evolutionMetrics = this.evolutionService.getLatestEvolution();
    const anomalies = this.anomalyDetector.getRecentAnomalies(5);

    return {
      success: true,
      data: {
        feedback: feedbackReport,
        evolution: evolutionMetrics,
        anomalies: anomalies,
        summary: {
          agentHealthScore: this.calculateHealthScore(
            feedbackReport.agreementRate,
            anomalies.length,
          ),
          recommendation: this.generateRecommendation(
            feedbackReport.agreementRate,
            anomalies,
          ),
        },
      },
    };
  }

  /**
   * POST /api/agent/explainability/reasoning
   * Responde perguntas sobre decisões do agent
   */
  @Post('reasoning')
  answerReasoningQuery(
    @Body()
    body: {
      recordId?: string;
      queryType: 'WHY_DECISION' | 'HYPOTHETICAL' | 'RULE_COMPARISON';
      hypotheticalChanges?: { field: string; newValue: any }[];
      compareWithTimestamp?: string;
    },
  ) {
    // Try to find the persisted decision by recordId; fallback to latest
    return this.dbService.getDecisions({ limit: 200 }).then((decisions) => {
      let target: any = null;
      if (body.recordId) {
        target = decisions.find((d) => d.recordId === body.recordId);
      }
      if (!target && decisions.length > 0) {
        target = decisions[decisions.length - 1];
      }

      if (!target) {
        return {
          success: false,
          message: 'No persisted decisions available to explain',
        };
      }

      // Get agent rules and map applied rule ids to full rule objects
      const agentRules = this.agentService.getConfig().rules || [];
      const appliedRules = agentRules.filter((r) =>
        (target.rulesApplied || []).includes(r.id),
      );

      // Build a simple ruleScores map (uniform weights based on priority)
      const ruleScores = new Map<string, number>();
      appliedRules.forEach((r) => {
        ruleScores.set(r.id, Math.min(100, (r.priority || 1) * 10));
      });

      const explanation = this.explanationService.generateExplanation(
        target.recordId,
        target.decision,
        target.confidence,
        appliedRules,
        target.input ? target.input : {},
        ruleScores,
      );

      return {
        success: true,
        data: {
          query: body,
          explanation,
          naturalLanguage: this.explanationService.formatForDisplay(explanation),
        },
      };
    });
  }

  /**
   * Calcula score de saúde do agent
   */
  private calculateHealthScore(
    agreementRate: number,
    anomalyCount: number,
  ): number {
    const agreementScore = agreementRate;
    const anomalyScore = Math.max(0, 100 - anomalyCount * 10);
    return Math.round((agreementScore + anomalyScore) / 2);
  }

  /**
   * Gera recomendação baseada em estado do agent
   */
  private generateRecommendation(
    agreementRate: number,
    anomalies: any[],
  ): string {
    if (agreementRate < 70) {
      return '⚠️ Agent agreement rate low - consider reviewing rule weights or retraining';
    }
    if (anomalies.some((a) => a.severity === 'HIGH')) {
      return '🚨 High severity anomalies detected - immediate review recommended';
    }
    if (agreementRate > 90) {
      return '✅ Agent performing well - continue monitoring';
    }
    return '📊 Agent operating normally - monitor for changes';
  }
}
