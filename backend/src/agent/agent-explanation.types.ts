/**
 * Types para Decision Explainability e Self-Learning do Agent
 */

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  fieldEvaluated: string;
  fieldValue: any;
  operator: string;
  expectedValue: any;
  matched: boolean;
  weight: number;
  score: number; // 0-100
  explanation: string;
}

export interface DecisionExplanation {
  recordId: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  confidenceScore: number; // 0-100
  finalScore: number; // 0-100 (weighted average of all rules)
  ruleEvaluations: RuleEvaluation[];
  decisionReasoning: string; // Explicação em linguagem natural
  keyFactors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  timestamp: string;
}

export interface UserFeedback {
  recordId: string;
  originalDecision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  userAgreement: boolean; // true = concorda, false = discorda
  userFeedbackText?: string;
  suggestedDecision?: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  timestamp: string;
  userId?: string;
}

export interface RuleWeightHistory {
  ruleId: string;
  ruleName: string;
  weights: {
    timestamp: string;
    weight: number;
    reason?: string; // Ex: "User feedback - disagreed 3x"
  }[];
  currentWeight: number;
  totalAdjustments: number;
}

export interface AgentEvolutionMetrics {
  timestamp: string;
  totalDecisions: number;
  userAgreementRate: number; // % de decisões com as quais usuário concordou
  accuracyTrend: {
    period: string; // "1h", "1d", "1w"
    accuracy: number;
  }[];
  ruleWeightChanges: RuleWeightHistory[];
  behaviorChanges: {
    timestamp: string;
    description: string; // Ex: "More conservative on low-confidence items"
    impactScore: number; // 0-100
  }[];
}

export interface AnomalyIndicator {
  type:
    | 'UNUSUAL_REJECTION_RATE'
    | 'UNUSUAL_APPROVAL_RATE'
    | 'CONFIDENCE_DROP'
    | 'RULE_WEIGHT_DRIFT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  metrics: {
    expected: number;
    actual: number;
    deviation: number; // percentage
  };
  detectedAt: string;
  suggestedAction: string;
}

export interface AgentReasoningQuery {
  type: 'WHY_DECISION' | 'HYPOTHETICAL' | 'RULE_COMPARISON';
  recordId?: string;
  decision?: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  hypotheticalChanges?: {
    field: string;
    newValue: any;
  }[];
  compareWithTimestamp?: string;
}

export interface AgentReasoningResponse {
  query: AgentReasoningQuery;
  naturalLanguageExplanation: string;
  detailedBreakdown: {
    rule: string;
    impact: string;
    percentage: number;
  }[];
  hypotheticalResult?: {
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
    score: number;
    changes: string[];
  };
}

export interface DecisionAuditLog {
  id: string;
  recordId: string;
  originalDecision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  userFeedback?: UserFeedback;
  timestamp: string;
  ruleWeightsAtTime: { [ruleId: string]: number };
  explanation: DecisionExplanation;
}
