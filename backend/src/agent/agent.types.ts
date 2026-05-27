/**
 * Agent Rules Engine
 * Define rules que o agente segue autonomamente
 */

// Union type para valores de condições
export type RuleConditionValue = string | number | string[] | boolean;

export type RuleFieldType =
  | 'price'
  | 'quality'
  | 'qualityScore'
  | 'confidence'
  | 'confidenceLevel'
  | 'alerts'
  | 'status';

export type RuleOperator = 'lessThan' | 'greaterThan' | 'equals' | 'contains';

export interface RuleCondition {
  field: RuleFieldType;
  operator: RuleOperator;
  value: RuleConditionValue;
}

export interface RuleAction {
  autoApprove?: boolean;
  autoReject?: boolean;
  flagForReview?: boolean;
  notifyUser?: boolean;
  customMessage?: string;
}

export interface AgentRule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
  priority: number; // 1-10, maior = mais importante
  createdAt: string;
  appliedCount?: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rules: AgentRule[];
  learningMode: 'conservative' | 'balanced' | 'aggressive'; // Como o agente aprende
  autoProcessBatch: boolean;
  batchProcessInterval?: number; // milliseconds
  notifyOnHighRisk: boolean;
  trackMetrics: boolean;
}

export interface AgentMetrics {
  totalProcessed: number;
  approved: number;
  rejected: number;
  flaggedForReview: number;
  successRate: number;
  avgProcessingTime: number;
  rulesApplied: { [ruleId: string]: number };
  lastUpdate: string;
}

export interface AgentDecision {
  recordId: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  confidence: number;
  rulesApplied: string[];
  reasoning: string;
  timestamp: string;
  isAuto: boolean;
  requestId?: string;
  ruleVersion?: string;
  ruleWeights?: Record<string, number>; // peso de feedback por regra aplicada
}

export const DEFAULT_AGENT_RULES: AgentRule[] = [
  {
    id: 'rule-high-quality',
    name: 'Auto-Approve Alta Qualidade',
    description: 'Aprova automaticamente dados com qualidade > 85%',
    condition: {
      field: 'qualityScore',
      operator: 'greaterThan',
      value: 85,
    },
    action: {
      autoApprove: true,
      notifyUser: false,
    },
    enabled: true,
    priority: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-critical-alerts',
    name: 'Flag Problemas Críticos',
    description: 'Marca para revisão quando há alertas críticos',
    condition: {
      field: 'alerts',
      operator: 'contains',
      value: 'CRÍTICO',
    },
    action: {
      flagForReview: true,
      notifyUser: true,
      customMessage: 'Problema crítico detectado - revisão necessária',
    },
    enabled: true,
    priority: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-low-confidence',
    name: 'Flag Baixa Confiança',
    description: 'Marca para revisão quando confiança < 40%',
    condition: {
      field: 'confidenceLevel',
      operator: 'lessThan',
      value: 40,
    },
    action: {
      flagForReview: true,
      notifyUser: true,
      customMessage: 'Confiança muito baixa - análise manual recomendada',
    },
    enabled: true,
    priority: 9,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'rule-reject-invalid',
    name: 'Rejeita Dados Inválidos',
    description: 'Rejeita automaticamente quando qualidade < 20%',
    condition: {
      field: 'qualityScore',
      operator: 'lessThan',
      value: 20,
    },
    action: {
      autoReject: true,
      notifyUser: true,
      customMessage: 'Dados muito inválidos - rejeitado automaticamente',
    },
    enabled: true,
    priority: 10,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  id: 'agent-default',
  name: 'Agent Padrão',
  description: 'Agente com regras padrão de validação',
  enabled: true,
  rules: DEFAULT_AGENT_RULES,
  learningMode: 'balanced',
  autoProcessBatch: true,
  batchProcessInterval: 60000, // 1 minuto
  notifyOnHighRisk: true,
  trackMetrics: true,
};
