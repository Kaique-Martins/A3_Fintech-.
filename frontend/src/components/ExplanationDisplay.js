import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import axios from 'axios';
export const ExplanationDisplay = ({ recordId, explanation, }) => {
    const [expanded, setExpanded] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const handleFeedback = async (agree) => {
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
        }
        catch (error) {
            console.error('Error submitting feedback:', error);
        }
    };
    const getDecisionColor = (decision) => {
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
    const getDecisionIcon = (decision) => {
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
    return (_jsxs("div", { style: {
            border: `2px solid ${getDecisionColor(explanation.decision)}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px',
            backgroundColor: '#f9fafb',
        }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                }, onClick: () => setExpanded(!expanded), children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("span", { style: { fontSize: '20px' }, children: getDecisionIcon(explanation.decision) }), _jsxs("div", { children: [_jsxs("h4", { style: { margin: '0 0 4px 0', color: getDecisionColor(explanation.decision) }, children: [explanation.decision, " (", Math.round(explanation.finalScore), "%)"] }), _jsx("p", { style: { margin: '0', fontSize: '12px', color: '#6b7280' }, children: explanation.decisionReasoning })] })] }), _jsx("span", { style: { fontSize: '20px', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }, children: "\u25BC" })] }), expanded && (_jsxs("div", { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }, children: [_jsx("h5", { style: { marginTop: '0', marginBottom: '8px' }, children: "\uD83D\uDCCB Rule Breakdown" }), _jsx("div", { style: { marginBottom: '12px' }, children: explanation.ruleEvaluations.map((rule) => (_jsxs("div", { style: {
                                padding: '8px',
                                backgroundColor: rule.matched ? '#dcfce7' : '#fee2e2',
                                borderRadius: '4px',
                                marginBottom: '6px',
                                fontSize: '12px',
                            }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("span", { children: [rule.matched ? '✅' : '❌', " ", rule.ruleName] }), _jsxs("span", { style: { fontWeight: 'bold' }, children: [Math.round(rule.weight * 100), "%"] })] }), _jsx("p", { style: { margin: '4px 0 0 0', color: '#4b5563', fontSize: '11px' }, children: rule.explanation }), _jsxs("p", { style: { margin: '2px 0 0 0', color: '#6b7280', fontSize: '11px' }, children: [rule.fieldEvaluated, ": ", rule.fieldValue, " ", rule.operator, " ", rule.expectedValue] })] }, rule.ruleId))) }), explanation.keyFactors.positive.length > 0 && (_jsxs("div", { style: { marginBottom: '12px' }, children: [_jsx("h6", { style: { margin: '0 0 6px 0' }, children: "\uD83D\uDC4D Positive Factors" }), explanation.keyFactors.positive.map((factor, idx) => (_jsxs("p", { style: { margin: '4px 0', fontSize: '12px', color: '#065f46' }, children: ["\u2022 ", factor] }, idx)))] })), explanation.keyFactors.negative.length > 0 && (_jsxs("div", { style: { marginBottom: '12px' }, children: [_jsx("h6", { style: { margin: '0 0 6px 0' }, children: "\uD83D\uDC4E Negative Factors" }), explanation.keyFactors.negative.map((factor, idx) => (_jsxs("p", { style: { margin: '4px 0', fontSize: '12px', color: '#991b1b' }, children: ["\u2022 ", factor] }, idx)))] })), _jsxs("div", { style: {
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid #e5e7eb',
                        }, children: [_jsx("p", { style: { margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }, children: "Do you agree with this decision?" }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsx("button", { onClick: () => handleFeedback(true), style: {
                                            padding: '6px 12px',
                                            backgroundColor: feedback === true ? '#10b981' : '#e5e7eb',
                                            color: feedback === true ? '#fff' : '#374151',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                        }, children: "\uD83D\uDC4D Agree" }), _jsx("button", { onClick: () => handleFeedback(false), style: {
                                            padding: '6px 12px',
                                            backgroundColor: feedback === false ? '#ef4444' : '#e5e7eb',
                                            color: feedback === false ? '#fff' : '#374151',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold',
                                        }, children: "\uD83D\uDC4E Disagree" })] }), feedback !== null && (_jsx("p", { style: { margin: '6px 0 0 0', fontSize: '11px', color: '#059669' }, children: "\u2705 Feedback recorded - Agent is learning!" }))] })] }))] }));
};
export default ExplanationDisplay;
