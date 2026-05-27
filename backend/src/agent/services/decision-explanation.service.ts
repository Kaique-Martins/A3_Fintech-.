import { Injectable, Logger } from '@nestjs/common';
import {
  DecisionExplanation,
  RuleEvaluation,
  AgentReasoningQuery,
  AgentReasoningResponse,
} from '../agent-explanation.types';
import { AgentRule, AgentDecision } from '../agent.types';
import { ValidationResultDto } from '../../validation/dto/validation.dto';

@Injectable()
export class DecisionExplanationService {
  private readonly logger = new Logger(DecisionExplanationService.name);

  /**
   * Gera uma explicação detalhada para uma decisão do agent
   */
  generateExplanation(
    recordId: string,
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL',
    confidence: number,
    appliedRules: AgentRule[],
    validation: ValidationResultDto,
    ruleScores: Map<string, number>,
  ): DecisionExplanation {
    const ruleEvaluations = this.evaluateRulesWithScores(
      appliedRules,
      validation,
      ruleScores,
    );

    const finalScore = this.calculateWeightedScore(ruleEvaluations);
    const keyFactors = this.extractKeyFactors(ruleEvaluations);
    const reasoning = this.generateNaturalLanguageReasoning(
      decision,
      ruleEvaluations,
      finalScore,
    );

    return {
      recordId,
      decision,
      confidenceScore: confidence,
      finalScore,
      ruleEvaluations,
      decisionReasoning: reasoning,
      keyFactors,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Avalia cada regra e calcula scores
   */
  private evaluateRulesWithScores(
    rules: AgentRule[],
    validation: ValidationResultDto,
    ruleScores: Map<string, number>,
  ): RuleEvaluation[] {
    return rules.map((rule) => {
      const score = ruleScores.get(rule.id) || 0;
      const matched = score > 0;

      let explanation = '';
      let fieldValue: any = null;
      const fieldEvaluated = rule.condition.field;

      // Extrai o valor do campo da validação
      if (
        rule.condition.field === 'quality' ||
        rule.condition.field === 'qualityScore'
      ) {
        fieldValue = validation.qualityScore;
      } else if (
        rule.condition.field === 'confidence' ||
        rule.condition.field === 'confidenceLevel'
      ) {
        fieldValue = validation.confidenceLevel;
      } else if (rule.condition.field === 'alerts') {
        fieldValue = validation.alerts?.length || 0;
      } else if (rule.condition.field === 'status') {
        fieldValue = validation.status;
      }

      if (matched) {
        explanation = `${rule.name} matched (${rule.condition.operator} ${rule.condition.value})`;
      } else {
        explanation = `${rule.name} not matched (${fieldValue} ${rule.condition.operator} ${rule.condition.value})`;
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        fieldEvaluated,
        fieldValue,
        operator: rule.condition.operator,
        expectedValue: rule.condition.value,
        matched,
        weight: rule.priority / 10, // Normaliza priority (0-1)
        score,
        explanation,
      };
    });
  }

  /**
   * Calcula score ponderado das regras
   */
  private calculateWeightedScore(evaluations: RuleEvaluation[]): number {
    if (evaluations.length === 0) return 50;

    let totalWeight = 0;
    let weightedSum = 0;

    evaluations.forEach((evaluation) => {
      const weight = evaluation.weight;
      totalWeight += weight;
      // Score é mais alto se regra foi matched
      const scoreContribution = evaluation.matched
        ? evaluation.score
        : 100 - evaluation.score;
      weightedSum += scoreContribution * weight;
    });

    if (totalWeight === 0) return 50;
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }

  /**
   * Extrai fatores-chave positivos/negativos
   */
  private extractKeyFactors(evaluations: RuleEvaluation[]): {
    positive: string[];
    negative: string[];
    neutral: string[];
  } {
    const keyFactors = {
      positive: [] as string[],
      negative: [] as string[],
      neutral: [] as string[],
    };

    evaluations.forEach((evaluation) => {
      if (evaluation.matched) {
        // Regras matched são geralmente positivas
        if (
          evaluation.ruleName.includes('high') ||
          evaluation.ruleName.includes('sanity')
        ) {
          keyFactors.positive.push(
            `${evaluation.ruleName}: ${evaluation.fieldValue} (score: ${evaluation.score})`,
          );
        } else if (
          evaluation.ruleName.includes('low') ||
          evaluation.ruleName.includes('reject')
        ) {
          keyFactors.negative.push(
            `${evaluation.ruleName}: ${evaluation.fieldValue} (score: ${evaluation.score})`,
          );
        } else {
          keyFactors.neutral.push(`${evaluation.ruleName}`);
        }
      }
    });

    return keyFactors;
  }

  /**
   * Gera explicação em linguagem natural
   */
  private generateNaturalLanguageReasoning(
    decision: string,
    evaluations: RuleEvaluation[],
    score: number,
  ): string {
    const matchedRules = evaluations.filter((evaluation) => evaluation.matched);
    const unmatchedRules = evaluations.filter(
      (evaluation) => !evaluation.matched,
    );

    let reasoning = '';

    if (decision === 'APPROVED') {
      reasoning = `✅ Approved with ${Math.round(score)}% confidence. `;
    } else if (decision === 'REJECTED') {
      reasoning = `❌ Rejected. `;
    } else if (decision === 'FLAGGED') {
      reasoning = `🚩 Flagged for review (${Math.round(score)}% confidence). `;
    } else {
      reasoning = `⚪ Neutral decision (${Math.round(score)}% confidence). `;
    }

    if (matchedRules.length > 0) {
      const ruleNames = matchedRules.map((rule) => rule.ruleName).join(', ');
      reasoning += `Rules triggered: ${ruleNames}. `;
    }

    if (unmatchedRules.length > 0 && unmatchedRules.length <= 2) {
      const ruleNames = unmatchedRules.map((rule) => rule.ruleName).join(', ');
      reasoning += `Rules not triggered: ${ruleNames}.`;
    }

    return reasoning;
  }

  /**
   * Responde perguntas sobre decisões (WHY, HYPOTHETICAL, etc)
   */
  answerReasoningQuery(
    query: AgentReasoningQuery,
    explanation: DecisionExplanation,
  ): AgentReasoningResponse {
    let naturalLanguageExplanation = '';
    const detailedBreakdown: any[] = [];

    if (query.type === 'WHY_DECISION') {
      naturalLanguageExplanation = `Decision "${explanation.decision}" was made based on:`;

      explanation.ruleEvaluations.forEach((evaluation) => {
        if (evaluation.matched) {
          detailedBreakdown.push({
            rule: evaluation.ruleName,
            impact: evaluation.explanation,
            percentage: Math.round((evaluation.weight / 10) * 100),
          });
        }
      });
    } else if (query.type === 'HYPOTHETICAL') {
      naturalLanguageExplanation =
        'If the following changes were made, the decision would be:';

      // Simula mudanças hipotéticas (simplified)
      const baseScore = explanation.finalScore;
      const adjustmentFactor = 1; // Seria mais complexo em produção
      const newScore = Math.min(100, Math.max(0, baseScore * adjustmentFactor));

      detailedBreakdown.push({
        rule: 'Overall Impact',
        impact: `Score would change from ${Math.round(
          baseScore,
        )} to ${Math.round(newScore)}`,
        percentage: Math.abs(newScore - baseScore),
      });
    }

    return {
      query,
      naturalLanguageExplanation,
      detailedBreakdown,
    };
  }

  /**
   * Formata explicação para exibição visual
   */
  formatForDisplay(explanation: DecisionExplanation): string {
    const lines = [
      `Decision: ${explanation.decision} (${Math.round(
        explanation.finalScore,
      )}% confidence)`,
      `Reasoning: ${explanation.decisionReasoning}`,
      ``,
      `Rule Breakdown:`,
    ];

    explanation.ruleEvaluations.forEach((evaluation) => {
      const status = evaluation.matched ? '✅' : '❌';
      lines.push(
        `  ${status} ${evaluation.ruleName}: ${
          evaluation.explanation
        } (weight: ${Math.round(evaluation.weight * 100)}%)`,
      );
    });

    lines.push(``, `Key Factors:`);
    if (explanation.keyFactors.positive.length > 0) {
      lines.push(
        `  👍 Positive: ${explanation.keyFactors.positive.join(', ')}`,
      );
    }
    if (explanation.keyFactors.negative.length > 0) {
      lines.push(
        `  👎 Negative: ${explanation.keyFactors.negative.join(', ')}`,
      );
    }

    return lines.join('\n');
  }
}
