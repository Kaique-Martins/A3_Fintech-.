import { Injectable, Logger } from '@nestjs/common';
import {
  AgentRule,
  AgentConfig,
  AgentMetrics,
  AgentDecision,
  DEFAULT_AGENT_CONFIG,
} from './agent.types';
import {
  ValidationResultDto,
  ValidationRecordDto,
} from '../validation/dto/validation.dto';
import { DatabaseService } from '../database/database.service';
import { LearningService } from './learning.service';
import { AgentFeedbackService } from './services/agent-feedback.service';
import { TrainingEngineService } from '../training/training-engine.service';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    private readonly dbService: DatabaseService,
    private readonly learningService: LearningService,
    private readonly feedbackService: AgentFeedbackService,
    private readonly trainingEngine: TrainingEngineService,
  ) {}

  private agentConfig: AgentConfig = DEFAULT_AGENT_CONFIG;
  private metrics: AgentMetrics = {
    totalProcessed: 0,
    approved: 0,
    rejected: 0,
    flaggedForReview: 0,
    successRate: 0,
    avgProcessingTime: 0,
    rulesApplied: {},
    lastUpdate: new Date().toISOString(),
  };
  private decisions: AgentDecision[] = [];

  /**
   * Processa um resultado de validação através do agente
   */
  evaluateValidation(
    recordId: string,
    validation: ValidationResultDto,
    inputRecord?: ValidationRecordDto,
    context?: { requestId?: string; ruleVersion?: string },
  ): AgentDecision {
    const startTime = Date.now();
    const appliedRules: string[] = [];
    let finalDecision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL' =
      'NEUTRAL';
    const reasonings: string[] = [];

    // Ordena regras por prioridade efetiva = prioridade × peso de feedback
    // Regras com feedback positivo sobem; com negativo, descem
    const sortedRules = [...this.agentConfig.rules]
      .filter((r) => r.enabled)
      .sort((a, b) => {
        const weightA = this.feedbackService.getRuleWeightFactor(a.id);
        const weightB = this.feedbackService.getRuleWeightFactor(b.id);
        return b.priority * weightB - a.priority * weightA;
      });

    // Avalia cada regra
    for (const rule of sortedRules) {
      const ruleMatched = this.evaluateRule(rule, validation);

      if (ruleMatched) {
        appliedRules.push(rule.id);
        this.metrics.rulesApplied[rule.id] =
          (this.metrics.rulesApplied[rule.id] || 0) + 1;

        // Aplica ações da regra
        if (rule.action.autoApprove) {
          finalDecision = 'APPROVED';
          reasonings.push(`✅ ${rule.name}`);
        } else if (rule.action.autoReject) {
          finalDecision = 'REJECTED';
          reasonings.push(`❌ ${rule.name}`);
        } else if (rule.action.flagForReview) {
          if (finalDecision !== 'REJECTED') {
            finalDecision = 'FLAGGED';
          }
          reasonings.push(`🚩 ${rule.name}: ${rule.action.customMessage}`);
        }
      }
    }

    // Se nenhuma regra foi aplicada, usa a decisão padrão
    if (appliedRules.length === 0) {
      if (validation.status === 'QUARENTENA') {
        finalDecision = 'FLAGGED';
        reasonings.push('Validação indicou QUARENTENA - marcado para revisão');
      } else {
        finalDecision = 'APPROVED';
        reasonings.push('Validação OK - aprovado por padrão');
      }
    }

    // ─── Adaptive Response Engine ─────────────────────────────────────────
    // Consulta exemplos treinados antes de finalizar a decisão.
    // Se houver match forte (similarity ≥ STRONG_THRESHOLD), o agente
    // ajusta o comportamento conforme o padrão aprendido.
    let confidenceAfterTraining = validation.confidenceLevel;
    let trainingExampleId: string | undefined;
    try {
      const contextQuery = this.buildTrainingQuery(validation, inputRecord);
      const suggestion = this.trainingEngine.suggestForContext(contextQuery);

      if (suggestion.matched && suggestion.topMatch) {
        confidenceAfterTraining = Math.max(
          0,
          Math.min(100, confidenceAfterTraining + suggestion.confidenceBoost),
        );
        trainingExampleId = suggestion.topMatch.example.id;

        // Match forte sobrescreve a decisão se houver behavior diferente
        if (
          suggestion.influencedByTraining &&
          suggestion.suggestedBehavior &&
          suggestion.suggestedBehavior !== 'CUSTOM' &&
          suggestion.suggestedBehavior !== 'NEUTRAL'
        ) {
          const behaviorMap: Record<string, 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL'> = {
            APPROVE: 'APPROVED',
            REJECT: 'REJECTED',
            FLAG: 'FLAGGED',
            NEUTRAL: 'NEUTRAL',
          };
          const learnedDecision = behaviorMap[suggestion.suggestedBehavior];
          if (learnedDecision && learnedDecision !== finalDecision) {
            this.logger.log(
              `🧠 Treinamento sobrescreveu decisão: ${finalDecision} → ${learnedDecision} (match ${trainingExampleId})`,
            );
            finalDecision = learnedDecision;
          }
        }

        if (suggestion.suggestedReasoning) {
          reasonings.push(`🧠 ${suggestion.suggestedReasoning}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Falha ao consultar training engine: ${(e as Error).message}`);
    }

    // Atualiza métricas
    const processingTime = Date.now() - startTime;
    this.updateMetrics(finalDecision, processingTime);

    const ruleWeights = appliedRules.reduce<Record<string, number>>((acc, ruleId) => {
      acc[ruleId] = this.feedbackService.getRuleWeightFactor(ruleId);
      return acc;
    }, {});

    const decision: AgentDecision = {
      recordId,
      decision: finalDecision,
      confidence: confidenceAfterTraining,
      rulesApplied: trainingExampleId
        ? [...appliedRules, `training:${trainingExampleId}`]
        : appliedRules,
      reasoning: reasonings.join(' | '),
      timestamp: new Date().toISOString(),
      isAuto: appliedRules.length > 0,
      requestId: context?.requestId,
      ruleVersion: context?.ruleVersion,
      ruleWeights,
    };

    this.decisions.push(decision);

    // Persist decision to database (fire-and-forget with error handling)
    // Sanitize inputRecord to avoid leaking internal metadata into persisted input
    let sanitizedInput: any = undefined;
    if (inputRecord) {
      sanitizedInput = { ...inputRecord } as any;
      // Remove internal/metadata fields if present
      delete sanitizedInput.requestId;
      delete sanitizedInput.ruleVersion;
      delete sanitizedInput._meta;
      delete sanitizedInput.__meta;
    }

    const decisionData = {
      recordId,
      decision: finalDecision,
      confidence: validation.confidenceLevel,
      rulesApplied: appliedRules,
      reasoning: reasonings.join(' | '),
      timestamp: new Date().toISOString(),
      isAuto: appliedRules.length > 0,
      processingTimeMs: processingTime,
      agentVersion: '1.0.0',
      requestId: context?.requestId,
      ruleVersion: context?.ruleVersion,
      qualityScore: validation.qualityScore,
      status: validation.status,
      input: sanitizedInput,
      correctedData: validation.dado_corrigido,
    };

    // Use setImmediate to ensure database persistence doesn't block response
    setImmediate(() => {
      this.dbService.saveDecision(decisionData).catch((error) => {
        this.logger.error(
          `Failed to persist decision for record ${recordId}:`,
          error,
        );
      });
    });

    // Mantém apenas últimas 1000 decisões
    if (this.decisions.length > 1000) {
      this.decisions = this.decisions.slice(-1000);
    }

    return decision;
  }

  /**
   * Constrói o texto de query para retrieval no TrainingEngine.
   * Combina informações da validação + input para maximizar similarity match.
   */
  private buildTrainingQuery(
    validation: ValidationResultDto,
    inputRecord?: ValidationRecordDto,
  ): string {
    const parts: string[] = [];
    if (inputRecord?.produto) parts.push(inputRecord.produto);
    if (inputRecord?.categoria) parts.push(inputRecord.categoria);
    if (inputRecord?.cidade) parts.push(inputRecord.cidade);
    parts.push(`status ${validation.status}`);
    parts.push(`quality ${Math.round(validation.qualityScore)}`);
    parts.push(`confidence ${Math.round(validation.confidenceLevel)}`);
    if (validation.alerts?.length) {
      parts.push(validation.alerts.map((a) => `${a.severity} ${a.message ?? ''}`).join(' '));
    }
    if (validation.motivo) parts.push(validation.motivo);
    return parts.filter(Boolean).join(' ');
  }

  /**
   * Avalia se uma regra se aplica ao resultado de validação
   */
  private evaluateRule(
    rule: AgentRule,
    validation: ValidationResultDto,
  ): boolean {
    const fieldValue = this.getFieldValue(rule.condition.field, validation);

    // Return false if field value is null
    if (fieldValue === null) return false;

    switch (rule.condition.operator) {
      case 'lessThan':
        return (
          typeof fieldValue === 'number' &&
          fieldValue < (rule.condition.value as number)
        );
      case 'greaterThan':
        return (
          typeof fieldValue === 'number' &&
          fieldValue > (rule.condition.value as number)
        );
      case 'equals':
        return fieldValue === rule.condition.value;
      case 'contains':
        if (Array.isArray(fieldValue)) {
          return fieldValue.some((item) =>
            String(item).includes(String(rule.condition.value)),
          );
        }
        return String(fieldValue).includes(String(rule.condition.value));
      default:
        return false;
    }
  }

  /**
   * Extrai valor do campo para avaliação de regra
   */
  private getFieldValue(
    field: string,
    validation: ValidationResultDto,
  ): string | number | string[] | null {
    switch (field) {
      case 'price':
        return validation.dado_corrigido.preco;
      case 'quality':
      case 'qualityScore':
        return validation.qualityScore;
      case 'confidence':
      case 'confidenceLevel':
        return validation.confidenceLevel;
      case 'alerts':
        return validation.alerts.map((a) => a.severity);
      case 'status':
        return validation.status;
      default:
        return null;
    }
  }

  /**
   * Atualiza métricas do agente
   */
  private updateMetrics(decision: string, processingTime: number): void {
    this.metrics.totalProcessed++;

    switch (decision) {
      case 'APPROVED':
        this.metrics.approved++;
        break;
      case 'REJECTED':
        this.metrics.rejected++;
        break;
      case 'FLAGGED':
        this.metrics.flaggedForReview++;
        break;
    }

    // Atualiza média de tempo
    this.metrics.avgProcessingTime =
      (this.metrics.avgProcessingTime * (this.metrics.totalProcessed - 1) +
        processingTime) /
      this.metrics.totalProcessed;

    this.metrics.successRate =
      (this.metrics.approved / this.metrics.totalProcessed) * 100;

    this.metrics.lastUpdate = new Date().toISOString();
  }

  /**
   * Atualiza configuração do agente
   */
  updateConfig(newConfig: Partial<AgentConfig>): AgentConfig {
    this.agentConfig = { ...this.agentConfig, ...newConfig };
    return this.agentConfig;
  }

  /**
   * Adiciona uma nova regra
   */
  addRule(rule: AgentRule): AgentConfig {
    this.agentConfig.rules.push(rule);
    return this.agentConfig;
  }

  /**
   * Remove uma regra
   */
  removeRule(ruleId: string): AgentConfig {
    this.agentConfig.rules = this.agentConfig.rules.filter(
      (r) => r.id !== ruleId,
    );
    return this.agentConfig;
  }

  /**
   * Atualiza uma regra existente
   */
  updateRule(ruleId: string, updates: Partial<AgentRule>): AgentConfig {
    const ruleIndex = this.agentConfig.rules.findIndex((r) => r.id === ruleId);
    if (ruleIndex >= 0) {
      this.agentConfig.rules[ruleIndex] = {
        ...this.agentConfig.rules[ruleIndex],
        ...updates,
      };
    }
    return this.agentConfig;
  }

  /**
   * Retorna configuração atual do agente
   */
  getConfig(): AgentConfig {
    return this.agentConfig;
  }

  /**
   * Retorna métricas do agente
   */
  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  /**
   * Retorna últimas decisões do agente
   */
  getDecisions(limit = 50): AgentDecision[] {
    return this.decisions.slice(-limit);
  }

  /**
   * Retorna histórico persistido de decisões
   */
  async getPersistedDecisions(
    query: {
      limit?: number;
      decision?: string;
      status?: string;
      ruleId?: string;
      startDate?: string;
      endDate?: string;
      minConfidence?: number;
      maxConfidence?: number;
    } = {},
  ) {
    return await this.dbService.queryDecisions({
      limit: query.limit,
      decision: query.decision as any,
      status: query.status,
      ruleId: query.ruleId,
      startDate: query.startDate,
      endDate: query.endDate,
      confidenceMin: query.minConfidence,
      confidenceMax: query.maxConfidence,
    });
  }

  /**
   * Retorna estatísticas agregadas do histórico
   */
  async getAggregateStats() {
    return await this.dbService.getAggregate();
  }

  /**
   * Retorna tendências de decisões (últimos N dias)
   */
  getDecisionTrends(days = 7) {
    return this.dbService.getDecisionTrends(days);
  }

  /**
   * Exporta decisões como CSV
   */
  exportDecisionsAsCSV(query?: {
    limit?: number;
    decision?: string;
    status?: string;
    ruleId?: string;
    startDate?: string;
    endDate?: string;
    minConfidence?: number;
    maxConfidence?: number;
  }) {
    return this.dbService.exportAsCSV({
      limit: query?.limit,
      decision: query?.decision as any,
      status: query?.status,
      ruleId: query?.ruleId,
      startDate: query?.startDate,
      endDate: query?.endDate,
      confidenceMin: query?.minConfidence,
      confidenceMax: query?.maxConfidence,
    });
  }

  /**
   * Reseta métricas (para teste)
   */
  resetMetrics(): void {
    this.metrics = {
      totalProcessed: 0,
      approved: 0,
      rejected: 0,
      flaggedForReview: 0,
      successRate: 0,
      avgProcessingTime: 0,
      rulesApplied: {},
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * Gera relatório de performance do agente
   */
  generateReport(): {
    config: AgentConfig;
    metrics: AgentMetrics;
    recentDecisions: AgentDecision[];
    performance: {
      approvalRate: string;
      rejectionRate: string;
      reviewRate: string;
      avgTime: string;
    };
  } {
    const total = this.metrics.totalProcessed || 1;

    return {
      config: this.agentConfig,
      metrics: this.metrics,
      recentDecisions: this.getDecisions(20),
      performance: {
        approvalRate: `${((this.metrics.approved / total) * 100).toFixed(1)}%`,
        rejectionRate: `${((this.metrics.rejected / total) * 100).toFixed(1)}%`,
        reviewRate: `${((this.metrics.flaggedForReview / total) * 100).toFixed(
          1,
        )}%`,
        avgTime: `${this.metrics.avgProcessingTime.toFixed(0)}ms`,
      },
    };
  }

  /**
   * Registra feedback do usuário sobre uma decisão do agente
   */
  async recordFeedback(
    recordId: string,
    userAgreement: boolean,
    comment?: string,
  ): Promise<{ message: string; newWeights: Record<string, number> }> {
    const decision = this.decisions.find((d) => d.recordId === recordId);
    const appliedRules = decision?.rulesApplied ?? [];

    await this.feedbackService.recordFeedback(
      {
        recordId,
        userAgreement,
        userFeedbackText: comment,
        originalDecision: decision?.decision ?? 'NEUTRAL',
        timestamp: new Date().toISOString(),
      },
      appliedRules,
    );

    const newWeights = appliedRules.reduce<Record<string, number>>((acc, ruleId) => {
      acc[ruleId] = this.feedbackService.getRuleWeightFactor(ruleId);
      return acc;
    }, {});

    this.logger.log(
      `Feedback recorded for ${recordId}: ${userAgreement ? 'AGREED' : 'DISAGREED'}`,
    );

    return {
      message: `Feedback registrado. ${appliedRules.length} regra(s) ajustada(s).`,
      newWeights,
    };
  }

  /**
   * Analisa comportamento do agente e gera insights de aprendizado
   */
  analyzeLearning() {
    return this.learningService.analyzeBehavior();
  }

  /**
   * Retorna insights de aprendizado
   */
  getLearningInsights() {
    return this.learningService.getInsights();
  }

  /**
   * Retorna recomendações de aprendizado
   */
  getLearningRecommendations() {
    return this.learningService.getRecommendations();
  }

  /**
   * Gera relatório completo com elementos de aprendizado
   */
  generateLearningReport() {
    return this.learningService.generateReport();
  }
}
