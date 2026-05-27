import { Controller, Get, Post, Delete, Body, Param, Put, Query } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentSchedulerService } from './agent-scheduler.service';
import { AgentRule, AgentConfig, AgentDecision } from './agent.types';
import {
  ValidationRecordDto,
  ValidationResultDto,
} from '../validation/dto/validation.dto';
import { ValidationService } from '../validation/validation.service';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly validationService: ValidationService,
    private readonly schedulerService: AgentSchedulerService,
  ) {}

  /**
   * Obtém configuração atual do agente
   */
  @Get('config')
  getConfig() {
    return this.agentService.getConfig();
  }

  /**
   * Atualiza configuração do agente
   */
  @Put('config')
  updateConfig(@Body() config: Partial<AgentConfig>) {
    return this.agentService.updateConfig(config);
  }

  /**
   * Obtém métricas do agente
   */
  @Get('metrics')
  getMetrics() {
    return this.agentService.getMetrics();
  }

  /**
   * Gera relatório completo do agente
   */
  @Get('report')
  generateReport() {
    return this.agentService.generateReport();
  }

  /**
   * Obtém últimas decisões do agente
   */
  @Get('decisions')
  getDecisions() {
    return this.agentService.getDecisions(50);
  }

  /**
   * Adiciona uma nova regra
   */
  @Post('rules')
  addRule(@Body() rule: AgentRule) {
    return this.agentService.addRule(rule);
  }

  /**
   * Atualiza uma regra existente
   */
  @Put('rules/:ruleId')
  updateRule(
    @Param('ruleId') ruleId: string,
    @Body() updates: Partial<AgentRule>,
  ) {
    return this.agentService.updateRule(ruleId, updates);
  }

  /**
   * Remove uma regra
   */
  @Delete('rules/:ruleId')
  removeRule(@Param('ruleId') ruleId: string) {
    return this.agentService.removeRule(ruleId);
  }

  /**
   * Valida um registro e deixa o agente decidir automaticamente
   */
  @Post('validate')
  validateWithAgent(@Body() record: ValidationRecordDto) {
    // Primeiro valida o registro
    const validation = this.validationService.validate(record);

    // Generate or accept requestId and optional ruleVersion
    const requestId =
      (record as any).requestId ||
      `req-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    const ruleVersion = (record as any).ruleVersion;

    // Depois o agente toma uma decisão
    const agentDecision = this.agentService.evaluateValidation(
      `${record.produto}-${Date.now()}`,
      validation,
      record,
      { requestId, ruleVersion },
    );

    return {
      validation,
      agentDecision,
    };
  }

  /**
   * Processa múltiplos registros com decisão automática do agente
   */
  @Post('batch-validate')
  batchValidateWithAgent(@Body() records: ValidationRecordDto[]) {
    const results: Array<{
      rowIndex: number;
      record: ValidationRecordDto;
      validation: ValidationResultDto;
    }> = [];
    const decisions: AgentDecision[] = [];

    for (let i = 0; i < records.length; i++) {
      const validation = this.validationService.validate(records[i]);
      const requestId =
        (records[i] as any).requestId ||
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
      const ruleVersion = (records[i] as any).ruleVersion;

      const decision = this.agentService.evaluateValidation(
        `record-${i}`,
        validation,
        records[i],
        { requestId, ruleVersion },
      );

      results.push({ rowIndex: i + 1, record: records[i], validation });
      decisions.push(decision);
    }

    return {
      totalRecords: records.length,
      results,
      decisions,
      summary: {
        approved: decisions.filter((d) => d.decision === 'APPROVED').length,
        rejected: decisions.filter((d) => d.decision === 'REJECTED').length,
        flagged: decisions.filter((d) => d.decision === 'FLAGGED').length,
        avgConfidence:
          decisions.reduce((sum, d) => sum + d.confidence, 0) /
          decisions.length,
      },
      agentMetrics: this.agentService.getMetrics(),
    };
  }

  /**
   * Habilita/desabilita o agente
   */
  @Post('toggle')
  toggleAgent() {
    const current = this.agentService.getConfig();
    return this.agentService.updateConfig({
      enabled: !current.enabled,
    });
  }

  /**
   * Reseta métricas do agente (teste)
   */
  @Post('reset-metrics')
  resetMetrics() {
    this.agentService.resetMetrics();
    return { message: 'Métricas resetadas' };
  }

  /**
   * Retorna configuração do scheduler
   */
  @Get('scheduler/config')
  getSchedulerConfig() {
    return this.schedulerService.getScheduleConfig();
  }

  /**
   * Atualiza configuração do scheduler
   */
  @Put('scheduler/config')
  updateSchedulerConfig(
    @Body('enabled') enabled?: boolean,
    @Body('intervalSeconds') intervalSeconds?: number,
  ) {
    return this.schedulerService.updateScheduleConfig({
      enabled,
      intervalSeconds,
    });
  }

  /**
   * Retorna status do scheduler
   */
  @Get('scheduler/status')
  getSchedulerStatus() {
    return this.schedulerService.getStatus();
  }

  /**
   * Retorna histórico persistido de decisões
   */
  @Get('history/persisted')
  getPersistedHistory(
    @Query('limit') limit?: string,
    @Query('decision') decision?: string,
    @Query('status') status?: string,
    @Query('ruleId') ruleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minConfidence') minConfidence?: string,
    @Query('maxConfidence') maxConfidence?: string,
  ) {
    return this.agentService.getPersistedDecisions({
      limit: limit ? Number(limit) : 100,
      decision,
      status,
      ruleId,
      startDate,
      endDate,
      minConfidence: minConfidence ? Number(minConfidence) : undefined,
      maxConfidence: maxConfidence ? Number(maxConfidence) : undefined,
    });
  }

  /**
   * Retorna estatísticas agregadas
   */
  @Get('history/aggregate')
  getAggregateStats() {
    return this.agentService.getAggregateStats();
  }

  /**
   * Retorna tendências de decisões
   */
  @Get('history/trends')
  getDecisionTrends(@Query('days') days?: string) {
    return this.agentService.getDecisionTrends(days ? Number(days) : 7);
  }

  /**
   * Exporta decisões como CSV
   */
  @Get('history/export/csv')
  exportDecisionsCSV(
    @Query('limit') limit?: string,
    @Query('decision') decision?: string,
    @Query('status') status?: string,
    @Query('ruleId') ruleId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minConfidence') minConfidence?: string,
    @Query('maxConfidence') maxConfidence?: string,
  ) {
    const csv = this.agentService.exportDecisionsAsCSV({
      limit: limit ? Number(limit) : undefined,
      decision,
      status,
      ruleId,
      startDate,
      endDate,
      minConfidence: minConfidence ? Number(minConfidence) : undefined,
      maxConfidence: maxConfidence ? Number(maxConfidence) : undefined,
    });
    return {
      format: 'csv',
      data: csv,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Registra feedback do usuário sobre uma decisão
   */
  @Post('feedback/:recordId')
  async recordFeedback(
    @Param('recordId') recordId: string,
    @Body('userAgreement') userAgreement: boolean,
    @Body('comment') comment?: string,
  ) {
    return this.agentService.recordFeedback(recordId, userAgreement, comment);
  }

  /**
   * Analisa comportamento e gera insights de aprendizado
   */
  @Get('learning/analyze')
  analyzeLearning() {
    return this.agentService.analyzeLearning();
  }

  /**
   * Retorna insights de aprendizado
   */
  @Get('learning/insights')
  getLearningInsights() {
    return this.agentService.getLearningInsights();
  }

  /**
   * Retorna recomendações de aprendizado
   */
  @Get('learning/recommendations')
  getLearningRecommendations() {
    return this.agentService.getLearningRecommendations();
  }

  /**
   * Gera relatório completo com elementos de aprendizado
   */
  @Get('learning/report')
  generateLearningReport() {
    return this.agentService.generateLearningReport();
  }
}
