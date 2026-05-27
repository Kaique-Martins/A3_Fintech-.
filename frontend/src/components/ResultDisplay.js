import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CircularGauge } from './CircularGauge';
import '../styles/ResultDisplay.css';
const Skeleton = ({ height = 20, width = '100%', rounded = false, }) => (_jsx("div", { className: "skeleton-pulse", style: {
        height,
        width,
        borderRadius: rounded ? '50%' : '8px',
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
    } }));
export const ResultDisplay = ({ result, loading }) => {
    if (loading) {
        return (_jsxs("div", { className: "result-container", style: { gap: 24 }, children: [_jsxs("div", { style: { display: 'flex', gap: 16, justifyContent: 'center', padding: '8px 0' }, children: [_jsx(Skeleton, { height: 110, width: "110px", rounded: true }), _jsx(Skeleton, { height: 110, width: "110px", rounded: true })] }), _jsx(Skeleton, { height: 64 }), _jsx(Skeleton, { height: 100 }), _jsx(Skeleton, { height: 80 }), _jsx(Skeleton, { height: 120 })] }));
    }
    if (!result)
        return null;
    const isQuarentine = result.status === 'QUARENTENA';
    const getSeverityIcon = (severity) => {
        const icons = {
            CRÍTICO: '🔴', ALTO: '🟠', MÉDIO: '🟡', BAIXO: '🟢', INFO: 'ℹ️',
        };
        return icons[severity] || '•';
    };
    return (_jsxs("div", { className: `result-container ${isQuarentine ? 'quarantine' : 'approved'}`, children: [_jsxs("div", { style: { display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0' }, children: [_jsx(CircularGauge, { value: result.qualityScore, label: "Qualidade dos Dados" }), _jsx(CircularGauge, { value: result.confidenceLevel, label: "N\u00EDvel de Confian\u00E7a" })] }), _jsx("div", { className: `status-badge ${isQuarentine ? 'quarentine' : 'approved'}`, children: isQuarentine
                    ? '🚨 QUARENTENA — Dados requerem revisão manual'
                    : '✅ APROVADO — Dados validados com sucesso' }), _jsxs("div", { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' }, children: [_jsxs("div", { className: "score-chip", style: { background: isQuarentine ? '#fff7ed' : '#f0fdf4', borderColor: isQuarentine ? '#fed7aa' : '#bbf7d0' }, children: [_jsx("span", { style: { fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }, children: "Alertas" }), _jsx("span", { style: { fontSize: '1.4rem', fontWeight: 800, color: result.alerts.length > 0 ? '#ef4444' : '#10b981' }, children: result.alerts.length })] }), _jsxs("div", { className: "score-chip", style: { background: '#f0f9ff', borderColor: '#bae6fd', flex: 1 }, children: [_jsx("span", { style: { fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }, children: "Vers\u00E3o do Motor" }), _jsx("span", { style: { fontSize: '1rem', fontWeight: 700, color: '#0369a1' }, children: "v3.0 \u2014 Precis\u00E3o M\u00E1xima" })] })] }), _jsxs("div", { className: "corrected-data", children: [_jsx("h3", { children: "\u270F\uFE0F Dados Corrigidos" }), _jsx("div", { className: "data-grid", children: [
                            { label: 'Produto', value: result.dado_corrigido.produto },
                            { label: 'Categoria', value: result.dado_corrigido.categoria },
                            { label: 'Preço', value: `R$ ${result.dado_corrigido.preco.toFixed(2)}` },
                            { label: 'Cidade', value: result.dado_corrigido.cidade },
                        ].map(({ label, value }) => (_jsxs("div", { className: "data-item", children: [_jsx("label", { children: label }), _jsx("span", { children: value })] }, label))) })] }), result.motivo && (_jsxs("div", { className: "motivo-section", children: [_jsx("h3", { children: "\uD83D\uDCDD Altera\u00E7\u00F5es Realizadas" }), _jsx("div", { className: "motivo-text", children: result.motivo.split(' | ').filter(Boolean).map((m, i) => (_jsxs("div", { className: "motivo-item", children: ["\u2022 ", m] }, i))) })] })), result.alerts.length > 0 && (_jsxs("div", { className: "alerts-section", children: [_jsxs("h3", { children: ["\u26A0\uFE0F Alertas Detectados (", result.alerts.length, ")"] }), _jsx("div", { className: "alerts-list", children: result.alerts.map((alert, i) => (_jsxs("div", { className: `alert-item ${alert.severity.toLowerCase()}`, children: [_jsxs("div", { className: "alert-header", children: [_jsx("span", { className: "alert-icon", children: getSeverityIcon(alert.severity) }), _jsx("span", { className: "alert-severity", children: alert.severity }), _jsxs("span", { className: "alert-field", children: ["[", alert.field.toUpperCase(), "]"] })] }), _jsx("div", { className: "alert-message", children: alert.message }), alert.suggestion && (_jsxs("div", { className: "alert-suggestion", children: ["\uD83D\uDCA1 ", alert.suggestion] }))] }, i))) })] })), result.recommendations.length > 0 && (_jsxs("div", { className: "recommendations-section", children: [_jsx("h3", { children: "\uD83C\uDFAF Recomenda\u00E7\u00F5es" }), _jsx("div", { className: "recommendations-list", children: result.recommendations.map((rec, i) => (_jsx("div", { className: "recommendation-item", children: rec }, i))) })] })), _jsxs("details", { className: "json-view", children: [_jsx("summary", { children: "\uD83D\uDCCB Ver JSON Completo" }), _jsx("div", { className: "json-box", children: _jsx("pre", { children: JSON.stringify(result, null, 2) }) })] })] }));
};
