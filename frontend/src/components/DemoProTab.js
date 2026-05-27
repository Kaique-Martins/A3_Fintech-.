import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
// Detect critical alerts whether they're strings or { severity, message } objects
function hasCriticalAlert(alerts) {
    return alerts.some(a => {
        if (typeof a === 'string')
            return a.includes('CRÍTICO');
        if (a && typeof a === 'object') {
            return String(a.severity ?? '').includes('CRÍTICO') ||
                String(a.message ?? '').includes('CRÍTICO');
        }
        return false;
    });
}
function alertToString(a) {
    if (typeof a === 'string')
        return a;
    if (a && typeof a === 'object') {
        const sev = a.severity ? `[${a.severity}] ` : '';
        return `${sev}${a.message ?? JSON.stringify(a)}`;
    }
    return String(a);
}
// ─── Safe accessors ───────────────────────────────────────────────────────────
const safeNum = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);
const safeStr = (v) => (typeof v === 'string' ? v : '');
const safeArr = (v) => (Array.isArray(v) ? v : []);
function normalizeSnapshot(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    try {
        return {
            recordId: safeStr(raw.recordId) || 'unknown',
            scenario: safeStr(raw.scenario) || 'Cenário desconhecido',
            input: {
                produto: safeStr(raw.input?.produto) || '—',
                categoria: safeStr(raw.input?.categoria),
                preco: safeNum(raw.input?.preco),
                cidade: safeStr(raw.input?.cidade) || '—',
            },
            validation: {
                dado_corrigido: raw.validation?.dado_corrigido,
                status: safeStr(raw.validation?.status) || 'unknown',
                motivo: safeStr(raw.validation?.motivo),
                qualityScore: safeNum(raw.validation?.qualityScore),
                confidenceLevel: safeNum(raw.validation?.confidenceLevel),
                alerts: safeArr(raw.validation?.alerts),
                recommendations: safeArr(raw.validation?.recommendations),
            },
            agentDecision: {
                recordId: safeStr(raw.agentDecision?.recordId),
                decision: (['APPROVED', 'REJECTED', 'FLAGGED', 'NEUTRAL'].includes(raw.agentDecision?.decision)
                    ? raw.agentDecision.decision
                    : 'NEUTRAL'),
                confidence: safeNum(raw.agentDecision?.confidence),
                rulesApplied: safeArr(raw.agentDecision?.rulesApplied),
                reasoning: safeStr(raw.agentDecision?.reasoning) || 'Sem raciocínio disponível',
                timestamp: safeStr(raw.agentDecision?.timestamp) || new Date().toISOString(),
                isAuto: !!raw.agentDecision?.isAuto,
            },
            timestamp: safeStr(raw.timestamp) || new Date().toISOString(),
        };
    }
    catch {
        return null;
    }
}
// ─── Rule Definitions ─────────────────────────────────────────────────────────
const RULE_DEFS = [
    {
        id: 'rule-high-quality',
        name: 'Auto-Approve Alta Qualidade',
        description: 'Aprova automaticamente dados com qualidade acima de 85%',
        fieldLabel: 'qualityScore',
        condition: 'qualityScore > 85',
        actionIcon: '✅',
        actionLabel: 'APROVA',
        color: '#10b981',
        bg: 'rgba(16,185,129,0.08)',
        border: 'rgba(16,185,129,0.25)',
        glow: 'rgba(16,185,129,0.35)',
        priority: 8,
    },
    {
        id: 'rule-critical-alerts',
        name: 'Flag Problemas Críticos',
        description: 'Marca para revisão quando há alertas críticos detectados',
        fieldLabel: 'alerts',
        condition: 'alerts contains "CRÍTICO"',
        actionIcon: '🚩',
        actionLabel: 'MARCA',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        glow: 'rgba(245,158,11,0.35)',
        priority: 10,
    },
    {
        id: 'rule-low-confidence',
        name: 'Flag Baixa Confiança',
        description: 'Marca para revisão quando confiança do validador é menor que 40%',
        fieldLabel: 'confidenceLevel',
        condition: 'confidenceLevel < 40',
        actionIcon: '⚠️',
        actionLabel: 'MARCA',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.08)',
        border: 'rgba(245,158,11,0.25)',
        glow: 'rgba(245,158,11,0.35)',
        priority: 9,
    },
    {
        id: 'rule-reject-invalid',
        name: 'Rejeita Dados Inválidos',
        description: 'Rejeita automaticamente dados com qualidade menor que 20%',
        fieldLabel: 'qualityScore',
        condition: 'qualityScore < 20',
        actionIcon: '❌',
        actionLabel: 'REJEITA',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.08)',
        border: 'rgba(239,68,68,0.25)',
        glow: 'rgba(239,68,68,0.35)',
        priority: 10,
    },
];
// ─── Sub-Components ───────────────────────────────────────────────────────────
const ScoreRing = ({ value, label, color }) => {
    const r = 26;
    const circ = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(100, value));
    const dashArray = `${(clamped / 100) * circ} ${circ}`;
    return (_jsxs("div", { className: "score-ring-wrap", children: [_jsxs("svg", { width: "66", height: "66", viewBox: "0 0 66 66", children: [_jsx("circle", { cx: "33", cy: "33", r: r, fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: "5" }), _jsx("circle", { cx: "33", cy: "33", r: r, fill: "none", stroke: color, strokeWidth: "5", strokeDasharray: dashArray, strokeLinecap: "round", transform: "rotate(-90 33 33)", style: { transition: 'stroke-dasharray 0.7s ease' } }), _jsxs("text", { x: "33", y: "38", textAnchor: "middle", fill: color, fontSize: "13", fontWeight: "800", children: [Math.round(clamped), "%"] })] }), _jsx("span", { className: "score-ring-label", children: label })] }));
};
const DecisionBadge = ({ decision, large }) => {
    const map = {
        APPROVED: { bg: 'rgba(16,185,129,0.18)', color: '#10b981', icon: '✅', label: 'APROVADO', glow: '0 0 24px rgba(16,185,129,0.45)' },
        REJECTED: { bg: 'rgba(239,68,68,0.18)', color: '#ef4444', icon: '❌', label: 'REJEITADO', glow: '0 0 24px rgba(239,68,68,0.45)' },
        FLAGGED: { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b', icon: '🚩', label: 'MARCADO', glow: '0 0 24px rgba(245,158,11,0.45)' },
        NEUTRAL: { bg: 'rgba(107,114,128,0.18)', color: '#6b7280', icon: '⚪', label: 'NEUTRO', glow: 'none' },
    };
    const d = map[decision] ?? map.NEUTRAL;
    return (_jsxs("div", { style: {
            display: 'inline-flex', alignItems: 'center', gap: large ? '10px' : '6px',
            background: d.bg, color: d.color,
            padding: large ? '10px 18px' : '5px 11px',
            borderRadius: large ? '12px' : '7px',
            fontWeight: 800, fontSize: large ? '18px' : '12px',
            boxShadow: large ? d.glow : 'none',
            border: `1.5px solid ${d.color}`,
            letterSpacing: '0.06em',
            transition: 'all 0.4s ease',
        }, children: [_jsx("span", { children: d.icon }), _jsx("span", { children: d.label })] }));
};
const PipelineStep = ({ step, icon, title, subtitle, active, flash, decision, children }) => {
    const decisionColor = {
        APPROVED: '#10b981', REJECTED: '#ef4444', FLAGGED: '#f59e0b', NEUTRAL: '#6b7280',
    };
    const borderColor = decision ? decisionColor[decision] : active ? '#3b82f6' : 'rgba(255,255,255,0.1)';
    const glow = decision ? `0 0 20px ${decisionColor[decision]}40` : active ? '0 0 16px rgba(59,130,246,0.2)' : 'none';
    return (_jsxs("div", { className: `dp-step${active ? ' dp-step--active' : ''}${flash ? ' dp-step--flash' : ''}`, style: { borderColor, boxShadow: glow }, children: [_jsxs("div", { className: "dp-step-header", children: [_jsx("div", { className: "dp-step-number", children: step }), _jsx("span", { className: "dp-step-icon", children: icon }), _jsxs("div", { children: [_jsx("div", { className: "dp-step-title", children: title }), subtitle && _jsx("div", { className: "dp-step-subtitle", children: subtitle })] })] }), _jsx("div", { className: "dp-step-body", children: active ? children : (_jsx("div", { className: "dp-step-empty", children: "Aguardando dados..." })) })] }));
};
const PipelineArrow = ({ active }) => (_jsxs("div", { className: `dp-arrow${active ? ' dp-arrow--active' : ''}`, children: [_jsx("div", { className: "dp-arrow-line" }), _jsx("div", { className: "dp-arrow-dot dp-arrow-dot--1" }), _jsx("div", { className: "dp-arrow-dot dp-arrow-dot--2" }), _jsx("div", { className: "dp-arrow-dot dp-arrow-dot--3" }), _jsx("div", { className: "dp-arrow-head", children: "\u203A" })] }));
const RuleCard = ({ rule, fired, snapshot }) => {
    let actualValue = '—';
    if (snapshot) {
        if (rule.id === 'rule-high-quality' || rule.id === 'rule-reject-invalid') {
            actualValue = `${Math.round(snapshot.validation.qualityScore)}%`;
        }
        else if (rule.id === 'rule-low-confidence') {
            actualValue = `${Math.round(snapshot.validation.confidenceLevel)}%`;
        }
        else if (rule.id === 'rule-critical-alerts') {
            const alerts = snapshot.validation.alerts ?? [];
            actualValue = hasCriticalAlert(alerts) ? 'SIM' : 'NÃO';
        }
    }
    return (_jsxs("div", { className: `dp-rule-card${fired ? ' dp-rule-card--fired' : ''}`, style: {
            background: fired ? rule.bg : 'rgba(255,255,255,0.03)',
            borderColor: fired ? rule.color : 'rgba(255,255,255,0.08)',
            boxShadow: fired ? `0 0 16px ${rule.glow}` : 'none',
        }, children: [_jsxs("div", { className: "dp-rule-header", children: [_jsx("div", { className: "dp-rule-status", style: { background: fired ? rule.color : '#374151' }, children: fired ? rule.actionIcon : '○' }), _jsxs("div", { className: "dp-rule-info", children: [_jsx("div", { className: "dp-rule-name", style: { color: fired ? rule.color : '#9ca3af' }, children: rule.name }), _jsxs("div", { className: "dp-rule-priority", children: ["Prioridade ", rule.priority] })] }), _jsx("div", { className: "dp-rule-badge", style: {
                            background: fired ? rule.color : 'rgba(107,114,128,0.2)',
                            color: fired ? '#fff' : '#6b7280',
                        }, children: fired ? rule.actionLabel : 'INATIVA' })] }), _jsx("div", { className: "dp-rule-condition", children: _jsx("code", { children: rule.condition }) }), _jsx("div", { className: "dp-rule-desc", children: rule.description }), snapshot && (_jsxs("div", { className: "dp-rule-value", children: [_jsx("span", { children: "Valor atual:" }), _jsx("strong", { style: { color: fired ? rule.color : '#6b7280' }, children: actualValue })] }))] }));
};
const HistoryItem = ({ item, isLatest }) => {
    const colorMap = {
        APPROVED: '#10b981', REJECTED: '#ef4444', FLAGGED: '#f59e0b', NEUTRAL: '#6b7280',
    };
    const iconMap = {
        APPROVED: '✅', REJECTED: '❌', FLAGGED: '🚩', NEUTRAL: '⚪',
    };
    const color = colorMap[item.agentDecision.decision] ?? '#6b7280';
    const icon = iconMap[item.agentDecision.decision] ?? '⚪';
    const time = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return (_jsxs("div", { className: `dp-history-item${isLatest ? ' dp-history-item--latest' : ''}`, children: [_jsx("div", { className: "dp-history-dot", style: { background: color, boxShadow: isLatest ? `0 0 10px ${color}` : 'none' } }), _jsx("div", { className: "dp-history-line" }), _jsxs("div", { className: "dp-history-content", children: [_jsxs("div", { className: "dp-history-row", children: [_jsx("span", { className: "dp-history-icon", children: icon }), _jsx("span", { className: "dp-history-decision", style: { color }, children: item.agentDecision.decision }), _jsxs("span", { className: "dp-history-conf", children: [Math.round(item.agentDecision.confidence), "%"] }), isLatest && _jsx("span", { className: "dp-history-new", children: "NOVO" })] }), _jsx("div", { className: "dp-history-scenario", children: item.scenario }), _jsxs("div", { className: "dp-history-meta", children: [_jsxs("span", { children: [item.input.produto?.slice(0, 28), item.input.produto?.length > 28 ? '…' : ''] }), _jsx("span", { className: "dp-history-time", children: time })] })] })] }));
};
// ─── Main Component ───────────────────────────────────────────────────────────
// ─── Error Boundary ───────────────────────────────────────────────────────────
class DemoErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch(error, info) { console.error('DemoProTab crash:', error, info); }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { style: {
                    padding: '2rem', borderRadius: '1rem',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', textAlign: 'center',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u26A0\uFE0F Erro ao renderizar Demo Pro" }), _jsx("p", { style: { color: '#9ca3af', fontSize: '0.9rem' }, children: this.state.error.message }), _jsx("button", { onClick: () => this.setState({ error: null }), style: {
                            marginTop: '1rem', padding: '0.5rem 1rem',
                            background: '#3b82f6', color: '#fff', border: 'none',
                            borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600,
                        }, children: "Tentar novamente" })] }));
        }
        return this.props.children;
    }
}
const DemoProTabInner = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [snapshot, setSnapshot] = useState(null);
    const [history, setHistory] = useState([]);
    const [nextScenario, setNextScenario] = useState('');
    const [flash, setFlash] = useState(false);
    const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, flagged: 0 });
    const [stepping, setStepping] = useState(false);
    const pollRef = useRef(null);
    const lastIdRef = useRef(null);
    const applySnapshot = useCallback((snap) => {
        if (snap.recordId === lastIdRef.current)
            return;
        lastIdRef.current = snap.recordId;
        setFlash(true);
        setTimeout(() => setFlash(false), 700);
        setSnapshot(snap);
        setHistory(prev => [snap, ...prev].slice(0, 30));
        setStats(prev => {
            const d = snap.agentDecision.decision;
            return {
                total: prev.total + 1,
                approved: prev.approved + (d === 'APPROVED' ? 1 : 0),
                rejected: prev.rejected + (d === 'REJECTED' ? 1 : 0),
                flagged: prev.flagged + (d === 'FLAGGED' ? 1 : 0),
            };
        });
    }, []);
    const fetchPreview = useCallback(async () => {
        try {
            const res = await axios.get('/api/demo/preview');
            const { isRunning: running, lastSnapshot: snap, nextScenario: next } = res.data ?? {};
            setIsRunning(!!running);
            if (typeof next === 'string')
                setNextScenario(next);
            const normalized = normalizeSnapshot(snap);
            if (normalized)
                applySnapshot(normalized);
        }
        catch {
            // silently ignore network errors
        }
    }, [applySnapshot]);
    useEffect(() => {
        fetchPreview();
    }, [fetchPreview]);
    useEffect(() => {
        if (isRunning) {
            pollRef.current = setInterval(fetchPreview, 1500);
        }
        else {
            if (pollRef.current)
                clearInterval(pollRef.current);
        }
        return () => {
            if (pollRef.current)
                clearInterval(pollRef.current);
        };
    }, [isRunning, fetchPreview]);
    const handleStart = async () => {
        try {
            await axios.post('/api/demo/start');
            setIsRunning(true);
        }
        catch (e) {
            console.error('Erro ao iniciar demo:', e);
        }
    };
    const handleStop = async () => {
        try {
            await axios.post('/api/demo/stop');
            setIsRunning(false);
        }
        catch (e) {
            console.error('Erro ao parar demo:', e);
        }
    };
    const handleStep = async () => {
        setStepping(true);
        try {
            await axios.post('/api/demo/step');
            await fetchPreview();
        }
        catch (e) {
            console.warn('Endpoint /step indisponível (backend precisa ser reiniciado). Usando start/stop:', e);
            // Fallback: start then stop após primeiro tick
            try {
                await axios.post('/api/demo/start');
                await new Promise(r => setTimeout(r, 200));
                await axios.post('/api/demo/stop');
                await fetchPreview();
            }
            catch (e2) {
                console.error('Fallback também falhou:', e2);
            }
        }
        finally {
            setStepping(false);
        }
    };
    const approvalRate = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : '0';
    return (_jsxs("div", { className: "demo-pro-root", children: [_jsxs("div", { className: "demo-pro-header", children: [_jsxs("div", { className: "demo-pro-header-left", children: [_jsxs("div", { className: "demo-pro-title-row", children: [_jsx("h2", { className: "demo-pro-title", children: "\uD83C\uDFAC Demo Pro" }), _jsxs("span", { className: `demo-live-badge${isRunning ? ' demo-live-badge--on' : ''}`, children: [_jsx("span", { className: "demo-live-dot" }), isRunning ? 'AO VIVO' : 'PARADO'] })] }), _jsx("p", { className: "demo-pro-subtitle", children: "Visualize o pipeline completo: entrada de dados \u2192 valida\u00E7\u00E3o \u2192 decis\u00E3o aut\u00F4noma do agente" })] }), _jsxs("div", { className: "demo-pro-controls", children: [nextScenario && (_jsxs("div", { className: "demo-next-label", children: [_jsx("span", { children: "Pr\u00F3ximo cen\u00E1rio:" }), _jsx("strong", { children: nextScenario })] })), _jsxs("div", { className: "demo-buttons", children: [_jsxs("button", { className: `demo-btn demo-btn--step${stepping ? ' demo-btn--loading' : ''}`, onClick: handleStep, disabled: isRunning || stepping, title: "Processar um registro manualmente", children: [stepping ? '⏳' : '⏭', " Passo a Passo"] }), _jsx("button", { className: `demo-btn${isRunning ? ' demo-btn--stop' : ' demo-btn--start'}`, onClick: isRunning ? handleStop : handleStart, children: isRunning ? '⏹ Parar Demo' : '▶ Iniciar Demo' })] })] })] }), _jsxs("div", { className: "demo-stats-row", children: [_jsxs("div", { className: "demo-stat", children: [_jsx("div", { className: "demo-stat-value", children: stats.total }), _jsx("div", { className: "demo-stat-label", children: "Total Processado" }), _jsx("div", { className: "demo-stat-bar", style: { width: '100%', background: '#3b82f6' } })] }), _jsxs("div", { className: "demo-stat demo-stat--green", children: [_jsx("div", { className: "demo-stat-value", children: stats.approved }), _jsx("div", { className: "demo-stat-label", children: "\u2705 Aprovados" }), _jsx("div", { className: "demo-stat-bar", style: {
                                    width: stats.total > 0 ? `${(stats.approved / stats.total) * 100}%` : '0%',
                                    background: '#10b981'
                                } })] }), _jsxs("div", { className: "demo-stat demo-stat--red", children: [_jsx("div", { className: "demo-stat-value", children: stats.rejected }), _jsx("div", { className: "demo-stat-label", children: "\u274C Rejeitados" }), _jsx("div", { className: "demo-stat-bar", style: {
                                    width: stats.total > 0 ? `${(stats.rejected / stats.total) * 100}%` : '0%',
                                    background: '#ef4444'
                                } })] }), _jsxs("div", { className: "demo-stat demo-stat--yellow", children: [_jsx("div", { className: "demo-stat-value", children: stats.flagged }), _jsx("div", { className: "demo-stat-label", children: "\uD83D\uDEA9 Marcados" }), _jsx("div", { className: "demo-stat-bar", style: {
                                    width: stats.total > 0 ? `${(stats.flagged / stats.total) * 100}%` : '0%',
                                    background: '#f59e0b'
                                } })] }), _jsxs("div", { className: "demo-stat demo-stat--purple", children: [_jsxs("div", { className: "demo-stat-value", children: [approvalRate, "%"] }), _jsx("div", { className: "demo-stat-label", children: "Taxa de Aprova\u00E7\u00E3o" }), _jsx("div", { className: "demo-stat-bar", style: {
                                    width: `${approvalRate}%`,
                                    background: 'linear-gradient(90deg, #3b82f6, #a855f7)'
                                } })] })] }), _jsxs("div", { className: "demo-pipeline-section", children: [_jsx("div", { className: "demo-section-title", children: "\u26A1 Pipeline de Processamento" }), snapshot && (_jsxs("div", { className: "demo-scenario-banner", children: [_jsx("span", { children: "\uD83D\uDCCB Cen\u00E1rio atual:" }), _jsx("strong", { children: snapshot.scenario }), _jsx("span", { className: "demo-record-id", children: snapshot.recordId })] })), _jsxs("div", { className: "demo-pipeline", children: [_jsx(PipelineStep, { step: 1, icon: "\uD83D\uDCE5", title: "Entrada de Dados", subtitle: "Dados brutos recebidos", active: !!snapshot, flash: flash, children: snapshot && (_jsxs("div", { className: "dp-step-fields", children: [_jsxs("div", { className: "dp-field", children: [_jsx("span", { children: "Produto" }), _jsx("strong", { children: snapshot.input.produto })] }), _jsxs("div", { className: "dp-field", children: [_jsx("span", { children: "Categoria" }), _jsx("strong", { children: snapshot.input.categoria || _jsx("em", { children: "inferida" }) })] }), _jsxs("div", { className: "dp-field", children: [_jsx("span", { children: "Pre\u00E7o" }), _jsxs("strong", { children: ["R$ ", snapshot.input.preco?.toFixed(2)] })] }), _jsxs("div", { className: "dp-field", children: [_jsx("span", { children: "Cidade" }), _jsx("strong", { children: snapshot.input.cidade })] })] })) }), _jsx(PipelineArrow, { active: !!snapshot }), _jsx(PipelineStep, { step: 2, icon: "\uD83D\uDD0D", title: "Motor de Valida\u00E7\u00E3o", subtitle: "Qualidade & integridade", active: !!snapshot, flash: flash, children: snapshot && (_jsxs("div", { className: "dp-step-rings", children: [_jsx(ScoreRing, { value: snapshot.validation.qualityScore, label: "Qualidade", color: "#3b82f6" }), _jsx(ScoreRing, { value: snapshot.validation.confidenceLevel, label: "Confian\u00E7a", color: "#a855f7" }), _jsxs("div", { className: "dp-validation-status", children: [_jsx("div", { className: "dp-status-tag", style: {
                                                        background: snapshot.validation.status === 'valid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                                        color: snapshot.validation.status === 'valid' ? '#10b981' : '#f59e0b',
                                                    }, children: snapshot.validation.status?.toUpperCase() }), (snapshot.validation.alerts ?? []).length > 0 && (_jsxs("div", { className: "dp-alerts-count", children: ["\uD83D\uDD14 ", snapshot.validation.alerts.length, " alerta", snapshot.validation.alerts.length > 1 ? 's' : ''] }))] })] })) }), _jsx(PipelineArrow, { active: !!snapshot }), _jsx(PipelineStep, { step: 3, icon: "\uD83E\uDD16", title: "Agente Aut\u00F4nomo", subtitle: "Avalia\u00E7\u00E3o das regras", active: !!snapshot, flash: flash, children: snapshot && (_jsxs("div", { className: "dp-step-agent", children: [_jsx(ScoreRing, { value: snapshot.agentDecision.confidence, label: "Confian\u00E7a IA", color: "#f59e0b" }), _jsxs("div", { className: "dp-rules-applied", children: [_jsxs("div", { className: "dp-rules-count", children: [_jsx("strong", { children: snapshot.agentDecision.rulesApplied.length }), _jsxs("span", { children: ["regra", snapshot.agentDecision.rulesApplied.length !== 1 ? 's' : '', " ativa", snapshot.agentDecision.rulesApplied.length !== 1 ? 's' : ''] })] }), _jsxs("div", { className: "dp-rules-chips", children: [snapshot.agentDecision.rulesApplied.map(r => (_jsx("span", { className: "dp-rule-chip", children: r.replace('rule-', '') }, r))), snapshot.agentDecision.rulesApplied.length === 0 && (_jsx("span", { className: "dp-rule-chip dp-rule-chip--none", children: "nenhuma disparada" }))] })] })] })) }), _jsx(PipelineArrow, { active: !!snapshot }), _jsx(PipelineStep, { step: 4, icon: "\u26A1", title: "Decis\u00E3o Final", subtitle: "Resultado aut\u00F4nomo", active: !!snapshot, flash: flash, decision: snapshot?.agentDecision.decision, children: snapshot && (_jsxs("div", { className: "dp-step-decision", children: [_jsx(DecisionBadge, { decision: snapshot.agentDecision.decision, large: true }), _jsx("p", { className: "dp-reasoning", children: snapshot.agentDecision.reasoning }), _jsx("div", { className: "dp-auto-tag", children: snapshot.agentDecision.isAuto ? '🤖 Decisão Automática' : '👤 Decisão Manual' })] })) })] })] }), _jsxs("div", { className: "demo-bottom-grid", children: [_jsxs("div", { className: "demo-rules-section", children: [_jsx("div", { className: "demo-section-title", children: "\u2699\uFE0F Motor de Regras \u2014 Por que essa decis\u00E3o?" }), _jsx("p", { className: "demo-section-desc", children: "Cada regra \u00E9 avaliada em sequ\u00EAncia. As regras destacadas foram ativadas e influenciaram a decis\u00E3o final." }), _jsx("div", { className: "dp-rules-grid", children: RULE_DEFS.map(rule => (_jsx(RuleCard, { rule: rule, fired: !!snapshot?.agentDecision.rulesApplied.includes(rule.id), snapshot: snapshot }, rule.id))) }), snapshot && (_jsxs("div", { className: "demo-reasoning-block", children: [_jsx("div", { className: "demo-reasoning-title", children: "\uD83D\uDCAC Racioc\u00EDnio completo do agente:" }), _jsxs("div", { className: "demo-reasoning-text", children: ["\"", snapshot.agentDecision.reasoning, "\""] }), snapshot.validation.motivo && (_jsxs("div", { className: "demo-reasoning-validation", children: [_jsx("strong", { children: "Valida\u00E7\u00E3o:" }), " ", snapshot.validation.motivo] })), (snapshot.validation.alerts ?? []).length > 0 && (_jsxs("div", { className: "demo-recommendations", children: [_jsx("strong", { children: "Alertas detectados:" }), _jsx("ul", { children: snapshot.validation.alerts.map((a, i) => (_jsx("li", { children: alertToString(a) }, i))) })] })), (snapshot.validation.recommendations ?? []).length > 0 && (_jsxs("div", { className: "demo-recommendations", children: [_jsx("strong", { children: "Recomenda\u00E7\u00F5es:" }), _jsx("ul", { children: snapshot.validation.recommendations.map((r, i) => _jsx("li", { children: r }, i)) })] }))] }))] }), _jsxs("div", { className: "demo-history-section", children: [_jsx("div", { className: "demo-section-title", children: "\uD83D\uDCDC Hist\u00F3rico ao Vivo" }), _jsx("p", { className: "demo-section-desc", children: "\u00DAltimas decis\u00F5es tomadas pelo agente em tempo real." }), _jsx("div", { className: "dp-history-feed", children: history.length === 0 ? (_jsxs("div", { className: "demo-empty-state", children: [_jsx("div", { className: "demo-empty-icon", children: "\uD83E\uDD16" }), _jsx("div", { className: "demo-empty-text", children: "Inicie o demo ou use \"Passo a Passo\" para ver decis\u00F5es ao vivo" })] })) : (history.map((item, idx) => (_jsx(HistoryItem, { item: item, isLatest: idx === 0 }, item.recordId)))) })] })] })] }));
};
export const DemoProTab = () => (_jsx(DemoErrorBoundary, { children: _jsx(DemoProTabInner, {}) }));
export default DemoProTab;
