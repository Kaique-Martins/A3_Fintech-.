import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  TrainingExample,
  TrainingFeedback,
  EvolutionPoint,
} from './training.types';

/**
 * TrainingMemoryService
 *
 * Camada de persistência da memória do agente. Implementa "vector memory" simulada
 * (bag-of-words com TF-IDF leve) e mantém o estado contínuo de aprendizado em
 * arquivos JSON. Mesma camada de durabilidade usada pelo DatabaseService.
 */
@Injectable()
export class TrainingMemoryService implements OnModuleInit {
  private readonly logger = new Logger(TrainingMemoryService.name);
  private readonly dataDir = 'data';

  private readonly examplesPath = path.join('data', 'training-examples.json');
  private readonly feedbackPath = path.join('data', 'training-feedback.json');
  private readonly evolutionPath = path.join('data', 'training-evolution.json');

  private examples: TrainingExample[] = [];
  private feedback: TrainingFeedback[] = [];
  private evolution: EvolutionPoint[] = [];

  // Stopwords leves em PT/EN para reduzir ruído na vetorização
  private readonly stopwords = new Set([
    'a','o','as','os','um','uma','de','do','da','dos','das','no','na','nos','nas',
    'em','por','para','com','sem','e','ou','que','se','é','são','foi','foram',
    'the','a','an','of','to','in','on','for','and','or','is','are','was','were',
    'this','that','it','as','at','by','be','been','from','with',
  ]);

  onModuleInit() {
    this.ensureDataDir();
    this.examples = this.load<TrainingExample[]>(this.examplesPath, []);
    this.feedback = this.load<TrainingFeedback[]>(this.feedbackPath, []);
    this.evolution = this.load<EvolutionPoint[]>(this.evolutionPath, []);
    this.logger.log(
      `Memory restored: ${this.examples.length} exemplos, ${this.feedback.length} feedbacks`,
    );
  }

  // ─── Tokenization & Embedding ──────────────────────────────────────────────

  tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !this.stopwords.has(t));
  }

  /**
   * Gera embedding simulado tipo bag-of-words com boost em keywords.
   * Inspirado em TF-IDF mas simplificado: termo → frequência, keywords ganham peso 3x.
   */
  buildEmbedding(text: string, keywords: string[] = []): {
    embedding: Record<string, number>;
    norm: number;
  } {
    const tokens = this.tokenize(text);
    const kwSet = new Set(keywords.flatMap((k) => this.tokenize(k)));
    const embedding: Record<string, number> = {};

    for (const tok of tokens) {
      const boost = kwSet.has(tok) ? 3 : 1;
      embedding[tok] = (embedding[tok] || 0) + boost;
    }

    // Aplica TF normalizado: 1 + log(freq)
    for (const k of Object.keys(embedding)) {
      embedding[k] = 1 + Math.log(embedding[k]);
    }

    const norm = Math.sqrt(
      Object.values(embedding).reduce((sum, v) => sum + v * v, 0),
    );

    return { embedding, norm: norm || 1 };
  }

  cosineSimilarity(
    a: Record<string, number>,
    aNorm: number,
    b: Record<string, number>,
    bNorm: number,
  ): number {
    let dot = 0;
    const shorter = Object.keys(a).length < Object.keys(b).length ? a : b;
    const other = shorter === a ? b : a;
    for (const k of Object.keys(shorter)) {
      if (other[k]) dot += shorter[k] * other[k];
    }
    return dot / (aNorm * bNorm || 1);
  }

  // ─── Examples CRUD ─────────────────────────────────────────────────────────

  getAllExamples(): TrainingExample[] {
    return [...this.examples];
  }

  getExampleById(id: string): TrainingExample | undefined {
    return this.examples.find((e) => e.id === id);
  }

  saveExample(example: TrainingExample): void {
    const idx = this.examples.findIndex((e) => e.id === example.id);
    if (idx >= 0) this.examples[idx] = example;
    else this.examples.push(example);
    this.persistExamples();
  }

  deleteExample(id: string): boolean {
    const before = this.examples.length;
    this.examples = this.examples.filter((e) => e.id !== id);
    if (this.examples.length < before) {
      this.persistExamples();
      return true;
    }
    return false;
  }

  // ─── Feedback ──────────────────────────────────────────────────────────────

  getAllFeedback(): TrainingFeedback[] {
    return [...this.feedback];
  }

  addFeedback(fb: TrainingFeedback): void {
    this.feedback.unshift(fb);
    if (this.feedback.length > 1000) this.feedback = this.feedback.slice(0, 1000);
    this.persistFeedback();
  }

  // ─── Evolution time-series ────────────────────────────────────────────────

  recordEvolution(point: EvolutionPoint): void {
    this.evolution.push(point);
    if (this.evolution.length > 200) this.evolution = this.evolution.slice(-200);
    this.persistEvolution();
  }

  getEvolution(): EvolutionPoint[] {
    return [...this.evolution];
  }

  // ─── Persistence helpers ──────────────────────────────────────────────────

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private load<T>(filePath: string, fallback: T): T {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
      }
    } catch (e) {
      this.logger.warn(`Não foi possível ler ${filePath}: ${(e as Error).message}`);
    }
    return fallback;
  }

  private persistExamples(): void {
    this.writeJson(this.examplesPath, this.examples);
  }

  private persistFeedback(): void {
    this.writeJson(this.feedbackPath, this.feedback);
  }

  private persistEvolution(): void {
    this.writeJson(this.evolutionPath, this.evolution);
  }

  private writeJson(filePath: string, data: any): void {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      this.logger.error(`Falha ao persistir ${filePath}: ${(e as Error).message}`);
    }
  }
}
