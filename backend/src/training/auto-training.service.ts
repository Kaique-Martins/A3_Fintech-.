import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TrainingMemoryService } from './training-memory.service';
import { TrainingRankingService } from './training-ranking.service';
import { TrainingEngineService } from './training-engine.service';
import {
  TrainingExample,
  ExpectedBehavior,
} from './training.types';
import { randomUUID } from 'crypto';

export interface AutoTrainEvent {
  id: string;
  timestamp: string;
  type:
    | 'CYCLE_START'
    | 'EXAMPLE_CREATED'
    | 'EXAMPLE_REINFORCED'
    | 'EXAMPLE_PENALIZED'
    | 'CYCLE_END'
    | 'SKIPPED';
  message: string;
  exampleId?: string;
  cluster?: {
    decision: string;
    samples: number;
    avgQuality: number;
    avgConfidence: number;
    representativeProduct?: string;
  };
}

export interface AutoTrainStatus {
  enabled: boolean;
  intervalMs: number;
  totalCycles: number;
  examplesCreated: number;
  examplesReinforced: number;
  examplesPenalized: number;
  lastCycleAt?: string;
  nextCycleAt?: string;
  isRunningCycle: boolean;
  recentEvents: AutoTrainEvent[];
}

interface DecisionCluster {
  signature: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  status: string;
  qualityBucket: string;
  members: any[];
  avgQuality: number;
  avgConfidence: number;
  representativeText: string;
  matchedExampleId?: string;
  inconsistency: number; // 0-1, fração de decisões "divergentes" no mesmo grupo
}

/**
 * AutoTrainingService — Self-Supervised Pattern Mining
 *
 * Lê o histórico de decisões reais do agente e gera/reforça exemplos
 * automaticamente, sem precisar de input humano. Conceitos aplicados:
 *   - Self-supervised learning: o próprio output do agente vira ground-truth
 *   - Cluster mining: decisões similares agrupadas viram um exemplo
 *   - Active reinforcement: clusters consistentes ganham positiveCount;
 *     clusters inconsistentes (decisões divergentes) ganham negativeCount
 *   - Continuous learning: scheduler dispara ciclos periódicos
 */
@Injectable()
export class AutoTrainingService implements OnModuleInit {
  private readonly logger = new Logger(AutoTrainingService.name);

  private enabled = false;
  private intervalMs = 15000; // 15s padrão
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunningCycle = false;
  private totalCycles = 0;
  private examplesCreated = 0;
  private examplesReinforced = 0;
  private examplesPenalized = 0;
  private lastCycleAt?: string;
  private recentEvents: AutoTrainEvent[] = [];

  // Parâmetros do algoritmo
  private readonly MIN_CLUSTER_SIZE = 2;          // mínimo de decisões para virar exemplo
  private readonly RECENT_DECISIONS_LIMIT = 100;  // janela de análise
  private readonly SIMILARITY_REINFORCE_THRESHOLD = 0.55; // sim com exemplo existente
  private readonly STRONG_CONFIDENCE = 75;        // % para considerar decisão "boa"

  constructor(
    private readonly db: DatabaseService,
    private readonly memory: TrainingMemoryService,
    private readonly ranking: TrainingRankingService,
    private readonly engine: TrainingEngineService,
  ) {}

  onModuleInit() {
    this.logger.log('AutoTrainingService inicializado (estado: paused)');
  }

  // ─── Public API ────────────────────────────────────────────────────────

  getStatus(): AutoTrainStatus {
    return {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      totalCycles: this.totalCycles,
      examplesCreated: this.examplesCreated,
      examplesReinforced: this.examplesReinforced,
      examplesPenalized: this.examplesPenalized,
      lastCycleAt: this.lastCycleAt,
      nextCycleAt: this.enabled && this.lastCycleAt
        ? new Date(new Date(this.lastCycleAt).getTime() + this.intervalMs).toISOString()
        : undefined,
      isRunningCycle: this.isRunningCycle,
      recentEvents: [...this.recentEvents].slice(0, 30),
    };
  }

  setEnabled(enabled: boolean, intervalMs?: number): AutoTrainStatus {
    if (intervalMs && intervalMs >= 3000) this.intervalMs = intervalMs;

    if (enabled && !this.enabled) {
      this.enabled = true;
      this.scheduleNext();
      this.pushEvent({
        type: 'CYCLE_START',
        message: `🚀 Auto-Training ATIVADO (intervalo ${this.intervalMs / 1000}s)`,
      });
      // dispara primeiro ciclo já
      this.runCycle().catch((e) => this.logger.error(e));
    } else if (!enabled && this.enabled) {
      this.enabled = false;
      if (this.intervalHandle) clearTimeout(this.intervalHandle);
      this.intervalHandle = null;
      this.pushEvent({
        type: 'SKIPPED',
        message: '⏸ Auto-Training PAUSADO pelo usuário',
      });
    }

    return this.getStatus();
  }

  async triggerCycleNow(): Promise<AutoTrainStatus> {
    if (!this.isRunningCycle) await this.runCycle();
    return this.getStatus();
  }

  // ─── Core Loop ─────────────────────────────────────────────────────────

  private scheduleNext(): void {
    if (this.intervalHandle) clearTimeout(this.intervalHandle);
    this.intervalHandle = setTimeout(() => {
      if (this.enabled) {
        this.runCycle()
          .catch((e) => this.logger.error('Cycle error:', e))
          .finally(() => {
            if (this.enabled) this.scheduleNext();
          });
      }
    }, this.intervalMs);
  }

  private async runCycle(): Promise<void> {
    if (this.isRunningCycle) return;
    this.isRunningCycle = true;
    this.totalCycles += 1;
    const cycleId = this.totalCycles;

    try {
      this.pushEvent({
        type: 'CYCLE_START',
        message: `🔁 Ciclo #${cycleId} iniciado`,
      });

      // 1. Recupera últimas decisões persistidas
      const decisions = await this.db.getDecisions({
        limit: this.RECENT_DECISIONS_LIMIT,
      });

      if (!decisions || decisions.length < this.MIN_CLUSTER_SIZE) {
        this.pushEvent({
          type: 'SKIPPED',
          message: `⚠️ Apenas ${decisions?.length ?? 0} decisões disponíveis (mínimo ${this.MIN_CLUSTER_SIZE}). Aguardando dados.`,
        });
        return;
      }

      // 2. Agrupa em clusters de padrões similares
      const clusters = this.buildClusters(decisions);

      let createdThisCycle = 0;
      let reinforcedThisCycle = 0;
      let penalizedThisCycle = 0;

      // 3. Para cada cluster, decide: criar novo, reforçar existente, ou penalizar
      for (const cluster of clusters) {
        if (cluster.members.length < this.MIN_CLUSTER_SIZE) continue;

        // 3a. Procura exemplo similar já existente
        const existingMatch = this.findSimilarExisting(cluster);

        if (existingMatch) {
          // Cluster bate com exemplo já cadastrado: reforça ou penaliza
          const example = existingMatch;
          const sameDecision =
            example.expectedBehavior === this.decisionToBehavior(cluster.decision);

          if (sameDecision && cluster.inconsistency < 0.3) {
            // Cluster consistente confirmando exemplo: reforço positivo
            example.positiveCount += 1;
            example.confidence = this.ranking.computeConfidence(
              example.positiveCount,
              example.negativeCount,
            );
            example.appliedCount += 1;
            example.lastUsedAt = new Date().toISOString();
            example.updatedAt = new Date().toISOString();
            this.memory.saveExample(example);
            this.examplesReinforced += 1;
            reinforcedThisCycle += 1;
            this.pushEvent({
              type: 'EXAMPLE_REINFORCED',
              message: `👍 Exemplo reforçado: "${this.truncate(example.idealQuestion, 50)}" (+1 pos, ${cluster.members.length} amostras)`,
              exampleId: example.id,
              cluster: this.clusterMeta(cluster),
            });
          } else if (!sameDecision || cluster.inconsistency > 0.5) {
            // Cluster contradiz o exemplo ou é inconsistente: penalidade leve
            example.negativeCount += 1;
            example.confidence = this.ranking.computeConfidence(
              example.positiveCount,
              example.negativeCount,
            );
            example.updatedAt = new Date().toISOString();
            this.memory.saveExample(example);
            this.examplesPenalized += 1;
            penalizedThisCycle += 1;
            this.pushEvent({
              type: 'EXAMPLE_PENALIZED',
              message: `👎 Padrão divergente em "${this.truncate(example.idealQuestion, 50)}" (inconsistência ${Math.round(cluster.inconsistency * 100)}%)`,
              exampleId: example.id,
              cluster: this.clusterMeta(cluster),
            });
          }
        } else if (cluster.inconsistency < 0.4 && cluster.avgConfidence >= 50) {
          // Cluster consistente e confiante mas SEM exemplo: cria automaticamente
          const newExample = this.synthesizeExample(cluster);
          this.examplesCreated += 1;
          createdThisCycle += 1;
          this.pushEvent({
            type: 'EXAMPLE_CREATED',
            message: `✨ Novo padrão detectado: "${this.truncate(newExample.idealQuestion, 60)}" (${cluster.members.length} amostras, behavior ${this.decisionToBehavior(cluster.decision)})`,
            exampleId: newExample.id,
            cluster: this.clusterMeta(cluster),
          });
        }
      }

      this.lastCycleAt = new Date().toISOString();
      this.pushEvent({
        type: 'CYCLE_END',
        message: `✅ Ciclo #${cycleId} concluído — ${createdThisCycle} criados, ${reinforcedThisCycle} reforçados, ${penalizedThisCycle} penalizados`,
      });
    } finally {
      this.isRunningCycle = false;
    }
  }

  // ─── Clustering ─────────────────────────────────────────────────────────

  /**
   * Agrupa decisões por (decision + status + faixa de qualidade).
   * Decisões divergentes dentro do mesmo grupo elevam o índice de inconsistência.
   */
  private buildClusters(decisions: any[]): DecisionCluster[] {
    // Agrupa por signature
    const groups = new Map<string, any[]>();

    for (const d of decisions) {
      const qBucket = this.qualityBucket(d.qualityScore ?? 0);
      const productKey = this.productKey(d.input?.produto ?? '');
      const sig = `${productKey}|${d.status ?? 'NA'}|${qBucket}`;
      if (!groups.has(sig)) groups.set(sig, []);
      groups.get(sig)!.push(d);
    }

    // Constrói clusters resolvendo conflitos
    const clusters: DecisionCluster[] = [];
    for (const [signature, members] of groups) {
      const decisionCounts: Record<string, number> = {};
      for (const m of members) {
        decisionCounts[m.decision] = (decisionCounts[m.decision] || 0) + 1;
      }
      const sortedDecisions = Object.entries(decisionCounts).sort((a, b) => b[1] - a[1]);
      const [topDecision, topCount] = sortedDecisions[0];
      const inconsistency = 1 - topCount / members.length;

      const avgQuality =
        members.reduce((s, m) => s + (m.qualityScore ?? 0), 0) / members.length;
      const avgConfidence =
        members.reduce((s, m) => s + (m.confidence ?? 0), 0) / members.length;

      // Pega produto representativo (primeiro do cluster)
      const representativeProduct = members[0]?.input?.produto ?? '';
      const representativeText = this.buildRepresentativeText(members);

      clusters.push({
        signature,
        decision: topDecision as any,
        status: members[0]?.status ?? 'unknown',
        qualityBucket: this.qualityBucket(avgQuality),
        members,
        avgQuality,
        avgConfidence,
        representativeText,
        inconsistency,
      });
    }

    return clusters.sort((a, b) => b.members.length - a.members.length);
  }

  private qualityBucket(q: number): string {
    if (q >= 85) return 'HIGH';
    if (q >= 60) return 'MID';
    if (q >= 30) return 'LOW';
    return 'BAD';
  }

  /**
   * Normaliza o produto para uma "chave" que junta variações.
   * "Notebook Dell Inspiron 15" e "Notebook Dell Inspiron 13" viram ambos "notebook dell".
   */
  private productKey(produto: string): string {
    if (!produto) return 'unknown';
    const tokens = this.memory.tokenize(produto);
    return tokens.slice(0, 2).join(' ') || 'unknown';
  }

  private buildRepresentativeText(members: any[]): string {
    const products = [...new Set(members.map((m) => m.input?.produto).filter(Boolean))].slice(0, 3);
    const categorias = [...new Set(members.map((m) => m.input?.categoria).filter(Boolean))].slice(0, 2);
    const cidades = [...new Set(members.map((m) => m.input?.cidade).filter(Boolean))].slice(0, 2);
    return [...products, ...categorias, ...cidades].join(' ');
  }

  // ─── Synthesis ──────────────────────────────────────────────────────────

  /**
   * Encontra exemplo existente similar ao cluster (cosine sim).
   * Permite reforço/penalidade adaptativos.
   */
  private findSimilarExisting(cluster: DecisionCluster): TrainingExample | null {
    const examples = this.memory.getAllExamples();
    if (examples.length === 0) return null;

    const { embedding, norm } = this.memory.buildEmbedding(cluster.representativeText);
    let best: { ex: TrainingExample; sim: number } | null = null;

    for (const ex of examples) {
      const sim = this.memory.cosineSimilarity(embedding, norm, ex.embedding, ex.embeddingNorm);
      if (sim >= this.SIMILARITY_REINFORCE_THRESHOLD && (!best || sim > best.sim)) {
        best = { ex, sim };
      }
    }

    return best?.ex ?? null;
  }

  /**
   * Cria um TrainingExample sintético a partir de um cluster.
   */
  private synthesizeExample(cluster: DecisionCluster): TrainingExample {
    const behavior = this.decisionToBehavior(cluster.decision);
    const sample = cluster.members[0];
    const product = sample.input?.produto ?? 'item';
    const categoria = sample.input?.categoria ?? '';
    const qLabel = this.qualityLabel(cluster.qualityBucket);

    const idealQuestion = `${product}${categoria ? ` (categoria ${categoria})` : ''}, qualidade ${qLabel}, status ${cluster.status}`;
    const idealAnswer = this.synthesizeAnswer(cluster);

    const keywords = [
      ...new Set([
        ...this.memory.tokenize(product),
        ...this.memory.tokenize(categoria),
        cluster.status?.toLowerCase(),
        cluster.qualityBucket.toLowerCase(),
      ].filter(Boolean) as string[]),
    ].slice(0, 8);

    const corpus = [idealQuestion, idealAnswer, cluster.representativeText, ...keywords].join(' ');
    const { embedding, norm } = this.memory.buildEmbedding(corpus, keywords);

    // Seed initial confidence baseada no tamanho do cluster e consistência
    const seedPositive = Math.min(10, Math.max(1, cluster.members.length - 1));
    const example: TrainingExample = {
      id: `auto-${randomUUID().slice(0, 8)}`,
      idealQuestion,
      idealAnswer,
      expectedBehavior: behavior,
      context: `Padrão auto-detectado em ${cluster.members.length} decisões similares — consistência ${Math.round((1 - cluster.inconsistency) * 100)}%, qualidade média ${Math.round(cluster.avgQuality)}%, confiança média ${Math.round(cluster.avgConfidence)}%.`,
      keywords,
      embedding,
      embeddingNorm: norm,
      positiveCount: seedPositive,
      negativeCount: 0,
      confidence: this.ranking.computeConfidence(seedPositive, 0),
      priorityBoost: 0,
      appliedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['auto-trained'],
    };

    this.memory.saveExample(example);
    return example;
  }

  private synthesizeAnswer(cluster: DecisionCluster): string {
    const behavior = this.decisionToBehavior(cluster.decision);
    const consistency = Math.round((1 - cluster.inconsistency) * 100);
    const action = {
      APPROVE: 'aprovar automaticamente',
      REJECT:  'rejeitar automaticamente',
      FLAG:    'marcar para revisão manual',
      NEUTRAL: 'manter sem ação direta',
      CUSTOM:  'aplicar fluxo customizado',
    }[behavior];
    return `Histórico mostra que em ${cluster.members.length} casos similares (consistência ${consistency}%, qualidade ~${Math.round(cluster.avgQuality)}%), o agente deve ${action}.`;
  }

  private decisionToBehavior(decision: string): ExpectedBehavior {
    switch (decision) {
      case 'APPROVED': return 'APPROVE';
      case 'REJECTED': return 'REJECT';
      case 'FLAGGED':  return 'FLAG';
      default:         return 'NEUTRAL';
    }
  }

  private qualityLabel(bucket: string): string {
    return { HIGH: 'alta (≥85%)', MID: 'média (60–85%)', LOW: 'baixa (30–60%)', BAD: 'crítica (<30%)' }[bucket] ?? bucket;
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  private pushEvent(partial: Omit<AutoTrainEvent, 'id' | 'timestamp'>): void {
    const ev: AutoTrainEvent = {
      id: `ev-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    this.recentEvents.unshift(ev);
    if (this.recentEvents.length > 200) this.recentEvents = this.recentEvents.slice(0, 200);
    this.logger.log(ev.message);
  }

  private clusterMeta(c: DecisionCluster): AutoTrainEvent['cluster'] {
    return {
      decision: c.decision,
      samples: c.members.length,
      avgQuality: Math.round(c.avgQuality),
      avgConfidence: Math.round(c.avgConfidence),
      representativeProduct: c.members[0]?.input?.produto,
    };
  }

  private truncate(s: string, n: number): string {
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  // engine getter (unused but documents wiring) — keeps DI happy
  private _engineRef() { return this.engine; }
}
