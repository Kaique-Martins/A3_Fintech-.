import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import axios from 'axios';
export const AgentEvolutionDashboard = () => {
    const [evolutionData, setEvolutionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('1d');
    useEffect(() => {
        loadEvolutionData();
        const interval = setInterval(loadEvolutionData, 5000);
        return () => clearInterval(interval);
    }, []);
    const loadEvolutionData = async () => {
        try {
            const response = await axios.get('/api/agent/explainability/evolution');
            if (response.data.success && response.data.data.latestMetrics) {
                setEvolutionData(response.data.data.latestMetrics);
            }
        }
        catch (error) {
            console.error('Error loading evolution data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (loading || !evolutionData) {
        return _jsx("div", { style: { padding: '20px', textAlign: 'center' }, children: "Loading evolution data..." });
    }
    const currentAccuracy = evolutionData.accuracyTrend.find((t) => t.period === selectedPeriod);
    const accuracyValue = currentAccuracy?.accuracy || 0;
    return (_jsxs("div", { style: { padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }, children: [_jsx("h3", { style: { marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px' }, children: "\uD83E\uDDE0 Agent Evolution Tracker" }), _jsxs("div", { style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px',
                }, children: [_jsxs("div", { style: {
                            backgroundColor: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                        }, children: [_jsx("p", { style: { margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }, children: "\uD83D\uDCCA Total Decisions" }), _jsx("p", { style: { margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }, children: evolutionData.totalDecisions })] }), _jsxs("div", { style: {
                            backgroundColor: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                        }, children: [_jsx("p", { style: { margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }, children: "\uD83D\uDC64 User Agreement" }), _jsxs("p", { style: { margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }, children: [evolutionData.userAgreementRate, "%"] })] }), _jsxs("div", { style: {
                            backgroundColor: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                        }, children: [_jsxs("p", { style: { margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }, children: ["\uD83C\uDFAF Accuracy (", selectedPeriod, ")"] }), _jsxs("p", { style: { margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }, children: [accuracyValue, "%"] })] }), _jsxs("div", { style: {
                            backgroundColor: '#fff',
                            padding: '12px',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                        }, children: [_jsx("p", { style: { margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }, children: "\u2696\uFE0F Rule Adjustments" }), _jsx("p", { style: { margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }, children: evolutionData.ruleWeightChanges.reduce((sum, r) => sum + r.totalAdjustments, 0) })] })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("p", { style: { margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }, children: "Select Period:" }), _jsx("div", { style: { display: 'flex', gap: '8px' }, children: ['1h', '1d', '1w'].map((period) => (_jsx("button", { onClick: () => setSelectedPeriod(period), style: {
                                padding: '6px 12px',
                                backgroundColor: selectedPeriod === period ? '#3b82f6' : '#e5e7eb',
                                color: selectedPeriod === period ? '#fff' : '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                            }, children: period }, period))) })] }), _jsxs("div", { style: { marginBottom: '20px' }, children: [_jsx("h4", { style: { margin: '0 0 12px 0' }, children: "\u2696\uFE0F Rule Weight Evolution" }), _jsx("div", { style: {
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                            overflow: 'hidden',
                        }, children: evolutionData.ruleWeightChanges.length > 0 ? (evolutionData.ruleWeightChanges.map((rule) => (_jsxs("div", { style: {
                                padding: '12px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }, children: [_jsxs("div", { children: [_jsx("p", { style: { margin: '0 0 4px 0', fontWeight: 'bold', color: '#1f2937' }, children: rule.ruleName }), _jsxs("p", { style: { margin: '0', fontSize: '12px', color: '#6b7280' }, children: [rule.totalAdjustments, " adjustments"] })] }), _jsxs("div", { style: { textAlign: 'right' }, children: [_jsxs("p", { style: { margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }, children: [rule.currentWeight.toFixed(2), "x"] }), _jsx("div", { style: {
                                                width: '100px',
                                                height: '4px',
                                                backgroundColor: '#e5e7eb',
                                                borderRadius: '2px',
                                                marginTop: '4px',
                                                overflow: 'hidden',
                                            }, children: _jsx("div", { style: {
                                                    height: '100%',
                                                    backgroundColor: rule.currentWeight > 1 ? '#10b981' : '#ef4444',
                                                    width: `${Math.min(100, (rule.currentWeight / 2) * 100)}%`,
                                                } }) })] })] }, rule.ruleId)))) : (_jsx("p", { style: { padding: '12px', color: '#6b7280', textAlign: 'center' }, children: "No rule adjustments yet" })) })] }), evolutionData.behaviorChanges.length > 0 && (_jsxs("div", { children: [_jsx("h4", { style: { margin: '0 0 12px 0' }, children: "\uD83D\uDD04 Detected Behavior Changes" }), _jsx("div", { style: {
                            backgroundColor: '#fff',
                            borderRadius: '6px',
                            border: '1px solid #e5e7eb',
                        }, children: evolutionData.behaviorChanges.map((change, idx) => (_jsxs("div", { style: {
                                padding: '12px',
                                borderBottom: idx < evolutionData.behaviorChanges.length - 1 ? '1px solid #e5e7eb' : 'none',
                            }, children: [_jsx("p", { style: { margin: '0 0 4px 0', fontWeight: 'bold', color: '#1f2937' }, children: change.description }), _jsxs("div", { style: {
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }, children: [_jsx("p", { style: { margin: '0', fontSize: '11px', color: '#6b7280' }, children: new Date(change.timestamp).toLocaleTimeString() }), _jsxs("div", { style: {
                                                padding: '2px 8px',
                                                backgroundColor: '#fef3c7',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                color: '#92400e',
                                            }, children: ["Impact: ", change.impactScore] })] })] }, idx))) })] })), _jsxs("div", { style: { marginTop: '20px' }, children: [_jsx("h4", { style: { margin: '0 0 12px 0' }, children: "\uD83E\uDDFE Recent Decisions" }), _jsx("div", { style: { backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb', overflow: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { style: { textAlign: 'left', borderBottom: '1px solid #e5e7eb' }, children: [_jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "Record" }), _jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "Decision" }), _jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "Confidence" }), _jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "RequestID" }), _jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "RuleVersion" }), _jsx("th", { style: { padding: '8px', fontSize: '12px', color: '#6b7280' }, children: "Time" })] }) }), _jsx("tbody", { children: (evolutionData.recentDecisions || []).map((d) => (_jsxs("tr", { style: { borderBottom: '1px solid #f3f4f6' }, children: [_jsx("td", { style: { padding: '8px' }, children: d.recordId }), _jsx("td", { style: { padding: '8px' }, children: d.decision }), _jsx("td", { style: { padding: '8px' }, children: d.confidence }), _jsx("td", { style: { padding: '8px' }, children: d.requestId || '-' }), _jsx("td", { style: { padding: '8px' }, children: d.ruleVersion || '-' }), _jsx("td", { style: { padding: '8px' }, children: new Date(d.timestamp).toLocaleString() })] }, d.id))) })] }) })] })] }));
};
export default AgentEvolutionDashboard;
