import React, { useState } from 'react';
import axios from 'axios';

interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  fieldEvaluated: string;
  fieldValue: any;
  operator: string;
  expectedValue: any;
  matched: boolean;
  weight: number;
  score: number;
  explanation: string;
}

interface DecisionExplanation {
  recordId: string;
  decision: string;
  confidenceScore: number;
  finalScore: number;
  ruleEvaluations: RuleEvaluation[];
  decisionReasoning: string;
  keyFactors: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  timestamp: string;
}

interface ExplanationDisplayProps {
  recordId: string;
  explanation: DecisionExplanation;
}

export const ExplanationDisplay: React.FC<ExplanationDisplayProps> = ({
  recordId,
  explanation,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const handleFeedback = async (agree: boolean) => {
    setFeedback(agree);
    try {
      await axios.post('/api/agent/explainability/feedback', {
        recordId,
        originalDecision: explanation.decision,
        userAgreement: agree,
        appliedRules: explanation.ruleEvaluations
          .filter((r) => r.matched)
          .map((r) => r.ruleId),
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVED':
        return '#10b981';
      case 'REJECTED':
        return '#ef4444';
      case 'FLAGGED':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'APPROVED':
        return '✅';
      case 'REJECTED':
        return '❌';
      case 'FLAGGED':
        return '🚩';
      default:
        return '⚪';
    }
  };

  return (
    <div
      style={{
        border: `2px solid ${getDecisionColor(explanation.decision)}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#f9fafb',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>
            {getDecisionIcon(explanation.decision)}
          </span>
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: getDecisionColor(explanation.decision) }}>
              {explanation.decision} ({Math.round(explanation.finalScore)}%)
            </h4>
            <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
              {explanation.decisionReasoning}
            </p>
          </div>
        </div>
        <span style={{ fontSize: '20px', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
          ▼
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          {/* Rule Breakdown */}
          <h5 style={{ marginTop: '0', marginBottom: '8px' }}>📋 Rule Breakdown</h5>
          <div style={{ marginBottom: '12px' }}>
            {explanation.ruleEvaluations.map((rule) => (
              <div
                key={rule.ruleId}
                style={{
                  padding: '8px',
                  backgroundColor: rule.matched ? '#dcfce7' : '#fee2e2',
                  borderRadius: '4px',
                  marginBottom: '6px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{rule.matched ? '✅' : '❌'} {rule.ruleName}</span>
                  <span style={{ fontWeight: 'bold' }}>{Math.round(rule.weight * 100)}%</span>
                </div>
                <p style={{ margin: '4px 0 0 0', color: '#4b5563', fontSize: '11px' }}>
                  {rule.explanation}
                </p>
                <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '11px' }}>
                  {rule.fieldEvaluated}: {rule.fieldValue} {rule.operator} {rule.expectedValue}
                </p>
              </div>
            ))}
          </div>

          {/* Key Factors */}
          {explanation.keyFactors.positive.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h6 style={{ margin: '0 0 6px 0' }}>👍 Positive Factors</h6>
              {explanation.keyFactors.positive.map((factor, idx) => (
                <p key={idx} style={{ margin: '4px 0', fontSize: '12px', color: '#065f46' }}>
                  • {factor}
                </p>
              ))}
            </div>
          )}

          {explanation.keyFactors.negative.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <h6 style={{ margin: '0 0 6px 0' }}>👎 Negative Factors</h6>
              {explanation.keyFactors.negative.map((factor, idx) => (
                <p key={idx} style={{ margin: '4px 0', fontSize: '12px', color: '#991b1b' }}>
                  • {factor}
                </p>
              ))}
            </div>
          )}

          {/* Feedback Section */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>
              Do you agree with this decision?
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleFeedback(true)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: feedback === true ? '#10b981' : '#e5e7eb',
                  color: feedback === true ? '#fff' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                👍 Agree
              </button>
              <button
                onClick={() => handleFeedback(false)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: feedback === false ? '#ef4444' : '#e5e7eb',
                  color: feedback === false ? '#fff' : '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                👎 Disagree
              </button>
            </div>
            {feedback !== null && (
              <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#059669' }}>
                ✅ Feedback recorded - Agent is learning!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplanationDisplay;
