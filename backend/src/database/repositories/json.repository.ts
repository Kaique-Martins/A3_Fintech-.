/**
 * JSON-based Repository Implementation
 * File-based persistence using JSON storage
 * Current implementation - suitable for development/demo
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  IRepository,
  PersistedDecision,
  DecisionAggregate,
  RepositoryQuery,
} from '../interfaces/repository.interface';

export class JsonRepository implements IRepository {
  private decisionsFilePath: string;
  private aggregateFilePath: string;
  private dataDir = 'data';

  constructor() {
    this.decisionsFilePath = path.join(this.dataDir, 'decisions.json');
    this.aggregateFilePath = path.join(this.dataDir, 'aggregate.json');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private loadDecisions(): PersistedDecision[] {
    try {
      if (fs.existsSync(this.decisionsFilePath)) {
        const data = fs.readFileSync(this.decisionsFilePath, 'utf-8');
        return JSON.parse(data) as PersistedDecision[];
      }
      return [];
    } catch {
      return [];
    }
  }

  private saveDecisions(decisions: PersistedDecision[]): void {
    fs.writeFileSync(
      this.decisionsFilePath,
      JSON.stringify(decisions, null, 2),
      'utf-8',
    );
  }

  private loadAggregate(): DecisionAggregate {
    try {
      if (fs.existsSync(this.aggregateFilePath)) {
        const data = fs.readFileSync(this.aggregateFilePath, 'utf-8');
        return JSON.parse(data) as DecisionAggregate;
      }
    } catch {}

    return {
      totalDecisions: 0,
      approvedCount: 0,
      rejectedCount: 0,
      flaggedCount: 0,
      avgConfidence: 0,
      avgQualityScore: 0,
      lastUpdate: new Date().toISOString(),
    };
  }

  private saveAggregate(aggregate: DecisionAggregate): void {
    fs.writeFileSync(
      this.aggregateFilePath,
      JSON.stringify(aggregate, null, 2),
      'utf-8',
    );
  }

  private computeAggregate(decisions: PersistedDecision[]): DecisionAggregate {
    if (decisions.length === 0) {
      return {
        totalDecisions: 0,
        approvedCount: 0,
        rejectedCount: 0,
        flaggedCount: 0,
        avgConfidence: 0,
        avgQualityScore: 0,
        lastUpdate: new Date().toISOString(),
      };
    }

    let approvedCount = 0;
    let rejectedCount = 0;
    let flaggedCount = 0;
    let totalConfidence = 0;
    let totalQuality = 0;

    decisions.forEach((d) => {
      if (d.decision === 'APPROVED') approvedCount++;
      else if (d.decision === 'REJECTED') rejectedCount++;
      else if (d.decision === 'FLAGGED') flaggedCount++;

      totalConfidence += d.confidence || 0;
      totalQuality += d.qualityScore || 0;
    });

    const totalDecisions = decisions.length;

    return {
      totalDecisions,
      approvedCount,
      rejectedCount,
      flaggedCount,
      avgConfidence: totalDecisions > 0 ? totalConfidence / totalDecisions : 0,
      avgQualityScore: totalDecisions > 0 ? totalQuality / totalDecisions : 0,
      lastUpdate: new Date().toISOString(),
    };
  }

  // ==================== Decision Persistence ====================

  async saveDecision(decision: PersistedDecision): Promise<void> {
    const decisions = this.loadDecisions();
    decisions.push(decision);
    this.saveDecisions(decisions);
  }

  async getDecision(id: string): Promise<PersistedDecision | null> {
    const decisions = this.loadDecisions();
    return decisions.find((d) => d.id === id) || null;
  }

  async getAllDecisions(query?: RepositoryQuery): Promise<PersistedDecision[]> {
    let decisions = this.loadDecisions();

    // Apply filters
    if (query?.decision) {
      decisions = decisions.filter((d) => d.decision === query.decision);
    }
    if (query?.status) {
      decisions = decisions.filter((d) => d.status === query.status);
    }
    if (query?.ruleId) {
      decisions = decisions.filter((d) =>
        d.rulesApplied.includes(query.ruleId!),
      );
    }
    if (query?.startDate) {
      const start = new Date(query.startDate);
      decisions = decisions.filter((d) => new Date(d.timestamp) >= start);
    }
    if (query?.endDate) {
      const end = new Date(query.endDate);
      decisions = decisions.filter((d) => new Date(d.timestamp) <= end);
    }
    if (query?.confidenceMin !== undefined) {
      decisions = decisions.filter((d) => d.confidence >= query.confidenceMin!);
    }
    if (query?.confidenceMax !== undefined) {
      decisions = decisions.filter((d) => d.confidence <= query.confidenceMax!);
    }

    decisions = decisions.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Apply pagination
    if (query?.offset !== undefined) {
      decisions = decisions.slice(query.offset);
    }
    if (query?.limit !== undefined) {
      decisions = decisions.slice(0, query.limit);
    }

    return decisions;
  }

  async getDecisionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<PersistedDecision[]> {
    const decisions = this.loadDecisions();
    const start = new Date(startDate);
    const end = new Date(endDate);

    return decisions.filter((d) => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }

  async getDecisionsByRule(ruleId: string): Promise<PersistedDecision[]> {
    const decisions = this.loadDecisions();
    return decisions.filter((d) => d.rulesApplied.includes(ruleId));
  }

  async deleteDecision(id: string): Promise<void> {
    const decisions = this.loadDecisions();
    const filtered = decisions.filter((d) => d.id !== id);
    this.saveDecisions(filtered);
  }

  async countDecisions(): Promise<number> {
    return this.loadDecisions().length;
  }

  // ==================== Aggregates ====================

  async getAggregate(): Promise<DecisionAggregate> {
    const decisions = this.loadDecisions();
    const aggregate = this.computeAggregate(decisions);
    return aggregate;
  }

  async updateAggregate(aggregate: Partial<DecisionAggregate>): Promise<void> {
    const current = this.loadAggregate();
    const updated = {
      ...current,
      ...aggregate,
      lastUpdate: new Date().toISOString(),
    };
    this.saveAggregate(updated);
  }

  // ==================== Trends & Reports ====================

  async getDecisionTrends(daysBack = 30): Promise<any> {
    const decisions = this.loadDecisions();
    const trends: Record<string, any> = {};

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysBack);

    decisions
      .filter((d) => new Date(d.timestamp) >= daysAgo)
      .forEach((d) => {
        const date = d.timestamp.split('T')[0];
        if (!trends[date]) {
          trends[date] = { approved: 0, rejected: 0, flagged: 0, total: 0 };
        }
        trends[date].total++;
        if (d.decision === 'APPROVED') trends[date].approved++;
        if (d.decision === 'REJECTED') trends[date].rejected++;
        if (d.decision === 'FLAGGED') trends[date].flagged++;
      });

    return trends;
  }

  async exportCSV(query?: RepositoryQuery): Promise<string> {
    const decisions = await this.getAllDecisions(query);

    const headers = [
      'RequestID',
      'RuleVersion',
      'ID',
      'RecordID',
      'Produto',
      'Categoria',
      'Preço Original',
      'Cidade Original',
      'Decision',
      'Confidence',
      'Rules Applied',
      'Reasoning',
      'Timestamp',
      'Quality Score',
    ];
    const rows = decisions.map((d) => [
      d.requestId || '',
      d.ruleVersion || '',
      d.id,
      d.recordId,
      d.input?.produto || '',
      d.input?.categoria || '',
      d.input?.preco ?? '',
      d.input?.cidade || '',
      d.decision,
      d.confidence,
      d.rulesApplied.join(';'),
      `"${d.reasoning.replace(/"/g, '""')}"`,
      d.timestamp,
      d.qualityScore,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    return csv;
  }

  // ==================== Utilities ====================

  async clear(): Promise<void> {
    this.saveDecisions([]);
    this.saveAggregate({
      totalDecisions: 0,
      approvedCount: 0,
      rejectedCount: 0,
      flaggedCount: 0,
      avgConfidence: 0,
      avgQualityScore: 0,
      lastUpdate: new Date().toISOString(),
    });
  }

  async health(): Promise<{
    status: string;
    timestamp: string;
    implementation: string;
  }> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      implementation: 'JsonRepository (File-based)',
    };
  }
}
