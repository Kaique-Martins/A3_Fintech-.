import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TrainingMemoryService } from './training-memory.service';
import { TrainingRankingService } from './training-ranking.service';
import {
  TrainingExample,
  CreateExampleDto,
  MatchResult,
  AdaptiveResponseSuggestion,
  ExpectedBehavior,
} from './training.types';

/**
 * TrainingEngineService
 *
 * Núcleo do sistema de aprendizado contínuo. Responsabilidades:
 *   1. Indexar novos exemplos (gera embedding TF-IDF e seed confidence)
 *   2. Recuperar exemplos relevantes por similarity (vector retrieval)
 *   3. Produzir AdaptiveResponseSuggestion que o AgentService consome
 *      para enviesar a decisão final (adaptive response engine)
 */
@Injectable()
export class TrainingEngineService {
  private readonly logger = new Logger(TrainingEngineService.name);

  private readonly INFLUENCE_THRESHOLD = 0.18; // mínimo de similarity para influenciar
  private readonly STRONG_MATCH_THRESHOLD = 0.45;

  constructor(
    private readonly memory: TrainingMemoryService,
    private readonly ranking: TrainingRankingService,
  ) {}

  // ─── Lifecycle de exemplos ─────────────────────────────────────────────────

  createExample(dto: CreateExampleDto): TrainingExample {
    const now = new Date().toISOString();
    const corpus = [
      dto.idealQuestion,
      dto.idealAnswer,
      dto.context ?? '',
      ...(dto.keywords ?? []),
    ].join(' ');

    const { embedding, norm } = this.memory.buildEmbedding(
      corpus,
      dto.keywords ?? [],
    );

    const example: TrainingExample = {
      id: `ex-${randomUUID().slice(0, 8)}`,
      idealQuestion: dto.idealQuestion,
      idealAnswer: dto.idealAnswer,
      expectedBehavior: dto.expectedBehavior,
      context: dto.context ?? '',
      keywords: dto.keywords ?? [],
      embedding,
      embeddingNorm: norm,
      positiveCount: 0,
      negativeCount: 0,
      confidence: this.ranking.computeConfidence(0, 0), // seed 50%
      priorityBoost: 0,
      appliedCount: 0,
      createdAt: now,
      updatedAt: now,
      tags: dto.tags ?? [],
    };

    this.memory.saveExample(example);
    this.logger.log(`Novo exemplo indexado: ${example.id} (${dto.idealQuestion.slice(0, 40)}...)`);
    return example;
  }

  updateExample(id: string, patch: Partial<CreateExampleDto> & { priorityBoost?: number }): TrainingExample | null {
    const existing = this.memory.getExampleById(id);
    if (!existing) return null;

    const updated: TrainingExample = {
      ...existing,
      idealQuestion: patch.idealQuestion ?? existing.idealQuestion,
      idealAnswer: patch.idealAnswer ?? existing.idealAnswer,
      expectedBehavior: patch.expectedBehavior ?? existing.expectedBehavior,
      context: patch.context ?? existing.context,
      keywords: patch.keywords ?? existing.keywords,
      tags: patch.tags ?? existing.tags,
      priorityBoost: patch.priorityBoost ?? existing.priorityBoost,
      updatedAt: new Date().toISOString(),
    };

    // Re-indexa se conteúdo textual mudou
    if (patch.idealQuestion || patch.idealAnswer || patch.context || patch.keywords) {
      const corpus = [
        updated.idealQuestion,
        updated.idealAnswer,
        updated.context,
        ...updated.keywords,
      ].join(' ');
      const { embedding, norm } = this.memory.buildEmbedding(corpus, updated.keywords);
      updated.embedding = embedding;
      updated.embeddingNorm = norm;
    }

    this.memory.saveExample(updated);
    return updated;
  }

  deleteExample(id: string): boolean {
    return this.memory.deleteExample(id);
  }

  // ─── Retrieval / Matching ──────────────────────────────────────────────────

  /**
   * Busca exemplos relevantes para uma query arbitrária.
   * Aplica cosine similarity + ranking adaptativo.
   */
  findRelevantExamples(query: string, topK = 5): MatchResult[] {
    const { embedding: qEmb, norm: qNorm } = this.memory.buildEmbedding(query);
    const examples = this.memory.getAllExamples();

    const matches: MatchResult[] = examples.map((ex) => {
      const sim = this.memory.cosineSimilarity(
        qEmb,
        qNorm,
        ex.embedding,
        ex.embeddingNorm,
      );
      const rankScore = this.ranking.computeRankScore(ex, sim);
      const matchedKeywords = ex.keywords.filter((kw) =>
        query.toLowerCase().includes(kw.toLowerCase()),
      );
      return { example: ex, similarity: sim, rankScore, matchedKeywords };
    });

    return this.ranking.rank(matches).slice(0, topK);
  }

  /**
   * Adaptive Response Engine.
   *
   * Recebe contexto (descrição da decisão a ser tomada) e devolve sugestão.
   * Esta é a ponte de integração com o AgentService — quando há match forte,
   * o agente DEVE considerar o behavior aprendido.
   */
  suggestForContext(contextQuery: string): AdaptiveResponseSuggestion {
    const matches = this.findRelevantExamples(contextQuery, 5);

    if (matches.length === 0) {
      return {
        matched: false,
        allMatches: [],
        confidenceBoost: 0,
        influencedByTraining: false,
      };
    }

    const top = matches[0];

    if (top.similarity < this.INFLUENCE_THRESHOLD) {
      return {
        matched: false,
        topMatch: top,
        allMatches: matches,
        confidenceBoost: 0,
        influencedByTraining: false,
      };
    }

    // Registra uso do exemplo (afeta recency factor)
    const updated: TrainingExample = {
      ...top.example,
      appliedCount: top.example.appliedCount + 1,
      lastUsedAt: new Date().toISOString(),
    };
    this.memory.saveExample(updated);

    // Calcula confidence boost ponderado por similarity × confidence
    const strength = top.similarity * (top.example.confidence / 100);
    const confidenceBoost = Math.round(strength * 20); // até ±20 pontos

    return {
      matched: true,
      topMatch: top,
      allMatches: matches,
      suggestedBehavior: top.example.expectedBehavior,
      suggestedReasoning: this.buildReasoningPhrase(top),
      confidenceBoost,
      influencedByTraining: top.similarity >= this.STRONG_MATCH_THRESHOLD,
    };
  }

  private buildReasoningPhrase(match: MatchResult): string {
    const pct = Math.round(match.similarity * 100);
    const conf = match.example.confidence;
    const behavior = this.translateBehavior(match.example.expectedBehavior);
    return `Padrão treinado "${match.example.idealQuestion.slice(0, 50)}" (${pct}% similar, ${conf}% confiança) sugere ${behavior}.`;
  }

  private translateBehavior(b: ExpectedBehavior): string {
    switch (b) {
      case 'APPROVE': return 'aprovação';
      case 'REJECT':  return 'rejeição';
      case 'FLAG':    return 'marcar para revisão';
      case 'NEUTRAL': return 'manter neutro';
      default:        return 'comportamento customizado';
    }
  }

  /**
   * Aplica priorityBoost manual (slider de "destacar exemplo").
   */
  setPriorityBoost(id: string, boost: number): TrainingExample | null {
    const ex = this.memory.getExampleById(id);
    if (!ex) return null;
    ex.priorityBoost = Math.max(-100, Math.min(100, boost));
    ex.updatedAt = new Date().toISOString();
    this.memory.saveExample(ex);
    return ex;
  }
}
