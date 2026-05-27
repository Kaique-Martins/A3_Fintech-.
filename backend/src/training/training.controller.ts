import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TrainingEngineService } from './training-engine.service';
import { TrainingFeedbackService } from './training-feedback.service';
import { TrainingAnalyticsService } from './training-analytics.service';
import { AutoTrainingService } from './auto-training.service';
import {
  CreateExampleDto,
  FeedbackDto,
} from './training.types';

/**
 * TrainingController
 *
 * Endpoints:
 *  POST   /api/training/examples          → cadastra novo exemplo
 *  GET    /api/training/examples          → lista todos
 *  PATCH  /api/training/examples/:id      → edita / ajusta priorityBoost
 *  DELETE /api/training/examples/:id      → remove
 *  POST   /api/training/feedback          → registra 👍 / 👎
 *  GET    /api/training/feedback          → últimos feedbacks
 *  GET    /api/training/analytics         → dashboard completo
 *  GET    /api/training/quick-stats       → snapshot leve
 *  GET    /api/training/match?q=...       → playground (testa retrieval)
 *  POST   /api/training/suggest           → adaptive response engine
 */
@Controller('training')
export class TrainingController {
  constructor(
    private readonly engine: TrainingEngineService,
    private readonly feedback: TrainingFeedbackService,
    private readonly analytics: TrainingAnalyticsService,
    private readonly autoTrain: AutoTrainingService,
  ) {}

  // ── Examples ────────────────────────────────────────────────────────

  @Post('examples')
  createExample(@Body() dto: CreateExampleDto) {
    this.validateExampleDto(dto);
    return this.engine.createExample(dto);
  }

  @Get('examples')
  listExamples() {
    return this.engine['memory'].getAllExamples();
  }

  @Patch('examples/:id')
  updateExample(
    @Param('id') id: string,
    @Body() patch: Partial<CreateExampleDto> & { priorityBoost?: number },
  ) {
    const updated = this.engine.updateExample(id, patch);
    if (!updated) throw new HttpException('Exemplo não encontrado', HttpStatus.NOT_FOUND);
    return updated;
  }

  @Delete('examples/:id')
  deleteExample(@Param('id') id: string) {
    const ok = this.engine.deleteExample(id);
    if (!ok) throw new HttpException('Exemplo não encontrado', HttpStatus.NOT_FOUND);
    return { message: 'Removido', id };
  }

  // ── Feedback ────────────────────────────────────────────────────────

  @Post('feedback')
  recordFeedback(@Body() dto: FeedbackDto) {
    if (!dto.rating || (dto.rating !== 'positive' && dto.rating !== 'negative')) {
      throw new HttpException(
        'rating deve ser "positive" ou "negative"',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.feedback.recordFeedback(dto);
  }

  @Get('feedback')
  listFeedback(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 50;
    return this.feedback.getRecentFeedback(isNaN(n) ? 50 : n);
  }

  // ── Analytics ───────────────────────────────────────────────────────

  @Get('analytics')
  getAnalytics() {
    return this.analytics.computeAnalytics(true);
  }

  @Get('quick-stats')
  quickStats() {
    return this.analytics.quickStats();
  }

  // ── Playground / Retrieval ──────────────────────────────────────────

  @Get('match')
  match(@Query('q') q?: string, @Query('topK') topK?: string) {
    if (!q || q.trim().length === 0) {
      throw new HttpException('Parâmetro q é obrigatório', HttpStatus.BAD_REQUEST);
    }
    const k = topK ? parseInt(topK, 10) : 5;
    return this.engine.findRelevantExamples(q, isNaN(k) ? 5 : k);
  }

  @Post('suggest')
  suggest(@Body() body: { query: string }) {
    if (!body?.query) {
      throw new HttpException('query é obrigatório', HttpStatus.BAD_REQUEST);
    }
    return this.engine.suggestForContext(body.query);
  }

  // ── Auto-Training ───────────────────────────────────────────────────

  @Get('auto/status')
  autoStatus() {
    return this.autoTrain.getStatus();
  }

  @Post('auto/toggle')
  autoToggle(@Body() body: { enabled: boolean; intervalMs?: number }) {
    if (typeof body?.enabled !== 'boolean') {
      throw new HttpException('enabled (bool) é obrigatório', HttpStatus.BAD_REQUEST);
    }
    return this.autoTrain.setEnabled(body.enabled, body.intervalMs);
  }

  @Post('auto/run-now')
  async autoRunNow() {
    return await this.autoTrain.triggerCycleNow();
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private validateExampleDto(dto: CreateExampleDto): void {
    if (!dto?.idealQuestion?.trim()) {
      throw new HttpException('idealQuestion é obrigatório', HttpStatus.BAD_REQUEST);
    }
    if (!dto?.idealAnswer?.trim()) {
      throw new HttpException('idealAnswer é obrigatório', HttpStatus.BAD_REQUEST);
    }
    if (!['APPROVE', 'REJECT', 'FLAG', 'NEUTRAL', 'CUSTOM'].includes(dto.expectedBehavior)) {
      throw new HttpException(
        'expectedBehavior inválido',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
