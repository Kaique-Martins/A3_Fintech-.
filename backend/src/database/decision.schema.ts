// Defines persistent storage schema for agent decisions
export interface PersistedDecision {
  id: string; // unique decision ID
  recordId: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  confidence: number;
  rulesApplied: string[];
  reasoning: string;
  timestamp: string;
  isAuto: boolean;
  processingTimeMs: number;
  agentVersion: string;
  qualityScore?: number;
  status?: string;
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
  approvalRate: number;
  rejectionRate: number;
  flagRate: number;
  avgConfidence: number;
  avgProcessingTime: number;
  decisionsByDay: Record<string, number>;
  topRules: Record<string, number>;
  lastUpdated: string;
}

export interface DecisionQuery {
  limit?: number;
  startDate?: string;
  endDate?: string;
  decision?: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  minConfidence?: number;
}
