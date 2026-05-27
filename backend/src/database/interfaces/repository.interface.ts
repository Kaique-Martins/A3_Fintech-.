/**
 * Generic Repository Interface
 * Abstraction layer for data persistence
 * Allows switching between JSON, PostgreSQL, MongoDB, etc.
 */

export interface PersistedDecision {
  id: string;
  recordId: string;
  decision: string;
  confidence: number;
  rulesApplied: string[];
  reasoning: string;
  timestamp: string;
  isAuto: boolean;
  processingTimeMs: number;
  agentVersion: string;
  requestId?: string;
  ruleVersion?: string;
  qualityScore: number;
  status: string;
  input?: {
    produto: string;
    categoria?: string;
    preco: number;
    cidade: string;
  };
  correctedData?: {
    produto: string;
    categoria: string;
    preco: number;
    cidade: string;
  };
}

export interface DecisionAggregate {
  totalDecisions: number;
  approvedCount: number;
  rejectedCount: number;
  flaggedCount: number;
  avgConfidence: number;
  avgQualityScore: number;
  lastUpdate: string;
}

export interface RepositoryQuery {
  limit?: number;
  offset?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  decision?: string;
  confidenceMin?: number;
  confidenceMax?: number;
  ruleId?: string;
}

/**
 * Base Repository Interface
 * All persistence implementations must adhere to this contract
 */
export interface IRepository {
  // Decision persistence
  saveDecision(decision: PersistedDecision): Promise<void>;
  getDecision(id: string): Promise<PersistedDecision | null>;
  getAllDecisions(query?: RepositoryQuery): Promise<PersistedDecision[]>;
  getDecisionsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<PersistedDecision[]>;
  getDecisionsByRule(ruleId: string): Promise<PersistedDecision[]>;
  deleteDecision(id: string): Promise<void>;
  countDecisions(): Promise<number>;

  // Aggregates
  getAggregate(): Promise<DecisionAggregate>;
  updateAggregate(aggregate: Partial<DecisionAggregate>): Promise<void>;

  // Trends & Reports
  getDecisionTrends(daysBack?: number): Promise<any>;
  exportCSV(query?: RepositoryQuery): Promise<string>;

  // Utilities
  clear(): Promise<void>;
  health(): Promise<{
    status: string;
    timestamp: string;
    implementation: string;
  }>;
}
