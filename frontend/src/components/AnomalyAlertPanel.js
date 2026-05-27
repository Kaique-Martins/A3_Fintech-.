import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import axios from 'axios';
export const AnomalyAlertPanel = () => {
    const [anomalies, setAnomalies] = useState([]);
    const [correctedRecords, setCorrectedRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    useEffect(() => {
        loadAnomalies();
        const interval = setInterval(loadAnomalies, 10000);
        return () => clearInterval(interval);
    }, []);
    const loadAnomalies = async () => {
        try {
            const response = await axios.get('/api/agent/explainability/anomalies');
            if (response.data.success) {
                setAnomalies(response.data.data.anomalies || []);
                setCorrectedRecords(response.data.data.correctedRecords || []);
            }
        }
        catch (error) {
            console.error('Error loading anomalies:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const filteredAnomalies = anomalies.filter((a) => filter === 'ALL' || a.severity === filter);
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'HIGH':
                return { bg: '#fecaca', border: '#dc2626', text: '#991b1b' };
            case 'MEDIUM':
                return { bg: '#fed7aa', border: '#f97316', text: '#92400e' };
            case 'LOW':
                return { bg: '#fce7f3', border: '#ec4899', text: '#831843' };
            default:
                return { bg: '#f3f4f6', border: '#9ca3af', text: '#374151' };
        }
    };
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'HIGH':
                return '🔴';
            case 'MEDIUM':
                return '🟡';
            case 'LOW':
                return '🔵';
            default:
                return '⚪';
        }
    };
    if (loading) {
        return _jsx("div", { style: { padding: '20px', textAlign: 'center' }, children: "Loading anomaly data..." });
    }
    const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
    const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;
    return (_jsxs("div", { style: { padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }, children: [_jsx("h3", { style: { margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }, children: "\uD83D\uDEA8 Anomaly Detection" }), highCount > 0 && (_jsxs("div", { style: {
                            backgroundColor: '#dc2626',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                        }, children: [highCount, " High Severity"] }))] }), _jsx("div", { style: { marginBottom: '16px', display: 'flex', gap: '8px' }, children: ['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => (_jsx("button", { onClick: () => setFilter(severity), style: {
                        padding: '6px 12px',
                        backgroundColor: filter === severity ? '#3b82f6' : '#e5e7eb',
                        color: filter === severity ? '#fff' : '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                    }, children: severity }, severity))) }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: filteredAnomalies.length > 0 ? (filteredAnomalies.map((anomaly, idx) => {
                    const colors = getSeverityColor(anomaly.severity);
                    return (_jsxs("div", { style: {
                            backgroundColor: '#fff',
                            border: `2px solid ${colors.border}`,
                            borderRadius: '6px',
                            padding: '12px',
                        }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'start', gap: '8px', flex: 1 }, children: [_jsx("span", { style: { fontSize: '20px', marginTop: '2px' }, children: getSeverityIcon(anomaly.severity) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("h5", { style: { margin: '0 0 4px 0', color: colors.text }, children: anomaly.type.replace(/_/g, ' ') }), _jsx("p", { style: { margin: '0 0 8px 0', fontSize: '12px', color: '#374151' }, children: anomaly.description })] })] }), _jsx("div", { style: {
                                            backgroundColor: colors.bg,
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 'bold',
                                            color: colors.text,
                                            whiteSpace: 'nowrap',
                                        }, children: anomaly.severity })] }), _jsxs("div", { style: {
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gap: '8px',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                }, children: [_jsxs("div", { style: { backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }, children: [_jsx("p", { style: { margin: '0', color: '#6b7280', fontSize: '11px' }, children: "Expected" }), _jsxs("p", { style: { margin: '0', fontWeight: 'bold', color: '#1f2937' }, children: [anomaly.metrics.expected.toFixed(1), "%"] })] }), _jsxs("div", { style: { backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }, children: [_jsx("p", { style: { margin: '0', color: '#6b7280', fontSize: '11px' }, children: "Actual" }), _jsxs("p", { style: { margin: '0', fontWeight: 'bold', color: '#1f2937' }, children: [anomaly.metrics.actual.toFixed(1), "%"] })] }), _jsxs("div", { style: { backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }, children: [_jsx("p", { style: { margin: '0', color: '#6b7280', fontSize: '11px' }, children: "Deviation" }), _jsxs("p", { style: { margin: '0', fontWeight: 'bold', color: colors.text }, children: [anomaly.metrics.deviation > 0 ? '+' : '', anomaly.metrics.deviation.toFixed(1), "%"] })] })] }), _jsxs("div", { style: {
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #0284c7',
                                    borderRadius: '4px',
                                    padding: '8px',
                                }, children: [_jsx("p", { style: { margin: '0', fontSize: '12px', color: '#0c4a6e', fontWeight: 'bold' }, children: "\uD83D\uDCA1 Suggested Action:" }), _jsx("p", { style: { margin: '4px 0 0 0', fontSize: '12px', color: '#0c4a6e' }, children: anomaly.suggestedAction })] }), _jsxs("p", { style: { margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280' }, children: ["Detected at ", new Date(anomaly.detectedAt).toLocaleTimeString()] })] }, idx));
                })) : (_jsx("div", { style: {
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#ecfdf5',
                        borderRadius: '6px',
                        border: '1px solid #86efac',
                    }, children: _jsx("p", { style: { margin: '0', color: '#166534', fontWeight: 'bold' }, children: "\u2705 Agent behaving normally - no anomalies detected" }) })) }), _jsxs("div", { style: { marginTop: '20px' }, children: [_jsx("h4", { style: { marginBottom: '8px' }, children: "\u270F\uFE0F Registros Corrigidos (\u00FAltimos)" }), correctedRecords.length > 0 ? (_jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Record ID" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Produto" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Categoria" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Pre\u00E7o" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Cidade" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Motivo" }), _jsx("th", { style: { textAlign: 'left', padding: '6px' }, children: "Timestamp" })] }) }), _jsx("tbody", { children: correctedRecords.map((r, idx) => (_jsxs("tr", { style: { borderTop: '1px solid #eee' }, children: [_jsx("td", { style: { padding: '6px' }, children: r.recordId }), _jsx("td", { style: { padding: '6px' }, children: r.correctedData?.produto || '-' }), _jsx("td", { style: { padding: '6px' }, children: r.correctedData?.categoria || '-' }), _jsx("td", { style: { padding: '6px' }, children: r.correctedData?.preco ?? '-' }), _jsx("td", { style: { padding: '6px' }, children: r.correctedData?.cidade || '-' }), _jsx("td", { style: { padding: '6px' }, children: r.motivo || '' }), _jsx("td", { style: { padding: '6px' }, children: new Date(r.timestamp).toLocaleString() })] }, idx))) })] }) })) : (_jsx("div", { style: { color: '#6b7280' }, children: "Nenhum registro corrigido recentemente." }))] }), _jsx("div", { style: {
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: '#6b7280',
                }, children: _jsxs("p", { style: { margin: '0' }, children: ["\uD83D\uDCCA Total anomalies detected: ", anomalies.length, " | High: ", highCount, " | Medium: ", mediumCount] }) })] }));
};
export default AnomalyAlertPanel;
