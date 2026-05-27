import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { api } from '../services/validationService';
import '../styles/History.css';
export const History = ({ validations, onRefresh }) => {
    const [filterDecision, setFilterDecision] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [query, setQuery] = useState('');
    const [minConfidence, setMinConfidence] = useState('');
    const [maxConfidence, setMaxConfidence] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [exportLoading, setExportLoading] = useState(false);
    const filtered = useMemo(() => {
        return validations.filter((v) => {
            const haystack = [
                v.recordId,
                v.decision,
                v.reasoning,
                v.status,
                v.input?.produto,
                v.input?.categoria,
                v.input?.cidade,
                v.correctedData?.produto,
                v.correctedData?.categoria,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            if (query && !haystack.includes(query.toLowerCase()))
                return false;
            if (filterDecision !== 'all' && v.decision !== filterDecision)
                return false;
            if (filterStatus !== 'all' && v.status !== filterStatus)
                return false;
            if (minConfidence && v.confidence < Number(minConfidence))
                return false;
            if (maxConfidence && v.confidence > Number(maxConfidence))
                return false;
            if (startDate && new Date(v.timestamp) < new Date(startDate))
                return false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (new Date(v.timestamp) > end)
                    return false;
            }
            return true;
        });
    }, [validations, query, filterDecision, filterStatus, minConfidence, maxConfidence, startDate, endDate]);
    const totals = useMemo(() => {
        const approved = validations.filter((v) => v.status === 'APROVADO').length;
        const quarantine = validations.filter((v) => v.status === 'QUARENTENA').length;
        const auto = validations.filter((v) => v.isAuto).length;
        const avgConfidence = validations.length ? validations.reduce((sum, v) => sum + v.confidence, 0) / validations.length : 0;
        const avgQuality = validations.length ? validations.reduce((sum, v) => sum + v.qualityScore, 0) / validations.length : 0;
        return { approved, quarantine, auto, avgConfidence, avgQuality };
    }, [validations]);
    const handleExportCsv = async () => {
        try {
            setExportLoading(true);
            const params = new URLSearchParams();
            if (filterDecision !== 'all')
                params.set('decision', filterDecision);
            if (filterStatus !== 'all')
                params.set('status', filterStatus);
            if (query)
                params.set('ruleId', query);
            if (minConfidence)
                params.set('minConfidence', minConfidence);
            if (maxConfidence)
                params.set('maxConfidence', maxConfidence);
            if (startDate)
                params.set('startDate', startDate);
            if (endDate)
                params.set('endDate', endDate);
            params.set('limit', '500');
            const response = await api.get(`/agent/history/export/csv?${params.toString()}`);
            const blob = new Blob([response.data.data], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `historico-agent-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
        finally {
            setExportLoading(false);
        }
    };
    const handleExportJson = () => {
        const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historico-agent-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const clearFilters = () => {
        setFilterDecision('all');
        setFilterStatus('all');
        setQuery('');
        setMinConfidence('');
        setMaxConfidence('');
        setStartDate('');
        setEndDate('');
    };
    return (_jsxs("div", { className: "history", children: [_jsxs("div", { className: "history-header", children: [_jsx("h1", { children: "\uD83D\uDCDC Hist\u00F3rico Inteligente" }), _jsx("p", { children: "Decis\u00F5es persistidas com contexto original, filtros e exporta\u00E7\u00E3o completa" })] }), _jsxs("div", { className: "history-summary-grid", children: [_jsxs("div", { className: "history-summary-card", children: [_jsx("span", { children: "Total" }), _jsx("strong", { children: validations.length })] }), _jsxs("div", { className: "history-summary-card approved", children: [_jsx("span", { children: "Aprovados" }), _jsx("strong", { children: totals.approved })] }), _jsxs("div", { className: "history-summary-card quarantine", children: [_jsx("span", { children: "Quarentena" }), _jsx("strong", { children: totals.quarantine })] }), _jsxs("div", { className: "history-summary-card", children: [_jsx("span", { children: "Confian\u00E7a m\u00E9dia" }), _jsxs("strong", { children: [totals.avgConfidence.toFixed(1), "%"] })] }), _jsxs("div", { className: "history-summary-card", children: [_jsx("span", { children: "Qualidade m\u00E9dia" }), _jsxs("strong", { children: [totals.avgQuality.toFixed(1), "%"] })] }), _jsxs("div", { className: "history-summary-card", children: [_jsx("span", { children: "Autom\u00E1ticas" }), _jsx("strong", { children: totals.auto })] })] }), _jsxs("div", { className: "history-controls history-controls-rich", children: [_jsxs("div", { className: "history-filters-grid", children: [_jsx("input", { className: "history-search", value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Buscar por produto, cidade, decis\u00E3o, regra ou recordId" }), _jsxs("select", { className: "history-select", value: filterDecision, onChange: (e) => setFilterDecision(e.target.value), children: [_jsx("option", { value: "all", children: "Todas as decis\u00F5es" }), _jsx("option", { value: "APPROVED", children: "Aprovado" }), _jsx("option", { value: "REJECTED", children: "Rejeitado" }), _jsx("option", { value: "FLAGGED", children: "Marcado" }), _jsx("option", { value: "NEUTRAL", children: "Neutro" })] }), _jsxs("select", { className: "history-select", value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [_jsx("option", { value: "all", children: "Todos os status" }), _jsx("option", { value: "APROVADO", children: "Aprovado" }), _jsx("option", { value: "QUARENTENA", children: "Quarentena" })] }), _jsx("input", { className: "history-input", type: "number", min: "0", max: "100", value: minConfidence, onChange: (e) => setMinConfidence(e.target.value), placeholder: "Confian\u00E7a m\u00EDn." }), _jsx("input", { className: "history-input", type: "number", min: "0", max: "100", value: maxConfidence, onChange: (e) => setMaxConfidence(e.target.value), placeholder: "Confian\u00E7a m\u00E1x." }), _jsx("input", { className: "history-input", type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value) }), _jsx("input", { className: "history-input", type: "date", value: endDate, onChange: (e) => setEndDate(e.target.value) })] }), _jsxs("div", { className: "history-actions", children: [_jsx("button", { className: "history-action-btn secondary", onClick: clearFilters, children: "Limpar filtros" }), _jsx("button", { className: "history-action-btn secondary", onClick: onRefresh, children: "Atualizar" }), _jsx("button", { className: "history-action-btn", onClick: handleExportCsv, disabled: exportLoading, children: exportLoading ? 'Exportando...' : 'Exportar CSV' }), _jsx("button", { className: "history-action-btn", onClick: handleExportJson, children: "Exportar JSON" })] })] }), _jsx("div", { className: "history-info", children: _jsxs("span", { className: "total", children: ["Mostrando ", filtered.length, " de ", validations.length, " registros"] }) }), _jsx("div", { className: "history-table", children: filtered.length > 0 ? (_jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Produto" }), _jsx("th", { children: "Entrada" }), _jsx("th", { children: "Sa\u00EDda" }), _jsx("th", { children: "Decis\u00E3o" }), _jsx("th", { children: "Confian\u00E7a" }), _jsx("th", { children: "Regras" }), _jsx("th", { children: "Data/Hora" })] }) }), _jsx("tbody", { children: filtered.map((validation) => (_jsxs("tr", { className: `status-${validation.status.toLowerCase()}`, children: [_jsxs("td", { className: "product-cell", children: [_jsx("span", { className: "product-name", children: validation.input?.produto || validation.recordId }), _jsx("small", { children: validation.recordId })] }), _jsx("td", { children: _jsxs("div", { className: "history-inline-metadata", children: [_jsx("span", { children: validation.input?.categoria || 'N/D' }), _jsx("span", { children: validation.input?.cidade || 'N/D' }), _jsxs("span", { children: ["R$ ", (validation.input?.preco ?? 0).toFixed(2)] })] }) }), _jsx("td", { children: _jsxs("div", { className: "history-inline-metadata", children: [_jsx("span", { children: validation.correctedData?.categoria || 'N/D' }), _jsx("span", { children: validation.correctedData?.cidade || 'N/D' }), _jsxs("span", { children: ["R$ ", (validation.correctedData?.preco ?? 0).toFixed(2)] })] }) }), _jsx("td", { children: _jsxs("div", { className: "history-decision-stack", children: [_jsx("span", { className: `status-badge ${validation.status.toLowerCase()}`, children: validation.status === 'APROVADO' ? '✅ APROVADO' : '🚨 QUARENTENA' }), _jsx("span", { className: `decision-pill ${validation.decision.toLowerCase()}`, children: validation.decision })] }) }), _jsxs("td", { className: "price-cell", children: [validation.confidence.toFixed(0), "%"] }), _jsx("td", { children: _jsx("div", { className: "history-rule-list", children: validation.rulesApplied.length > 0 ? validation.rulesApplied.map((rule) => (_jsx("span", { className: "history-rule-chip", children: rule }, rule))) : _jsx("span", { className: "history-rule-chip muted", children: "Sem regra" }) }) }), _jsx("td", { className: "date-cell", children: new Date(validation.timestamp).toLocaleString('pt-BR') })] }, validation.id))) })] })) : (_jsxs("div", { className: "empty-state", children: [_jsx("p", { children: "Nenhum registro encontrado com os filtros atuais" }), _jsx("button", { className: "history-action-btn secondary", onClick: clearFilters, children: "Limpar filtros" })] })) })] }));
};
