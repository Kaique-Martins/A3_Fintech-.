import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AgentControl.css';
import ExplanationDisplay from './ExplanationDisplay';
import AgentEvolutionDashboard from './AgentEvolutionDashboard';
import AnomalyAlertPanel from './AnomalyAlertPanel';
import DemoProTab from './DemoProTab';
import TrainingTab from './TrainingTab';
export const AgentControl = () => {
    const [metrics, setMetrics] = useState(null);
    const [decisions, setDecisions] = useState([]);
    const [config, setConfig] = useState(null);
    const [learning, setLearning] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('metrics');
    const [, _setRefreshInterval] = useState(null);
    const [notification, setNotification] = useState(null);
    useEffect(() => {
        loadAgentData();
        // Refresh agent metrics every 5 seconds
        const interval = setInterval(loadAgentData, 5000);
        _setRefreshInterval(interval);
        return () => clearInterval(interval);
    }, []);
    const loadAgentData = async () => {
        try {
            const [metricsRes, decisionsRes, configRes, learningRes] = await Promise.all([
                axios.get('/api/agent/metrics'),
                axios.get('/api/agent/decisions'),
                axios.get('/api/agent/config'),
                axios.get('/api/agent/learning/analyze'),
            ]);
            setMetrics(metricsRes.data);
            setDecisions(decisionsRes.data);
            setConfig(configRes.data);
            setLearning(learningRes.data);
            setLoading(false);
        }
        catch (error) {
            console.error('Error loading agent data:', error);
            setLoading(false);
        }
    };
    const handleToggleRule = async (ruleId, currentEnabled) => {
        try {
            if (!config)
                return;
            await axios.put(`/api/agent/config`, {
                ...config,
                rules: config.rules.map((r) => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r),
            });
            await loadAgentData();
        }
        catch (error) {
            console.error('Error toggling rule:', error);
        }
    };
    const handleSaveConfig = async () => {
        try {
            await axios.put('/api/agent/config', config);
            await loadAgentData();
            setNotification({ type: 'success', message: '✅ Configuração salva com sucesso!' });
            setTimeout(() => setNotification(null), 3000);
        }
        catch (error) {
            console.error('Error saving config:', error);
            setNotification({ type: 'error', message: '❌ Erro ao salvar configuração' });
            setTimeout(() => setNotification(null), 3000);
        }
    };
    const handleResetMetrics = async () => {
        const confirm = window.prompt('Digite "CONFIRMAR" para resetar todas as métricas do agente (esta ação não pode ser desfeita):');
        if (confirm === 'CONFIRMAR') {
            try {
                await axios.post('/api/agent/reset-metrics');
                await loadAgentData();
                setNotification({ type: 'success', message: '✅ Métricas resetadas com sucesso!' });
                setTimeout(() => setNotification(null), 3000);
            }
            catch (error) {
                console.error('Error resetting metrics:', error);
                setNotification({ type: 'error', message: '❌ Erro ao resetar métricas' });
                setTimeout(() => setNotification(null), 3000);
            }
        }
    };
    const handleToggleAgent = async () => {
        try {
            await axios.post('/api/agent/toggle');
            await loadAgentData();
        }
        catch (error) {
            console.error('Error toggling agent:', error);
        }
    };
    if (loading) {
        return _jsx("div", { className: "agent-loading", children: "Carregando Agent..." });
    }
    return (_jsxs("div", { className: "agent-control-container", children: [notification && (_jsx("div", { className: `notification-toast notification-${notification.type}`, children: notification.message })), _jsxs("div", { className: "agent-header", children: [_jsx("h1", { children: "\uD83E\uDD16 Autonomous Agent Control" }), _jsx("p", { children: "Sistema inteligente de valida\u00E7\u00E3o aut\u00F4noma com decis\u00E3o autom\u00E1tica" })] }), _jsxs("div", { className: "agent-tabs", children: [_jsx("button", { className: `tab-button ${activeTab === 'metrics' ? 'active' : ''}`, onClick: () => setActiveTab('metrics'), children: "\uD83D\uDCCA M\u00E9tricas" }), _jsx("button", { className: `tab-button ${activeTab === 'decisions' ? 'active' : ''}`, onClick: () => setActiveTab('decisions'), children: "\uD83D\uDCCB Decis\u00F5es" }), _jsx("button", { className: `tab-button ${activeTab === 'insights' ? 'active' : ''}`, onClick: () => setActiveTab('insights'), children: "\uD83E\uDDE0 Insights" }), _jsx("button", { className: `tab-button ${activeTab === 'config' ? 'active' : ''}`, onClick: () => setActiveTab('config'), children: "\u2699\uFE0F Configura\u00E7\u00E3o" }), _jsx("button", { className: `tab-button ${activeTab === 'explainability' ? 'active' : ''}`, onClick: () => setActiveTab('explainability'), children: "\u2728 Explainabilidade" }), _jsx("button", { className: `tab-button ${activeTab === 'evolution' ? 'active' : ''}`, onClick: () => setActiveTab('evolution'), children: "\uD83D\uDCC8 Evolu\u00E7\u00E3o" }), _jsx("button", { className: `tab-button ${activeTab === 'anomalies' ? 'active' : ''}`, onClick: () => setActiveTab('anomalies'), children: "\uD83D\uDEA8 Anomalias" }), _jsx("button", { className: `tab-button ${activeTab === 'demo-pro' ? 'active' : ''}`, onClick: () => setActiveTab('demo-pro'), style: activeTab !== 'demo-pro' ? {
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            borderColor: '#059669',
                            color: '#ffffff',
                            fontWeight: 700,
                            boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                        } : {}, children: "\uD83C\uDFAC Demo Pro" }), _jsx("button", { className: `tab-button ${activeTab === 'training' ? 'active' : ''}`, onClick: () => setActiveTab('training'), style: activeTab !== 'training' ? {
                            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                            borderColor: '#7c3aed',
                            color: '#ffffff',
                            fontWeight: 700,
                            boxShadow: '0 4px 14px rgba(168,85,247,0.35)',
                        } : {}, children: "\uD83E\uDDE0 Treinamento" })] }), activeTab === 'metrics' && (_jsxs("div", { className: "agent-metrics-section", children: [_jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-label", children: "Total Processado" }), _jsx("div", { className: "metric-value", children: metrics?.totalProcessed || 0 }), _jsx("div", { className: "metric-unit", children: "registros" })] }), _jsxs("div", { className: "metric-card approved", children: [_jsx("div", { className: "metric-label", children: "\u2705 Aprovados" }), _jsx("div", { className: "metric-value", children: metrics?.approved || 0 }), _jsxs("div", { className: "metric-unit", children: [metrics && metrics.totalProcessed > 0
                                                ? ((metrics.approved / metrics.totalProcessed) * 100).toFixed(1)
                                                : 0, "%"] })] }), _jsxs("div", { className: "metric-card rejected", children: [_jsx("div", { className: "metric-label", children: "\u274C Rejeitados" }), _jsx("div", { className: "metric-value", children: metrics?.rejected || 0 }), _jsxs("div", { className: "metric-unit", children: [metrics && metrics.totalProcessed > 0
                                                ? ((metrics.rejected / metrics.totalProcessed) * 100).toFixed(1)
                                                : 0, "%"] })] }), _jsxs("div", { className: "metric-card flagged", children: [_jsx("div", { className: "metric-label", children: "\uD83D\uDEA9 Marcados" }), _jsx("div", { className: "metric-value", children: metrics?.flaggedForReview || 0 }), _jsx("div", { className: "metric-unit", children: "para revis\u00E3o" })] }), _jsxs("div", { className: "metric-card success", children: [_jsx("div", { className: "metric-label", children: "Taxa de Sucesso" }), _jsxs("div", { className: "metric-value", children: [(metrics?.successRate || 0).toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "autom\u00E1tico" })] }), _jsxs("div", { className: "metric-card speed", children: [_jsx("div", { className: "metric-label", children: "Velocidade" }), _jsx("div", { className: "metric-value", children: (metrics?.avgProcessingTime || 0).toFixed(0) }), _jsx("div", { className: "metric-unit", children: "ms/registro" })] })] }), _jsxs("div", { className: "agent-actions", children: [_jsx("button", { className: "action-button reset", onClick: handleResetMetrics, children: "\uD83D\uDD04 Resetar M\u00E9tricas" }), _jsx("button", { className: "action-button toggle", onClick: handleToggleAgent, children: "\u26A1 Toggle Agent" })] }), metrics?.rulesApplied && Object.keys(metrics.rulesApplied).length > 0 && (_jsxs("div", { className: "rules-stats", children: [_jsx("h3", { children: "\uD83D\uDCCC Regras Aplicadas" }), _jsx("div", { className: "rules-list", children: Object.entries(metrics.rulesApplied).map(([ruleId, count]) => (_jsxs("div", { className: "rule-stat", children: [_jsx("span", { className: "rule-name", children: ruleId }), _jsxs("span", { className: "rule-count", children: [count, " aplica\u00E7\u00F5es"] })] }, ruleId))) })] }))] })), activeTab === 'decisions' && (_jsxs("div", { className: "agent-decisions-section", children: [_jsx("h3", { children: "\u00DAltimas Decis\u00F5es Aut\u00F4nomas" }), _jsx("div", { className: "decisions-list", children: decisions.length === 0 ? (_jsx("p", { className: "no-data", children: "Nenhuma decis\u00E3o registrada ainda" })) : (decisions.slice(0, 20).map((decision, idx) => (_jsxs("div", { className: `decision-item decision-${decision.decision.toLowerCase()}`, children: [_jsxs("div", { className: "decision-header", children: [_jsx("span", { className: "decision-id", children: decision.recordId }), _jsx("span", { className: `decision-badge decision-${decision.decision.toLowerCase()}`, children: decision.decision }), _jsx("span", { className: `auto-badge ${decision.isAuto ? 'auto' : 'manual'}`, children: decision.isAuto ? '🤖 Automático' : '👤 Manual' })] }), _jsxs("div", { className: "decision-body", children: [_jsx("p", { className: "reasoning", children: decision.reasoning }), _jsxs("div", { className: "decision-meta", children: [_jsxs("span", { className: "confidence", children: ["Confian\u00E7a: ", decision.confidence.toFixed(0), "%"] }), _jsx("span", { className: "timestamp", children: new Date(decision.timestamp).toLocaleTimeString('pt-BR') })] })] })] }, idx)))) })] })), activeTab === 'insights' && (_jsx("div", { className: "agent-insights-section", children: !learning ? (_jsx("div", { className: "config-loading", children: "Carregando insights..." })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card", children: [_jsx("div", { className: "metric-label", children: "Decis\u00F5es analisadas" }), _jsx("div", { className: "metric-value", children: learning.totalDecisions }), _jsx("div", { className: "metric-unit", children: "hist\u00F3rico" })] }), _jsxs("div", { className: "metric-card approved", children: [_jsx("div", { className: "metric-label", children: "Taxa de aprova\u00E7\u00E3o" }), _jsxs("div", { className: "metric-value", children: [learning.approvalRate.toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "global" })] }), _jsxs("div", { className: "metric-card rejected", children: [_jsx("div", { className: "metric-label", children: "Taxa de rejei\u00E7\u00E3o" }), _jsxs("div", { className: "metric-value", children: [learning.rejectionRate.toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "global" })] }), _jsxs("div", { className: "metric-card flagged", children: [_jsx("div", { className: "metric-label", children: "Taxa de revis\u00E3o" }), _jsxs("div", { className: "metric-value", children: [learning.flagRate.toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "global" })] }), _jsxs("div", { className: "metric-card success", children: [_jsx("div", { className: "metric-label", children: "Confian\u00E7a m\u00E9dia" }), _jsxs("div", { className: "metric-value", children: [learning.avgConfidence.toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "decis\u00F5es" })] }), _jsxs("div", { className: "metric-card speed", children: [_jsx("div", { className: "metric-label", children: "Precis\u00E3o estimada" }), _jsxs("div", { className: "metric-value", children: [learning.decisionAccuracy.toFixed(1), "%"] }), _jsx("div", { className: "metric-unit", children: "score" })] })] }), _jsxs("div", { className: "agent-actions", children: [_jsxs("div", { className: "insight-callout", children: [_jsx("strong", { children: "Melhoria" }), _jsx("span", { children: learning.trends.improvingMetric })] }), _jsxs("div", { className: "insight-callout", children: [_jsx("strong", { children: "Decl\u00EDnio" }), _jsx("span", { children: learning.trends.decreasingMetric })] })] }), _jsxs("div", { className: "rules-stats", children: [_jsx("h3", { children: "\uD83E\uDDE0 Insights e alertas" }), learning.anomalies.length > 0 ? (_jsx("div", { className: "insights-list", children: learning.anomalies.map((insight, idx) => (_jsxs("div", { className: `insight-card insight-${insight.severity}`, children: [_jsxs("div", { className: "insight-card-header", children: [_jsx("strong", { children: insight.title }), _jsxs("span", { children: [(insight.confidence * 100).toFixed(0), "%"] })] }), _jsx("p", { children: insight.description }), _jsx("small", { children: insight.recommendation })] }, idx))) })) : (_jsx("p", { className: "no-rules", children: "Nenhum insight cr\u00EDtico detectado no momento" }))] })] })) })), activeTab === 'config' && (_jsx("div", { className: "agent-config-section", children: !config ? (_jsx("div", { className: "config-loading", children: "Carregando configura\u00E7\u00F5es..." })) : (_jsxs(_Fragment, { children: [_jsx("h3", { children: "Configura\u00E7\u00E3o do Agent" }), _jsxs("div", { className: "config-item", children: [_jsx("label", { children: "Modo de Aprendizado" }), _jsxs("select", { value: config.learningMode || 'balanced', onChange: (e) => {
                                        setConfig({ ...config, learningMode: e.target.value });
                                    }, children: [_jsx("option", { value: "conservative", children: "\uD83D\uDEE1\uFE0F Conservador (melhor seguran\u00E7a)" }), _jsx("option", { value: "balanced", children: "\u2696\uFE0F Balanceado (recomendado)" }), _jsx("option", { value: "aggressive", children: "\u26A1 Agressivo (mais r\u00E1pido)" })] })] }), _jsxs("div", { className: "config-item", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: config.autoProcessing?.enabled || false, onChange: (e) => {
                                                setConfig({
                                                    ...config,
                                                    autoProcessing: {
                                                        ...config.autoProcessing,
                                                        enabled: e.target.checked,
                                                    },
                                                });
                                            } }), "Processamento Autom\u00E1tico"] }), _jsx("p", { className: "config-hint", children: "Validar automaticamente em intervalos regulares" })] }), _jsxs("div", { className: "config-item", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: config.notificationsEnabled || false, onChange: (e) => {
                                                setConfig({
                                                    ...config,
                                                    notificationsEnabled: e.target.checked,
                                                });
                                            } }), "Notifica\u00E7\u00F5es Habilitadas"] }), _jsx("p", { className: "config-hint", children: "Receber alertas de decis\u00F5es cr\u00EDticas" })] }), _jsxs("div", { className: "rules-section", children: [_jsx("h4", { children: "\uD83D\uDCCC Regras Ativas" }), config.rules && config.rules.length > 0 ? (config.rules.map((rule) => (_jsxs("div", { className: "rule-item", children: [_jsxs("div", { className: "rule-header", children: [_jsxs("label", { className: "rule-toggle", children: [_jsx("input", { type: "checkbox", checked: rule.enabled, onChange: () => handleToggleRule(rule.id, rule.enabled) }), _jsx("span", { className: "rule-name", children: rule.name })] }), _jsxs("span", { className: "rule-priority", children: ["Prioridade: ", rule.priority] })] }), _jsx("div", { className: "rule-condition", children: _jsxs("code", { children: [rule.condition.field, " ", rule.condition.operator, " ", rule.condition.value] }) })] }, rule.id)))) : (_jsx("p", { className: "no-rules", children: "Nenhuma regra configurada" }))] }), _jsx("div", { className: "config-save-section", children: _jsx("button", { className: "save-button", onClick: handleSaveConfig, children: "\uD83D\uDCBE Salvar Configura\u00E7\u00F5es" }) })] })) })), activeTab === 'explainability' && (_jsxs("div", { className: "agent-explainability-section", children: [_jsx("h3", { children: "\u2728 Explainabilidade de Decis\u00F5es" }), _jsx("p", { style: { color: '#6b7280', marginBottom: '16px' }, children: "Ver explica\u00E7\u00F5es detalhadas de por que o agente tomou cada decis\u00E3o e fornecer feedback para que ele aprenda." }), decisions.length > 0 ? (_jsx("div", { children: decisions.slice(0, 10).map((decision) => (_jsx(ExplanationDisplay, { recordId: decision.recordId, explanation: {
                                recordId: decision.recordId,
                                decision: decision.decision,
                                confidenceScore: decision.confidence,
                                finalScore: decision.confidence,
                                ruleEvaluations: decision.rulesApplied.map((rule) => ({
                                    ruleId: rule,
                                    ruleName: rule,
                                    fieldEvaluated: 'unknown',
                                    fieldValue: null,
                                    operator: 'unknown',
                                    expectedValue: null,
                                    matched: true,
                                    weight: 0.5,
                                    score: decision.confidence,
                                    explanation: `Rule ${rule} applied`,
                                })),
                                decisionReasoning: decision.reasoning,
                                keyFactors: {
                                    positive: decision.decision === 'APPROVED' ? ['Item validado com sucesso'] : [],
                                    negative: decision.decision === 'REJECTED' ? ['Falhou em validação'] : [],
                                    neutral: [],
                                },
                                timestamp: decision.timestamp,
                            } }, decision.recordId))) })) : (_jsx("p", { className: "no-data", children: "Nenhuma decis\u00E3o para explicar ainda. Valide alguns registros primeiro!" }))] })), activeTab === 'evolution' && (_jsx("div", { className: "agent-evolution-section", children: _jsx(AgentEvolutionDashboard, {}) })), activeTab === 'anomalies' && (_jsx("div", { className: "agent-anomalies-section", children: _jsx(AnomalyAlertPanel, {}) })), activeTab === 'demo-pro' && (_jsx(DemoProTab, {})), activeTab === 'training' && (_jsx(TrainingTab, {}))] }));
};
export default AgentControl;
