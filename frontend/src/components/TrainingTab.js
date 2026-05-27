import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../styles/TrainingTab.css';
// ─── Constants ────────────────────────────────────────────────────────────────
const BEHAVIOR_META = {
    APPROVE: { icon: '✅', label: 'Aprovar', color: '#10b981' },
    REJECT: { icon: '❌', label: 'Rejeitar', color: '#ef4444' },
    FLAG: { icon: '🚩', label: 'Marcar', color: '#f59e0b' },
    NEUTRAL: { icon: '⚪', label: 'Neutro', color: '#6b7280' },
    CUSTOM: { icon: '⚙️', label: 'Custom', color: '#a855f7' },
};
const STATUS_META = {
    COLD: { color: '#6b7280', label: 'Frio', pct: 15, desc: 'Aguardando dados de treino' },
    LEARNING: { color: '#3b82f6', label: 'Aprendendo', pct: 45, desc: 'Modelo evoluindo' },
    TRAINED: { color: '#a855f7', label: 'Treinado', pct: 75, desc: 'Padrões consolidados' },
    EXPERT: { color: '#10b981', label: 'Expert', pct: 100, desc: 'Alta precisão' },
};
// ─── Sub Components ───────────────────────────────────────────────────────────
const ConfidenceBar = ({ value, color = '#3b82f6', small }) => (_jsxs("div", { className: `tt-conf-bar${small ? ' tt-conf-bar--small' : ''}`, children: [_jsx("div", { className: "tt-conf-bar-fill", style: { width: `${Math.max(0, Math.min(100, value))}%`, background: color } }), _jsxs("span", { className: "tt-conf-bar-label", children: [Math.round(value), "%"] })] }));
const ModelStatusBadge = ({ status, pulse }) => {
    const meta = STATUS_META[status];
    return (_jsxs("div", { className: `tt-status-badge${pulse ? ' tt-status-badge--pulse' : ''}`, style: { borderColor: meta.color, color: meta.color }, children: [_jsx("span", { className: "tt-status-dot", style: { background: meta.color } }), _jsxs("span", { className: "tt-status-label", children: ["MODELO ", meta.label.toUpperCase()] }), _jsxs("span", { className: "tt-status-pct", children: [meta.pct, "%"] })] }));
};
const EvolutionChart = ({ data }) => {
    const W = 600;
    const H = 160;
    const padding = { top: 12, right: 12, bottom: 22, left: 32 };
    const chart = useMemo(() => {
        if (data.length === 0)
            return null;
        const points = data.slice(-50);
        const xs = points.map((_, i) => i);
        const ys = points.map((p) => p.accuracy);
        const maxX = Math.max(1, xs[xs.length - 1]);
        const minY = 0;
        const maxY = 100;
        const sx = (x) => padding.left + (x / maxX) * (W - padding.left - padding.right);
        const sy = (y) => H - padding.bottom - ((y - minY) / (maxY - minY)) * (H - padding.top - padding.bottom);
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(xs[i])},${sy(p.accuracy)}`).join(' ');
        const area = `${path} L${sx(xs[xs.length - 1])},${sy(0)} L${sx(0)},${sy(0)} Z`;
        return { points, sx, sy, path, area, xs, ys };
    }, [data]);
    if (!chart) {
        return (_jsxs("div", { className: "tt-chart-empty", children: [_jsx("div", { className: "tt-chart-empty-icon", children: "\uD83D\uDCC8" }), _jsx("p", { children: "Sem hist\u00F3rico ainda. Cadastre exemplos e envie feedbacks para ver a evolu\u00E7\u00E3o." })] }));
    }
    return (_jsxs("svg", { viewBox: `0 0 ${W} ${H}`, className: "tt-chart", preserveAspectRatio: "none", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "evoFill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#3b82f6", stopOpacity: "0.4" }), _jsx("stop", { offset: "100%", stopColor: "#3b82f6", stopOpacity: "0" })] }) }), [0, 25, 50, 75, 100].map((g) => {
                const y = chart.sy(g);
                return (_jsxs("g", { children: [_jsx("line", { x1: padding.left, x2: W - padding.right, y1: y, y2: y, stroke: "rgba(255,255,255,0.06)", strokeDasharray: g === 50 ? '0' : '3,4' }), _jsxs("text", { x: 4, y: y + 3, fill: "#4b5563", fontSize: "9", children: [g, "%"] })] }, g));
            }), _jsx("path", { d: chart.area, fill: "url(#evoFill)" }), _jsx("path", { d: chart.path, fill: "none", stroke: "#3b82f6", strokeWidth: "2", strokeLinejoin: "round" }), chart.points.map((p, i) => (_jsx("circle", { cx: chart.sx(i), cy: chart.sy(p.accuracy), r: i === chart.points.length - 1 ? 4 : 2, fill: i === chart.points.length - 1 ? '#10b981' : '#3b82f6' }, i)))] }));
};
const ExampleCard = ({ example, onFeedback, onDelete, onBoostChange }) => {
    const meta = BEHAVIOR_META[example.expectedBehavior];
    const [expanded, setExpanded] = useState(false);
    return (_jsxs("div", { className: "tt-example-card", style: { borderLeftColor: meta.color }, children: [_jsxs("div", { className: "tt-example-header", onClick: () => setExpanded((v) => !v), children: [_jsx("div", { className: "tt-example-icon", style: { background: meta.color }, children: meta.icon }), _jsxs("div", { className: "tt-example-main", children: [_jsx("div", { className: "tt-example-q", children: example.idealQuestion }), _jsxs("div", { className: "tt-example-meta", children: [_jsx("span", { className: "tt-example-behavior", style: { color: meta.color }, children: meta.label }), _jsx("span", { className: "tt-example-id", children: example.id }), example.appliedCount > 0 && (_jsxs("span", { className: "tt-example-applied", children: ["\uD83C\uDFAF usado ", example.appliedCount, "x"] }))] })] }), _jsx("div", { className: "tt-example-conf", children: _jsx(ConfidenceBar, { value: example.confidence, color: meta.color, small: true }) })] }), expanded && (_jsxs("div", { className: "tt-example-body", children: [_jsxs("div", { className: "tt-example-section", children: [_jsx("span", { className: "tt-example-label", children: "Resposta ideal" }), _jsx("p", { children: example.idealAnswer })] }), example.context && (_jsxs("div", { className: "tt-example-section", children: [_jsx("span", { className: "tt-example-label", children: "Contexto" }), _jsx("p", { children: example.context })] })), example.keywords.length > 0 && (_jsxs("div", { className: "tt-example-section", children: [_jsx("span", { className: "tt-example-label", children: "Palavras-chave" }), _jsx("div", { className: "tt-kw-chips", children: example.keywords.map((k) => _jsx("span", { className: "tt-kw-chip", children: k }, k)) })] })), _jsxs("div", { className: "tt-example-counters", children: [_jsxs("span", { className: "tt-counter tt-counter--pos", children: ["\uD83D\uDC4D ", example.positiveCount] }), _jsxs("span", { className: "tt-counter tt-counter--neg", children: ["\uD83D\uDC4E ", example.negativeCount] }), _jsxs("span", { className: "tt-counter", children: ["\uD83D\uDCCA ", example.confidence, "% confian\u00E7a"] })] }), _jsxs("div", { className: "tt-example-boost", children: [_jsx("label", { children: "Priority Boost" }), _jsx("input", { type: "range", min: -50, max: 50, value: example.priorityBoost, onChange: (e) => onBoostChange(example.id, parseInt(e.target.value, 10)) }), _jsx("span", { children: example.priorityBoost > 0 ? `+${example.priorityBoost}` : example.priorityBoost })] }), _jsxs("div", { className: "tt-example-actions", children: [_jsx("button", { className: "tt-btn tt-btn--pos", onClick: () => onFeedback(example.id, 'positive'), children: "\uD83D\uDC4D Refor\u00E7ar" }), _jsx("button", { className: "tt-btn tt-btn--neg", onClick: () => onFeedback(example.id, 'negative'), children: "\uD83D\uDC4E Penalizar" }), _jsx("button", { className: "tt-btn tt-btn--ghost", onClick: () => onDelete(example.id), children: "\uD83D\uDDD1 Remover" })] })] }))] }));
};
// ─── Main Component ───────────────────────────────────────────────────────────
export const TrainingTab = () => {
    const [subTab, setSubTab] = useState('overview');
    const [examples, setExamples] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 2800);
    };
    const loadAll = useCallback(async () => {
        try {
            const [exRes, anRes, fbRes] = await Promise.all([
                axios.get('/api/training/examples'),
                axios.get('/api/training/analytics'),
                axios.get('/api/training/feedback'),
            ]);
            setExamples(Array.isArray(exRes.data) ? exRes.data : []);
            setAnalytics(anRes.data);
            setFeedback(Array.isArray(fbRes.data) ? fbRes.data : []);
        }
        catch (e) {
            console.error('Erro ao carregar dados de treinamento:', e);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        loadAll();
        const id = setInterval(loadAll, 10000);
        return () => clearInterval(id);
    }, [loadAll]);
    // ── Handlers ────────────────────────────────────────────────────────────
    const handleFeedback = async (exampleId, rating) => {
        try {
            await axios.post('/api/training/feedback', { exampleId, rating });
            showToast('success', rating === 'positive' ? '👍 Reforço positivo aplicado' : '👎 Penalidade aplicada');
            loadAll();
        }
        catch {
            showToast('error', 'Erro ao registrar feedback');
        }
    };
    const handleDelete = async (id) => {
        if (!window.confirm('Remover este exemplo do treinamento?'))
            return;
        try {
            await axios.delete(`/api/training/examples/${id}`);
            showToast('success', 'Exemplo removido');
            loadAll();
        }
        catch {
            showToast('error', 'Erro ao remover');
        }
    };
    const handleBoost = async (id, boost) => {
        setExamples((prev) => prev.map((e) => e.id === id ? { ...e, priorityBoost: boost } : e));
        try {
            await axios.patch(`/api/training/examples/${id}`, { priorityBoost: boost });
        }
        catch {
            showToast('error', 'Erro ao ajustar boost');
        }
    };
    // ── Render ──────────────────────────────────────────────────────────────
    if (loading) {
        return (_jsx("div", { className: "training-tab-root", children: _jsxs("div", { className: "tt-loading", children: [_jsx("div", { className: "tt-loading-orb" }), _jsx("p", { children: "Carregando modelo de treinamento..." })] }) }));
    }
    const a = analytics;
    const evolving = !!a && a.modelStatus === 'LEARNING';
    return (_jsxs("div", { className: "training-tab-root", children: [toast && (_jsx("div", { className: `tt-toast tt-toast--${toast.type}`, children: toast.msg })), _jsxs("div", { className: "tt-header", children: [_jsxs("div", { className: "tt-header-left", children: [_jsxs("div", { className: "tt-header-title-row", children: [_jsx("h2", { className: "tt-title", children: "\uD83E\uDDE0 Centro de Treinamento" }), a && _jsx(ModelStatusBadge, { status: a.modelStatus, pulse: evolving })] }), _jsx("p", { className: "tt-subtitle", children: "Sistema de aprendizado cont\u00EDnuo com mem\u00F3ria vetorial, reinforcement feedback e adaptive response engine" })] }), _jsx("div", { className: "tt-header-right", children: a && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tt-kpi", children: [_jsxs("div", { className: "tt-kpi-value", children: [a.accuracyRate, "%"] }), _jsx("div", { className: "tt-kpi-label", children: "Precis\u00E3o" })] }), _jsxs("div", { className: "tt-kpi", children: [_jsx("div", { className: "tt-kpi-value", children: a.totalExamples }), _jsx("div", { className: "tt-kpi-label", children: "Exemplos" })] }), _jsxs("div", { className: "tt-kpi", children: [_jsxs("div", { className: "tt-kpi-value", children: [a.avgConfidence, "%"] }), _jsx("div", { className: "tt-kpi-label", children: "Confian\u00E7a" })] })] })) })] }), _jsx("div", { className: "tt-subtabs", children: [
                    ['overview', '📊 Visão Geral'],
                    ['auto', '🤖 Auto-Training'],
                    ['library', '📚 Biblioteca'],
                    ['create', '➕ Treinar Manual'],
                    ['feedback', '💬 Feedback'],
                    ['playground', '🔬 Playground'],
                ].map(([k, label]) => (_jsx("button", { className: `tt-subtab${subTab === k ? ' tt-subtab--active' : ''}`, onClick: () => setSubTab(k), children: label }, k))) }), subTab === 'overview' && a && _jsx(OverviewPanel, { analytics: a }), subTab === 'auto' && _jsx(AutoTrainPanel, { onActivity: loadAll }), subTab === 'library' && (_jsx(LibraryPanel, { examples: examples, onFeedback: handleFeedback, onDelete: handleDelete, onBoost: handleBoost })), subTab === 'create' && _jsx(CreatePanel, { onCreated: () => { loadAll(); showToast('success', '✅ Exemplo treinado e indexado'); setSubTab('library'); } }), subTab === 'feedback' && _jsx(FeedbackPanel, { feedback: feedback, examples: examples }), subTab === 'playground' && _jsx(PlaygroundPanel, {})] }));
};
// ─── Overview Panel ───────────────────────────────────────────────────────────
const OverviewPanel = ({ analytics: a }) => (_jsxs("div", { className: "tt-overview", children: [_jsxs("div", { className: "tt-overview-grid", children: [_jsxs("div", { className: "tt-card tt-card--primary", children: [_jsxs("div", { className: "tt-card-header", children: [_jsx("span", { className: "tt-card-icon", children: "\uD83D\uDCC8" }), _jsx("h3", { children: "Evolu\u00E7\u00E3o da Precis\u00E3o" }), _jsxs("span", { className: "tt-card-badge", children: ["\u00FAltimos ", Math.min(a.evolutionTrend.length, 50), " pontos"] })] }), _jsx(EvolutionChart, { data: a.evolutionTrend })] }), _jsxs("div", { className: "tt-card", children: [_jsxs("div", { className: "tt-card-header", children: [_jsx("span", { className: "tt-card-icon", children: "\uD83C\uDFAF" }), _jsx("h3", { children: "Feedback Distribution" })] }), _jsxs("div", { className: "tt-fb-distribution", children: [_jsxs("div", { className: "tt-fb-row", children: [_jsx("span", { children: "\uD83D\uDC4D Positivos" }), _jsx("strong", { style: { color: '#10b981' }, children: a.positiveFeedbacks })] }), _jsx(ConfidenceBar, { value: a.totalFeedbacks > 0 ? (a.positiveFeedbacks / a.totalFeedbacks) * 100 : 0, color: "#10b981" }), _jsxs("div", { className: "tt-fb-row", children: [_jsx("span", { children: "\uD83D\uDC4E Negativos" }), _jsx("strong", { style: { color: '#ef4444' }, children: a.negativeFeedbacks })] }), _jsx(ConfidenceBar, { value: a.totalFeedbacks > 0 ? (a.negativeFeedbacks / a.totalFeedbacks) * 100 : 0, color: "#ef4444" }), _jsxs("div", { className: "tt-fb-row tt-fb-row--total", children: [_jsx("span", { children: "Total" }), _jsx("strong", { children: a.totalFeedbacks })] })] })] }), _jsxs("div", { className: "tt-card", children: [_jsxs("div", { className: "tt-card-header", children: [_jsx("span", { className: "tt-card-icon", children: "\uD83C\uDFC6" }), _jsx("h3", { children: "Top Exemplos" }), _jsx("span", { className: "tt-card-badge", children: "por confian\u00E7a" })] }), _jsxs("div", { className: "tt-list", children: [a.topExamples.length === 0 && _jsx("div", { className: "tt-empty", children: "Nenhum exemplo treinado ainda" }), a.topExamples.map((ex) => {
                                    const meta = BEHAVIOR_META[ex.expectedBehavior];
                                    return (_jsxs("div", { className: "tt-list-item", children: [_jsx("span", { className: "tt-list-icon", style: { background: meta.color }, children: meta.icon }), _jsxs("div", { className: "tt-list-content", children: [_jsxs("div", { className: "tt-list-title", children: [ex.idealQuestion.slice(0, 60), ex.idealQuestion.length > 60 ? '…' : ''] }), _jsx(ConfidenceBar, { value: ex.confidence, color: meta.color, small: true })] })] }, ex.id));
                                })] })] }), _jsxs("div", { className: "tt-card", children: [_jsxs("div", { className: "tt-card-header", children: [_jsx("span", { className: "tt-card-icon", children: "\u26A0\uFE0F" }), _jsx("h3", { children: "Necessitam Refor\u00E7o" }), _jsx("span", { className: "tt-card-badge", children: "menor confian\u00E7a" })] }), _jsxs("div", { className: "tt-list", children: [a.weakExamples.length === 0 && _jsx("div", { className: "tt-empty", children: "Nenhum exemplo cadastrado" }), a.weakExamples.map((ex) => {
                                    const meta = BEHAVIOR_META[ex.expectedBehavior];
                                    return (_jsxs("div", { className: "tt-list-item", children: [_jsx("span", { className: "tt-list-icon", style: { background: meta.color }, children: meta.icon }), _jsxs("div", { className: "tt-list-content", children: [_jsxs("div", { className: "tt-list-title", children: [ex.idealQuestion.slice(0, 60), ex.idealQuestion.length > 60 ? '…' : ''] }), _jsx(ConfidenceBar, { value: ex.confidence, color: meta.color, small: true })] })] }, ex.id));
                                })] })] })] }), _jsxs("div", { className: "tt-concepts", children: [_jsx("h4", { children: "\uD83C\uDF93 Conceitos aplicados neste sistema" }), _jsxs("div", { className: "tt-concepts-grid", children: [_jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Vector Memory" }), _jsx("p", { children: "Embeddings TF-IDF sobre bag-of-words com boost em keywords" })] }), _jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Cosine Similarity" }), _jsx("p", { children: "Retrieval de exemplos relevantes via produto escalar normalizado" })] }), _jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Reinforcement Feedback" }), _jsx("p", { children: "Confidence via Laplace smoothing sobre \uD83D\uDC4D/\uD83D\uDC4E" })] }), _jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Adaptive Response" }), _jsx("p", { children: "Agent consulta exemplos antes de decidir e ajusta comportamento" })] }), _jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Contextual Learning" }), _jsx("p", { children: "Cada exemplo carrega pergunta, resposta, comportamento e contexto" })] }), _jsxs("div", { className: "tt-concept", children: [_jsx("strong", { children: "Temporal Decay" }), _jsx("p", { children: "Exemplos rec\u00E9m-usados ganham peso no ranking adaptativo" })] })] })] })] }));
// ─── Library Panel ────────────────────────────────────────────────────────────
const LibraryPanel = ({ examples, onFeedback, onDelete, onBoost }) => {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        return examples
            .filter((e) => filter === 'all' ? true : e.expectedBehavior === filter)
            .filter((e) => query.trim() === '' ? true :
            (e.idealQuestion + ' ' + e.idealAnswer + ' ' + e.keywords.join(' '))
                .toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => b.confidence - a.confidence);
    }, [examples, filter, query]);
    return (_jsxs("div", { className: "tt-library", children: [_jsxs("div", { className: "tt-library-toolbar", children: [_jsx("input", { className: "tt-input", placeholder: "\uD83D\uDD0D Buscar exemplos...", value: query, onChange: (e) => setQuery(e.target.value) }), _jsx("div", { className: "tt-filter-row", children: ['all', 'APPROVE', 'REJECT', 'FLAG', 'NEUTRAL', 'CUSTOM'].map((k) => (_jsx("button", { className: `tt-filter${filter === k ? ' tt-filter--active' : ''}`, onClick: () => setFilter(k), children: k === 'all' ? 'Todos' : BEHAVIOR_META[k].label }, k))) })] }), filtered.length === 0 ? (_jsxs("div", { className: "tt-empty-state", children: [_jsx("div", { className: "tt-empty-icon", children: "\uD83D\uDCED" }), _jsx("p", { children: "Nenhum exemplo encontrado." }), _jsxs("p", { className: "tt-empty-hint", children: ["Use a aba ", _jsx("strong", { children: "\u2795 Treinar" }), " para come\u00E7ar."] })] })) : (_jsx("div", { className: "tt-examples-grid", children: filtered.map((ex) => (_jsx(ExampleCard, { example: ex, onFeedback: onFeedback, onDelete: onDelete, onBoostChange: onBoost }, ex.id))) }))] }));
};
// ─── Create Panel ─────────────────────────────────────────────────────────────
const CreatePanel = ({ onCreated }) => {
    const [form, setForm] = useState({
        idealQuestion: '',
        idealAnswer: '',
        expectedBehavior: 'APPROVE',
        context: '',
        keywordsRaw: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async () => {
        setError(null);
        if (!form.idealQuestion.trim() || !form.idealAnswer.trim()) {
            setError('Pergunta e resposta ideal são obrigatórias.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('/api/training/examples', {
                idealQuestion: form.idealQuestion.trim(),
                idealAnswer: form.idealAnswer.trim(),
                expectedBehavior: form.expectedBehavior,
                context: form.context.trim(),
                keywords: form.keywordsRaw.split(',').map((s) => s.trim()).filter(Boolean),
            });
            setForm({ idealQuestion: '', idealAnswer: '', expectedBehavior: 'APPROVE', context: '', keywordsRaw: '' });
            onCreated();
        }
        catch (e) {
            setError(e?.response?.data?.message || 'Erro ao salvar exemplo');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { className: "tt-create", children: [_jsxs("div", { className: "tt-create-header", children: [_jsx("h3", { children: "Treinar novo padr\u00E3o" }), _jsx("p", { children: "O exemplo ser\u00E1 indexado via embedding vetorial e consultado pelo agente em decis\u00F5es futuras." })] }), _jsxs("div", { className: "tt-form", children: [_jsxs("div", { className: "tt-field", children: [_jsxs("label", { children: ["Pergunta / Cen\u00E1rio ideal ", _jsx("span", { className: "tt-req", children: "*" })] }), _jsx("input", { type: "text", className: "tt-input", placeholder: "Ex: Notebook Dell com qualidade 95% e categoria Eletr\u00F4nicos", value: form.idealQuestion, onChange: (e) => update('idealQuestion', e.target.value) })] }), _jsxs("div", { className: "tt-field", children: [_jsxs("label", { children: ["Resposta / Decis\u00E3o ideal ", _jsx("span", { className: "tt-req", children: "*" })] }), _jsx("textarea", { className: "tt-textarea", placeholder: "Ex: Aprovar automaticamente \u2014 alta qualidade, marca conhecida, pre\u00E7o dentro do esperado", rows: 3, value: form.idealAnswer, onChange: (e) => update('idealAnswer', e.target.value) })] }), _jsxs("div", { className: "tt-field", children: [_jsx("label", { children: "Comportamento esperado" }), _jsx("div", { className: "tt-behavior-pick", children: ['APPROVE', 'REJECT', 'FLAG', 'NEUTRAL'].map((b) => {
                                    const meta = BEHAVIOR_META[b];
                                    const active = form.expectedBehavior === b;
                                    return (_jsxs("button", { type: "button", className: `tt-behavior-btn${active ? ' tt-behavior-btn--active' : ''}`, style: active ? { background: meta.color, borderColor: meta.color, color: '#fff' } : { color: meta.color, borderColor: meta.color }, onClick: () => update('expectedBehavior', b), children: [_jsx("span", { children: meta.icon }), _jsx("span", { children: meta.label })] }, b));
                                }) })] }), _jsxs("div", { className: "tt-field", children: [_jsx("label", { children: "Contexto adicional" }), _jsx("textarea", { className: "tt-textarea", placeholder: "Ex: Itens de eletr\u00F4nicos com marca reconhecida e nota fiscal usualmente seguem este padr\u00E3o", rows: 2, value: form.context, onChange: (e) => update('context', e.target.value) })] }), _jsxs("div", { className: "tt-field", children: [_jsx("label", { children: "Palavras-chave (separadas por v\u00EDrgula)" }), _jsx("input", { type: "text", className: "tt-input", placeholder: "notebook, eletr\u00F4nicos, alta qualidade", value: form.keywordsRaw, onChange: (e) => update('keywordsRaw', e.target.value) }), _jsx("small", { children: "Termos com 3\u00D7 boost no embedding vetorial" })] }), error && _jsx("div", { className: "tt-error", children: error }), _jsx("div", { className: "tt-form-actions", children: _jsx("button", { className: "tt-btn tt-btn--primary tt-btn--lg", disabled: submitting, onClick: submit, children: submitting ? '⏳ Indexando...' : '🧠 Treinar Agente' }) })] })] }));
};
// ─── Feedback Panel ───────────────────────────────────────────────────────────
const FeedbackPanel = ({ feedback, examples }) => {
    const exMap = useMemo(() => new Map(examples.map((e) => [e.id, e])), [examples]);
    if (feedback.length === 0) {
        return (_jsxs("div", { className: "tt-empty-state", children: [_jsx("div", { className: "tt-empty-icon", children: "\uD83D\uDCAC" }), _jsx("p", { children: "Nenhum feedback registrado ainda." }), _jsx("p", { className: "tt-empty-hint", children: "Use os bot\u00F5es \uD83D\uDC4D / \uD83D\uDC4E na biblioteca para refor\u00E7ar ou penalizar padr\u00F5es." })] }));
    }
    return (_jsxs("div", { className: "tt-feedback", children: [_jsx("h3", { className: "tt-section-title", children: "Hist\u00F3rico de Reinforcement Signals" }), _jsx("div", { className: "tt-feedback-list", children: feedback.map((fb) => {
                    const ex = fb.exampleId ? exMap.get(fb.exampleId) : undefined;
                    const time = new Date(fb.timestamp).toLocaleString('pt-BR');
                    return (_jsxs("div", { className: `tt-fb-item tt-fb-item--${fb.rating}`, children: [_jsx("span", { className: "tt-fb-rating", children: fb.rating === 'positive' ? '👍' : '👎' }), _jsxs("div", { className: "tt-fb-content", children: [_jsx("div", { className: "tt-fb-title", children: ex
                                            ? _jsxs(_Fragment, { children: ["Refor\u00E7o em ", _jsxs("strong", { children: [ex.idealQuestion.slice(0, 60), ex.idealQuestion.length > 60 ? '…' : ''] })] })
                                            : fb.decisionRecordId
                                                ? _jsxs(_Fragment, { children: ["Feedback sobre decis\u00E3o ", _jsx("code", { children: fb.decisionRecordId })] })
                                                : 'Feedback geral' }), fb.notes && _jsxs("div", { className: "tt-fb-notes", children: ["\"", fb.notes, "\""] }), _jsx("div", { className: "tt-fb-time", children: time })] })] }, fb.id));
                }) })] }));
};
// ─── Playground Panel ─────────────────────────────────────────────────────────
const PlaygroundPanel = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [suggestion, setSuggestion] = useState(null);
    const [searching, setSearching] = useState(false);
    const run = async () => {
        if (!query.trim())
            return;
        setSearching(true);
        setSuggestion(null);
        try {
            const [matchRes, sugRes] = await Promise.all([
                axios.get(`/api/training/match?q=${encodeURIComponent(query)}&topK=5`),
                axios.post('/api/training/suggest', { query }),
            ]);
            setResults(Array.isArray(matchRes.data) ? matchRes.data : []);
            setSuggestion(sugRes.data);
        }
        catch {
            setResults([]);
        }
        finally {
            setSearching(false);
        }
    };
    return (_jsxs("div", { className: "tt-playground", children: [_jsxs("div", { className: "tt-pg-header", children: [_jsx("h3", { children: "\uD83D\uDD2C Playground de Retrieval" }), _jsx("p", { children: "Teste como o agente consulta a mem\u00F3ria vetorial antes de responder. Digite um cen\u00E1rio e veja os exemplos mais pr\u00F3ximos." })] }), _jsxs("div", { className: "tt-pg-input-row", children: [_jsx("input", { className: "tt-input tt-input--lg", placeholder: "Ex: Smart TV LG 55 polegadas eletr\u00F4nicos qualidade 90%", value: query, onChange: (e) => setQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && run() }), _jsx("button", { className: "tt-btn tt-btn--primary", onClick: run, disabled: searching, children: searching ? '⏳' : '🚀 Consultar' })] }), suggestion && (_jsxs("div", { className: `tt-pg-suggestion${suggestion.influencedByTraining ? ' tt-pg-suggestion--strong' : ''}`, children: [_jsxs("div", { className: "tt-pg-sug-header", children: [_jsx("span", { children: "\uD83E\uDD16 Adaptive Response Engine" }), suggestion.influencedByTraining && _jsx("span", { className: "tt-pg-strong-badge", children: "MATCH FORTE" })] }), suggestion.matched ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tt-pg-sug-row", children: [_jsx("span", { children: "Comportamento sugerido:" }), _jsxs("strong", { style: { color: BEHAVIOR_META[suggestion.suggestedBehavior]?.color }, children: [BEHAVIOR_META[suggestion.suggestedBehavior]?.icon, " ", BEHAVIOR_META[suggestion.suggestedBehavior]?.label] })] }), _jsxs("div", { className: "tt-pg-sug-row", children: [_jsx("span", { children: "Ajuste de confian\u00E7a:" }), _jsxs("strong", { style: { color: suggestion.confidenceBoost >= 0 ? '#10b981' : '#ef4444' }, children: [suggestion.confidenceBoost > 0 ? '+' : '', suggestion.confidenceBoost, " pts"] })] }), _jsxs("div", { className: "tt-pg-sug-reasoning", children: ["\"", suggestion.suggestedReasoning, "\""] })] })) : (_jsx("div", { className: "tt-pg-sug-empty", children: "Nenhum match acima do threshold. O agente decidir\u00E1 apenas pelas regras." }))] })), _jsxs("h4", { className: "tt-section-title", children: ["Top ", results.length, " matches por similarity"] }), _jsx("div", { className: "tt-pg-results", children: results.length === 0 ? (_jsx("div", { className: "tt-empty-hint", children: "Sem resultados. Cadastre exemplos primeiro." })) : results.map((m, i) => {
                    const meta = BEHAVIOR_META[m.example.expectedBehavior];
                    return (_jsxs("div", { className: "tt-pg-result", children: [_jsxs("div", { className: "tt-pg-rank", children: ["#", i + 1] }), _jsxs("div", { className: "tt-pg-result-main", children: [_jsxs("div", { className: "tt-pg-result-q", children: [_jsx("span", { style: { color: meta.color }, children: meta.icon }), " ", m.example.idealQuestion] }), _jsxs("div", { className: "tt-pg-result-meta", children: [_jsxs("span", { children: ["similarity ", _jsxs("strong", { children: [(m.similarity * 100).toFixed(1), "%"] })] }), _jsxs("span", { children: ["confidence ", _jsxs("strong", { children: [m.example.confidence, "%"] })] }), _jsxs("span", { children: ["rank score ", _jsx("strong", { children: m.rankScore.toFixed(3) })] }), m.matchedKeywords.length > 0 && (_jsxs("span", { children: ["kw: ", m.matchedKeywords.map((k) => _jsx("code", { children: k }, k))] }))] }), _jsx("div", { className: "tt-pg-similarity-bar", children: _jsx("div", { className: "tt-pg-similarity-fill", style: { width: `${m.similarity * 100}%`, background: meta.color } }) })] })] }, m.example.id));
                }) })] }));
};
// ─── Auto-Training Panel ──────────────────────────────────────────────────────
const AutoTrainPanel = ({ onActivity }) => {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [intervalSec, setIntervalSec] = useState(15);
    const load = useCallback(async () => {
        try {
            const res = await axios.get('/api/training/auto/status');
            setStatus(res.data);
        }
        catch (e) {
            console.error('auto status:', e);
        }
    }, []);
    useEffect(() => {
        load();
        const id = setInterval(load, 2500);
        return () => clearInterval(id);
    }, [load]);
    const toggleEnabled = async () => {
        if (!status)
            return;
        setBusy(true);
        try {
            const res = await axios.post('/api/training/auto/toggle', {
                enabled: !status.enabled,
                intervalMs: intervalSec * 1000,
            });
            setStatus(res.data);
            onActivity();
        }
        finally {
            setBusy(false);
        }
    };
    const runNow = async () => {
        setBusy(true);
        try {
            const res = await axios.post('/api/training/auto/run-now');
            setStatus(res.data);
            onActivity();
        }
        finally {
            setBusy(false);
        }
    };
    if (!status) {
        return (_jsxs("div", { className: "tt-loading", children: [_jsx("div", { className: "tt-loading-orb" }), _jsx("p", { children: "Conectando ao Auto-Training Engine..." })] }));
    }
    const eventIcon = (type) => ({
        CYCLE_START: '🔁',
        CYCLE_END: '✅',
        EXAMPLE_CREATED: '✨',
        EXAMPLE_REINFORCED: '👍',
        EXAMPLE_PENALIZED: '👎',
        SKIPPED: '⏸',
    })[type] || '•';
    const eventColor = (type) => ({
        CYCLE_START: '#3b82f6',
        CYCLE_END: '#10b981',
        EXAMPLE_CREATED: '#a855f7',
        EXAMPLE_REINFORCED: '#10b981',
        EXAMPLE_PENALIZED: '#ef4444',
        SKIPPED: '#6b7280',
    })[type] || '#6b7280';
    const lastTime = status.lastCycleAt ? new Date(status.lastCycleAt).toLocaleTimeString('pt-BR') : '—';
    const nextTime = status.nextCycleAt ? new Date(status.nextCycleAt).toLocaleTimeString('pt-BR') : '—';
    return (_jsxs("div", { className: "tt-auto-root", children: [_jsxs("div", { className: `tt-auto-hero${status.enabled ? ' tt-auto-hero--on' : ''}`, children: [_jsx("div", { className: "tt-auto-hero-bg" }), _jsxs("div", { className: "tt-auto-hero-content", children: [_jsxs("div", { className: "tt-auto-hero-left", children: [_jsxs("div", { className: "tt-auto-hero-title", children: [_jsx("span", { className: "tt-auto-hero-icon", children: "\uD83E\uDD16" }), _jsxs("div", { children: [_jsx("h3", { children: "Self-Supervised Auto-Training" }), _jsx("p", { children: "O agente analisa suas pr\u00F3prias decis\u00F5es e extrai padr\u00F5es automaticamente" })] })] }), _jsxs("div", { className: "tt-auto-status-line", children: [_jsxs("span", { className: `tt-auto-pill${status.enabled ? ' tt-auto-pill--on' : ''}`, children: [_jsx("span", { className: "tt-auto-pill-dot" }), status.enabled ? 'ATIVO' : 'PAUSADO'] }), status.isRunningCycle && (_jsxs("span", { className: "tt-auto-pill tt-auto-pill--running", children: [_jsx("span", { className: "tt-auto-spinner" }), "PROCESSANDO CICLO"] })), status.enabled && !status.isRunningCycle && (_jsxs("span", { className: "tt-auto-pill tt-auto-pill--waiting", children: ["\u23F1 pr\u00F3ximo: ", nextTime] }))] })] }), _jsxs("div", { className: "tt-auto-hero-right", children: [_jsxs("div", { className: "tt-auto-interval", children: [_jsx("label", { children: "Intervalo (segundos)" }), _jsx("input", { type: "range", min: 3, max: 60, step: 1, value: intervalSec, onChange: (e) => setIntervalSec(parseInt(e.target.value, 10)) }), _jsxs("span", { children: [intervalSec, "s"] })] }), _jsxs("div", { className: "tt-auto-actions", children: [_jsx("button", { className: `tt-btn tt-btn--lg ${status.enabled ? 'tt-btn--neg' : 'tt-btn--primary'}`, onClick: toggleEnabled, disabled: busy, children: status.enabled ? '⏸ Pausar' : '▶ Ativar Aprendizado' }), _jsx("button", { className: "tt-btn", onClick: runNow, disabled: busy || status.isRunningCycle, children: "\u26A1 Rodar Ciclo Agora" })] })] })] })] }), _jsxs("div", { className: "tt-auto-stats", children: [_jsxs("div", { className: "tt-auto-stat", children: [_jsx("div", { className: "tt-auto-stat-value", style: { color: '#3b82f6' }, children: status.totalCycles }), _jsx("div", { className: "tt-auto-stat-label", children: "Ciclos Executados" })] }), _jsxs("div", { className: "tt-auto-stat", children: [_jsx("div", { className: "tt-auto-stat-value", style: { color: '#a855f7' }, children: status.examplesCreated }), _jsx("div", { className: "tt-auto-stat-label", children: "\u2728 Exemplos Criados" })] }), _jsxs("div", { className: "tt-auto-stat", children: [_jsx("div", { className: "tt-auto-stat-value", style: { color: '#10b981' }, children: status.examplesReinforced }), _jsx("div", { className: "tt-auto-stat-label", children: "\uD83D\uDC4D Padr\u00F5es Refor\u00E7ados" })] }), _jsxs("div", { className: "tt-auto-stat", children: [_jsx("div", { className: "tt-auto-stat-value", style: { color: '#ef4444' }, children: status.examplesPenalized }), _jsx("div", { className: "tt-auto-stat-label", children: "\uD83D\uDC4E Padr\u00F5es Penalizados" })] }), _jsxs("div", { className: "tt-auto-stat", children: [_jsx("div", { className: "tt-auto-stat-value", style: { color: '#f59e0b' }, children: lastTime }), _jsx("div", { className: "tt-auto-stat-label", children: "\u00DAltimo Ciclo" })] })] }), _jsxs("div", { className: "tt-auto-pipeline", children: [_jsx("h4", { children: "\u2699\uFE0F Como o aprendizado aut\u00F4nomo funciona" }), _jsxs("div", { className: "tt-auto-pipeline-grid", children: [_jsxs("div", { className: "tt-auto-step", children: [_jsx("div", { className: "tt-auto-step-num", children: "1" }), _jsx("strong", { children: "Minera\u00E7\u00E3o" }), _jsx("p", { children: "L\u00EA \u00FAltimas 100 decis\u00F5es persistidas do agente" })] }), _jsx("div", { className: "tt-auto-arrow", children: "\u2192" }), _jsxs("div", { className: "tt-auto-step", children: [_jsx("div", { className: "tt-auto-step-num", children: "2" }), _jsx("strong", { children: "Clustering" }), _jsx("p", { children: "Agrupa por (produto, status, faixa de qualidade)" })] }), _jsx("div", { className: "tt-auto-arrow", children: "\u2192" }), _jsxs("div", { className: "tt-auto-step", children: [_jsx("div", { className: "tt-auto-step-num", children: "3" }), _jsx("strong", { children: "Inconsist\u00EAncia" }), _jsx("p", { children: "Calcula diverg\u00EAncia entre decis\u00F5es do mesmo cluster" })] }), _jsx("div", { className: "tt-auto-arrow", children: "\u2192" }), _jsxs("div", { className: "tt-auto-step", children: [_jsx("div", { className: "tt-auto-step-num", children: "4" }), _jsx("strong", { children: "S\u00EDntese" }), _jsx("p", { children: "Cluster consistente vira exemplo; inconsistente \u00E9 penalizado" })] })] })] }), _jsxs("div", { className: "tt-auto-log", children: [_jsxs("div", { className: "tt-auto-log-header", children: [_jsx("h4", { children: "\uD83D\uDCDC Log de Aprendizado em Tempo Real" }), _jsxs("span", { className: "tt-auto-log-count", children: [status.recentEvents.length, " eventos"] })] }), status.recentEvents.length === 0 ? (_jsxs("div", { className: "tt-empty-state", children: [_jsx("div", { className: "tt-empty-icon", children: "\uD83C\uDF31" }), _jsx("p", { children: "Ainda n\u00E3o h\u00E1 eventos." }), _jsx("p", { className: "tt-empty-hint", children: "Ative o auto-training e processe alguns registros para o agente come\u00E7ar a aprender sozinho." })] })) : (_jsx("div", { className: "tt-auto-log-list", children: status.recentEvents.map((ev) => {
                            const time = new Date(ev.timestamp).toLocaleTimeString('pt-BR');
                            const color = eventColor(ev.type);
                            return (_jsxs("div", { className: "tt-auto-log-item", style: { borderLeftColor: color }, children: [_jsx("div", { className: "tt-auto-log-icon", style: { background: color }, children: eventIcon(ev.type) }), _jsxs("div", { className: "tt-auto-log-main", children: [_jsx("div", { className: "tt-auto-log-msg", children: ev.message }), ev.cluster && (_jsxs("div", { className: "tt-auto-log-meta", children: [_jsxs("span", { children: ["\uD83D\uDCE6 ", ev.cluster.samples, " amostras"] }), _jsxs("span", { children: ["\uD83C\uDFAF ", ev.cluster.decision] }), _jsxs("span", { children: ["Q: ", ev.cluster.avgQuality, "%"] }), _jsxs("span", { children: ["C: ", ev.cluster.avgConfidence, "%"] }), ev.cluster.representativeProduct && (_jsxs("span", { children: ["\"", ev.cluster.representativeProduct.slice(0, 30), ev.cluster.representativeProduct.length > 30 ? '…' : '', "\""] }))] }))] }), _jsx("div", { className: "tt-auto-log-time", children: time })] }, ev.id));
                        }) }))] })] }));
};
export default TrainingTab;
