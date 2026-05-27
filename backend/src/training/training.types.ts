/**
 * Training System — Type Definitions
 *
 * Conceitos modelados:
 *  - Contextual Learning: cada exemplo carrega contexto, palavras-chave e embedding
 *  - Reinforcement Feedback: positiveCount/negativeCount ajustam confidence
 *  - Adaptive Response Engine: ranking dinâmico por similarity × confidence
 *  - Vector Memory (simulada): embeddings TF-IDF sobre bag-of-words
 */

export type FeedbackRating = 'positive' | 'negative';

export type ExpectedBehavior =
  | 'APPROVE'
  | 'REJECT'
  | 'FLAG'
  | 'NEUTRAL'
  | 'CUSTOM';

export interface TrainingExample {
  id: string;
  idealQuestion: string;         // pergunta/cenário ideal
  idealAnswer: string;           // resposta/decisão ideal
  expectedBehavior: ExpectedBehavior;
  context: string;               // contexto adicional
  keywords: string[];            // palavras-chave importantes

  // Vector memory simulada: bag-of-words com frequência
  embedding: Record<string, number>;
  embeddingNorm: number;         // norma euclidiana para cosine similarity

  // Reinforcement signals
  positiveCount: number;
  negativeCount: number;
  confidence: number;            // score derivado 0-100
  priorityBoost: number;         // ajuste manual de ranking
  appliedCount: number;          // quantas vezes este exemplo influenciou decisões

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  tags?: string[];
}

export interface TrainingFeedback {
  id: string;
  exampleId?: string;            // se feedback foi sobre um exemplo específico
  decisionRecordId?: string;     // se feedback foi sobre uma decisão real
  rating: FeedbackRating;
  notes?: string;
  timestamp: string;
}

export interface MatchResult {
  example: TrainingExample;
  similarity: number;            // 0-1 cosine similarity
  rankScore: number;             // similarity * confidence
  matchedKeywords: string[];
}

export interface TrainingAnalytics {
  totalExamples: number;
  totalFeedbacks: number;
  positiveFeedbacks: number;
  negativeFeedbacks: number;
  accuracyRate: number;          // positives / (positives + negatives)
  avgConfidence: number;
  evolutionTrend: EvolutionPoint[];
  topExamples: TrainingExample[];
  weakExamples: TrainingExample[];
  correctedResponses: number;
  modelStatus: 'COLD' | 'LEARNING' | 'TRAINED' | 'EXPERT';
  lastTrainedAt?: string;
}

export interface EvolutionPoint {
  timestamp: string;
  accuracy: number;
  totalExamples: number;
  totalFeedbacks: number;
}

export interface AdaptiveResponseSuggestion {
  matched: boolean;
  topMatch?: MatchResult;
  allMatches: MatchResult[];
  suggestedBehavior?: ExpectedBehavior;
  suggestedReasoning?: string;
  confidenceBoost: number;       // -20 .. +20 ajuste sugerido à confiança final
  influencedByTraining: boolean;
}

export interface CreateExampleDto {
  idealQuestion: string;
  idealAnswer: string;
  expectedBehavior: ExpectedBehavior;
  context?: string;
  keywords?: string[];
  tags?: string[];
}

export interface FeedbackDto {
  exampleId?: string;
  decisionRecordId?: string;
  rating: FeedbackRating;
  notes?: string;
}
