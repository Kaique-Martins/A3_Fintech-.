import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentService } from './agent.service';
import { ValidationService } from '../validation/validation.service';
import { DatabaseService } from '../database/database.service';

export interface ScheduleConfig {
  enabled: boolean;
  intervalSeconds: number;
  lastRun?: string;
  nextRun?: string;
}

@Injectable()
export class AgentSchedulerService {
  private readonly logger = new Logger(AgentSchedulerService.name);
  private scheduleConfig: ScheduleConfig = {
    enabled: true,
    intervalSeconds: 300, // 5 minutes default
  };
  private isRunning = false;

  constructor(
    private readonly agentService: AgentService,
    private readonly validationService: ValidationService,
    private readonly dbService: DatabaseService,
  ) {
    this.updateNextRun();
  }

  /**
   * Auto-reprocessing every 5 minutes
   * Validates pending records and applies agent decisions
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoReprocess() {
    if (!this.scheduleConfig.enabled || this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      this.logger.log('🤖 Agent auto-reprocessing started...');

      // Get aggregate stats from previous decisions
      const stats = await this.dbService.getAggregate();

      // Check if we have pending decisions that need re-evaluation
      const recentDecisions = await this.dbService.queryDecisions({
        limit: 10,
      });

      if (recentDecisions.length > 0) {
        const flaggedCount = recentDecisions.filter(
          (d) => d.decision === 'FLAGGED',
        ).length;
        const avgConfidence = stats.avgConfidence;

        this.logger.log(
          `📊 Processed ${stats.totalDecisions} decisions. ` +
            `Flagged: ${flaggedCount}, Avg Confidence: ${avgConfidence.toFixed(
              2,
            )}%`,
        );
      }

      this.scheduleConfig.lastRun = new Date().toISOString();
      this.updateNextRun();
    } catch (error) {
      this.logger.error('❌ Auto-reprocessing failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Daily report - every day at 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async dailyReport() {
    try {
      this.logger.log('📈 Generating daily agent report...');

      const stats = await this.dbService.getAggregate();
      const trends = await this.dbService.getDecisionTrends(7);

      const report = {
        timestamp: new Date().toISOString(),
        totalDecisions: stats.totalDecisions,
        avgConfidence: stats.avgConfidence.toFixed(2) + '%',
        avgQualityScore: stats.avgQualityScore.toFixed(2) + '%',
        trends: trends,
      };

      this.logger.log(`✅ Daily report: ${JSON.stringify(report)}`);
    } catch (error) {
      this.logger.error('❌ Daily report generation failed:', error);
    }
  }

  /**
   * Get current schedule configuration
   */
  getScheduleConfig(): ScheduleConfig {
    return { ...this.scheduleConfig };
  }

  /**
   * Update schedule configuration
   */
  updateScheduleConfig(config: Partial<ScheduleConfig>): ScheduleConfig {
    this.scheduleConfig = {
      ...this.scheduleConfig,
      ...config,
    };
    this.updateNextRun();
    return this.scheduleConfig;
  }

  /**
   * Calculate next run time
   */
  private updateNextRun(): void {
    const now = new Date();
    const nextRun = new Date(
      now.getTime() + this.scheduleConfig.intervalSeconds * 1000,
    );
    this.scheduleConfig.nextRun = nextRun.toISOString();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      running: this.isRunning,
      enabled: this.scheduleConfig.enabled,
      lastRun: this.scheduleConfig.lastRun,
      nextRun: this.scheduleConfig.nextRun,
      intervalSeconds: this.scheduleConfig.intervalSeconds,
    };
  }
}
