import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/IntegratedDashboard.css';
import { api, validationService } from '../services/validationService';
import { useCountUp } from '../hooks/useCountUp';
export const IntegratedDashboard = ({ onNavigate }) => {
    const [metrics, setMetrics] = useState({
        validations: 0,
        imports: 0,
        agentDecisions: 0,
        historicalRecords: 0,
        lastActivityTime: new Date().toISOString(),
    });
    const moduleStatus = {
        validator: { status: 'idle' },
        importer: { status: 'idle' },
        agent: { status: 'idle' },
        history: { status: 'idle' },
    };
    const [selectedFlow, setSelectedFlow] = useState('full');
    const [demoRunning, setDemoRunning] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [demoPreview, setDemoPreview] = useState(null);
    const [demoNextScenario, setDemoNextScenario] = useState('');
    const countImports = useCountUp(metrics.imports);
    const countValidations = useCountUp(metrics.validations);
    const countDecisions = useCountUp(metrics.agentDecisions);
    const countHistory = useCountUp(metrics.historicalRecords);
    // Use useRef to track all intervals for proper cleanup
    const intervalsRef = useRef([]);
    const loadSystemMetrics = useCallback(async () => {
        try {
            // Carrega métricas do agent
            const agentMetrics = await api.get('/agent/metrics');
            const agentHistory = await api.get('/agent/history/persisted?limit=1');
            setMetrics((prev) => ({
                ...prev,
                validations: agentMetrics.data.totalProcessed || 0,
                agentDecisions: agentMetrics.data.totalProcessed || 0,
                historicalRecords: agentHistory.data?.length || 0,
                lastActivityTime: new Date().toISOString(),
            }));
        }
        catch (error) {
            console.error('Error loading metrics:', error);
        }
    }, []);
    const checkDemoStatus = useCallback(async () => {
        try {
            const response = await api.get('/demo/status');
            setDemoRunning(response.data.isRunning);
        }
        catch (error) {
            console.error('Error checking demo status:', error);
        }
    }, []);
    const loadDemoPreview = useCallback(async () => {
        try {
            const response = await api.get('/demo/preview');
            setDemoPreview(response.data.lastSnapshot || null);
            setDemoNextScenario(response.data.nextScenario || '');
        }
        catch (error) {
            console.error('Error loading demo preview:', error);
        }
    }, []);
    useEffect(() => {
        // Initial load
        loadSystemMetrics();
        checkDemoStatus();
        loadDemoPreview();
        // Setup interval refresh
        const mainInterval = setInterval(() => {
            loadSystemMetrics();
            checkDemoStatus();
            loadDemoPreview();
        }, 5000);
        intervalsRef.current.push(mainInterval);
        // Cleanup function
        return () => {
            intervalsRef.current.forEach(interval => clearInterval(interval));
            intervalsRef.current = [];
        };
    }, [loadSystemMetrics, checkDemoStatus, loadDemoPreview]);
    const startDemo = useCallback(async () => {
        try {
            setDemoLoading(true);
            await api.post('/demo/start');
            setDemoRunning(true);
            await loadDemoPreview();
            // Atualiza métricas mais frequentemente durante o demo
            await loadSystemMetrics();
            // Create faster update interval during demo
            const fastInterval = setInterval(() => {
                loadSystemMetrics();
                loadDemoPreview();
            }, 2000);
            intervalsRef.current.push(fastInterval);
            // Stop fast interval after 5 minutes
            const stopTimer = setTimeout(() => {
                clearInterval(fastInterval);
                intervalsRef.current = intervalsRef.current.filter(int => int !== fastInterval);
            }, 300000);
            // Store the timer reference for cleanup
            return () => {
                clearTimeout(stopTimer);
                clearInterval(fastInterval);
            };
        }
        catch (error) {
            console.error('Error starting demo:', error);
        }
        finally {
            setDemoLoading(false);
        }
    }, [loadSystemMetrics, loadDemoPreview]);
    const stopDemo = useCallback(async () => {
        try {
            setDemoLoading(true);
            await api.post('/demo/stop');
            setDemoRunning(false);
        }
        catch (error) {
            console.error('Error stopping demo:', error);
        }
        finally {
            setDemoLoading(false);
        }
    }, []);
    const getStatusColor = (status) => {
        switch (status) {
            case 'ready':
                return '#10b981';
            case 'processing':
                return '#f59e0b';
            case 'idle':
                return '#9ca3af';
            default:
                return '#6b7280';
        }
    };
    const getStatusLabel = (status) => {
        switch (status) {
            case 'ready':
                return '🟢 Pronto';
            case 'processing':
                return '🟡 Processando';
            case 'idle':
                return '⚪ Inativo';
            default:
                return '⚫ Desconhecido';
        }
    };
    return (_jsxs("div", { className: "integrated-dashboard", children: [_jsxs("div", { className: "dashboard-header", children: [_jsx("h1", { children: "\uD83C\uDFD7\uFE0F Vis\u00E3o Integrada do Sistema" }), _jsx("p", { children: "Fluxo completo: Importar \u2192 Validar \u2192 Agent Aut\u00F4nomo \u2192 Hist\u00F3rico" })] }), errorMessage && (_jsxs("div", { style: { background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }, children: [_jsx("span", { children: errorMessage }), _jsx("button", { onClick: () => setErrorMessage(''), style: { background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }, children: "\u00D7" })] })), _jsxs("div", { className: "flow-selector", children: [_jsx("button", { className: `flow-btn ${selectedFlow === 'full' ? 'active' : ''}`, onClick: () => setSelectedFlow('full'), children: "\uD83D\uDCCA Fluxo Completo" }), _jsx("button", { className: `flow-btn ${selectedFlow === 'validator' ? 'active' : ''}`, onClick: () => setSelectedFlow('validator'), children: "\u2705 Validator" }), _jsx("button", { className: `flow-btn ${selectedFlow === 'agent' ? 'active' : ''}`, onClick: () => setSelectedFlow('agent'), children: "\uD83E\uDD16 Agent" })] }), _jsxs("div", { className: "metrics-grid", children: [_jsxs("div", { className: "metric-card", children: [_jsxs("div", { className: "metric-header", children: [_jsx("span", { className: "metric-icon", children: "\uD83D\uDCE4" }), _jsx("h3", { children: "Importa\u00E7\u00F5es" })] }), _jsx("div", { className: "metric-value", children: countImports }), _jsx("div", { className: "metric-status", children: "Total de arquivos importados" })] }), _jsxs("div", { className: "metric-card", children: [_jsxs("div", { className: "metric-header", children: [_jsx("span", { className: "metric-icon", children: "\u2705" }), _jsx("h3", { children: "Valida\u00E7\u00F5es" })] }), _jsx("div", { className: "metric-value", children: countValidations }), _jsx("div", { className: "metric-status", children: "Registros validados" })] }), _jsxs("div", { className: "metric-card", children: [_jsxs("div", { className: "metric-header", children: [_jsx("span", { className: "metric-icon", children: "\uD83E\uDD16" }), _jsx("h3", { children: "Decis\u00F5es do Agent" })] }), _jsx("div", { className: "metric-value", children: countDecisions }), _jsx("div", { className: "metric-status", children: "Decis\u00F5es aut\u00F4nomas tomadas" })] }), _jsxs("div", { className: "metric-card", children: [_jsxs("div", { className: "metric-header", children: [_jsx("span", { className: "metric-icon", children: "\uD83D\uDCDA" }), _jsx("h3", { children: "Hist\u00F3rico" })] }), _jsx("div", { className: "metric-value", children: countHistory }), _jsx("div", { className: "metric-status", children: "Registros armazenados" })] })] }), _jsxs("div", { className: "modules-section", children: [_jsx("h2", { children: "\uD83D\uDCE1 Status dos M\u00F3dulos" }), _jsxs("div", { className: "modules-grid", children: [_jsxs("div", { className: "module-card", children: [_jsxs("div", { className: "module-header", children: [_jsx("span", { className: "module-name", children: "\uD83D\uDCE5 Importer" }), _jsx("span", { className: "module-status-indicator", style: { backgroundColor: getStatusColor(moduleStatus.importer.status) }, children: getStatusLabel(moduleStatus.importer.status) })] }), _jsx("div", { className: "module-description", children: "Importar dados de arquivos" }), _jsx("div", { className: "module-action", children: _jsx("button", { className: "action-link", onClick: () => onNavigate('import'), children: "\u2192 Ir para Importador" }) })] }), _jsxs("div", { className: "module-card", children: [_jsxs("div", { className: "module-header", children: [_jsx("span", { className: "module-name", children: "\u2705 Validator" }), _jsx("span", { className: "module-status-indicator", style: { backgroundColor: getStatusColor(moduleStatus.validator.status) }, children: getStatusLabel(moduleStatus.validator.status) })] }), _jsx("div", { className: "module-description", children: "Validar registros importados" }), _jsx("div", { className: "module-action", children: _jsx("button", { className: "action-link", onClick: () => onNavigate('validator'), children: "\u2192 Ir para Validador" }) })] }), _jsxs("div", { className: "module-card", children: [_jsxs("div", { className: "module-header", children: [_jsx("span", { className: "module-name", children: "\uD83E\uDD16 Agent" }), _jsx("span", { className: "module-status-indicator", style: { backgroundColor: getStatusColor(moduleStatus.agent.status) }, children: getStatusLabel(moduleStatus.agent.status) })] }), _jsx("div", { className: "module-description", children: "Decis\u00F5es aut\u00F4nomas em tempo real" }), _jsx("div", { className: "module-action", children: _jsx("button", { className: "action-link", onClick: () => onNavigate('agent'), children: "\u2192 Ir para Agent" }) })] }), _jsxs("div", { className: "module-card", children: [_jsxs("div", { className: "module-header", children: [_jsx("span", { className: "module-name", children: "\uD83D\uDCDA History" }), _jsx("span", { className: "module-status-indicator", style: { backgroundColor: getStatusColor(moduleStatus.history.status) }, children: getStatusLabel(moduleStatus.history.status) })] }), _jsx("div", { className: "module-description", children: "Hist\u00F3rico de valida\u00E7\u00F5es e decis\u00F5es" }), _jsx("div", { className: "module-action", children: _jsx("button", { className: "action-link", onClick: () => onNavigate('history'), children: "\u2192 Ir para Hist\u00F3rico" }) })] })] })] }), _jsxs("div", { className: "flow-visualization", children: [_jsx("h2", { children: "\uD83D\uDCCA Fluxo de Dados em Tempo Real" }), _jsxs("div", { className: "flow-diagram", children: [_jsxs("div", { className: "flow-step", children: [_jsx("div", { className: "flow-icon", children: "\uD83D\uDCE4" }), _jsx("div", { className: "flow-label", children: "Importar" }), _jsxs("div", { className: "flow-desc", children: [metrics.imports, " arquivos"] })] }), _jsx("div", { className: "flow-arrow", children: "\u2192" }), _jsxs("div", { className: "flow-step", children: [_jsx("div", { className: "flow-icon", children: "\u2705" }), _jsx("div", { className: "flow-label", children: "Validar" }), _jsxs("div", { className: "flow-desc", children: [metrics.validations, " registros"] })] }), _jsx("div", { className: "flow-arrow", children: "\u2192" }), _jsxs("div", { className: "flow-step", children: [_jsx("div", { className: "flow-icon", children: "\uD83E\uDD16" }), _jsx("div", { className: "flow-label", children: "Agent" }), _jsxs("div", { className: "flow-desc", children: [metrics.agentDecisions, " decis\u00F5es"] })] }), _jsx("div", { className: "flow-arrow", children: "\u2192" }), _jsxs("div", { className: "flow-step", children: [_jsx("div", { className: "flow-icon", children: "\uD83D\uDCDA" }), _jsx("div", { className: "flow-label", children: "Hist\u00F3rico" }), _jsxs("div", { className: "flow-desc", children: [metrics.historicalRecords, " logs"] })] })] })] }), _jsxs("div", { className: "health-section", children: [_jsx("h2", { children: "\uD83D\uDC9A Sa\u00FAde do Sistema" }), _jsxs("div", { className: "health-cards", children: [_jsxs("div", { className: "health-item", children: [_jsx("span", { className: "health-label", children: "Backend API" }), _jsx("span", { className: "health-status healthy", children: "\uD83D\uDFE2 Online" })] }), _jsxs("div", { className: "health-item", children: [_jsx("span", { className: "health-label", children: "Persist\u00EAncia" }), _jsx("span", { className: "health-status healthy", children: "\uD83D\uDFE2 JSON Ativa" })] }), _jsxs("div", { className: "health-item", children: [_jsx("span", { className: "health-label", children: "Agent Scheduler" }), _jsx("span", { className: "health-status healthy", children: "\uD83D\uDFE2 Executando" })] }), _jsxs("div", { className: "health-item", children: [_jsx("span", { className: "health-label", children: "Notifica\u00E7\u00F5es" }), _jsx("span", { className: "health-status healthy", children: "\uD83D\uDFE2 Ativas" })] })] })] }), _jsxs("div", { className: "quick-actions", children: [_jsx("h2", { children: "\u26A1 A\u00E7\u00F5es R\u00E1pidas" }), _jsxs("div", { className: "actions-grid", children: [_jsx("button", { className: "quick-action", onClick: () => onNavigate('import'), children: "Importar Novo Arquivo" }), _jsx("button", { className: "quick-action", onClick: () => onNavigate('validator'), children: "Validar Todos" }), _jsx("button", { className: "quick-action", onClick: () => onNavigate('agent'), children: "Processar com Agent" }), _jsx("button", { className: "quick-action", onClick: () => onNavigate('history'), children: "Ver Hist\u00F3rico Completo" }), _jsx("button", { className: "quick-action", onClick: async () => {
                                    try {
                                        const response = await validationService.getAgentReportCsv();
                                        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                                        const url = URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.download = `agent-report-${new Date().toISOString().split('T')[0]}.csv`;
                                        link.click();
                                        URL.revokeObjectURL(url);
                                    }
                                    catch (error) {
                                        console.error('Error exporting report:', error);
                                        setErrorMessage('Não foi possível exportar o relatório agora.');
                                        setTimeout(() => setErrorMessage(''), 5000);
                                    }
                                }, children: "Exportar Relat\u00F3rio" }), _jsx("button", { className: "quick-action", onClick: () => onNavigate('agent'), children: "Configurar Agent" })] })] }), _jsxs("div", { className: "demo-section", children: [_jsx("h2", { children: "\uD83C\uDFAC Modo Demonstra\u00E7\u00E3o" }), _jsxs("div", { className: "demo-container", children: [_jsxs("div", { className: "demo-info", children: [_jsx("p", { className: "demo-kicker", children: "Fluxo guiado para apresenta\u00E7\u00E3o" }), _jsx("p", { children: "Inicie a demonstra\u00E7\u00E3o para acompanhar cen\u00E1rios reais de compra, padroniza\u00E7\u00E3o, infer\u00EAncia e quarentena em sequ\u00EAncia." }), _jsxs("div", { className: "demo-badges", children: [_jsx("span", { className: `demo-status-badge ${demoRunning ? 'running' : 'stopped'}`, children: demoRunning ? '● Demonstração ativa' : '○ Demonstração inativa' }), _jsxs("span", { className: "demo-status-badge neutral", children: ["Pr\u00F3ximo: ", demoNextScenario || 'aguardando execução'] })] })] }), _jsx("div", { className: "demo-controls", children: !demoRunning ? (_jsx("button", { className: "demo-btn start-btn", onClick: startDemo, disabled: demoLoading, children: demoLoading ? '⏳ Iniciando...' : '▶️ Iniciar Demo' })) : (_jsx("button", { className: "demo-btn stop-btn", onClick: stopDemo, disabled: demoLoading, children: demoLoading ? '⏳ Parando...' : '⏹️ Parar Demo' })) })] }), demoPreview && (_jsxs("div", { className: "demo-preview-card", children: [_jsxs("div", { className: "demo-preview-header", children: [_jsx("strong", { children: "\u00DAltimo cen\u00E1rio processado" }), _jsx("span", { children: new Date(demoPreview.timestamp).toLocaleTimeString('pt-BR') })] }), _jsxs("div", { className: "demo-preview-grid", children: [_jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Produto" }), _jsx("strong", { children: demoPreview.input.produto })] }), _jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Categoria" }), _jsx("strong", { children: demoPreview.input.categoria || 'Não informada' })] }), _jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Pre\u00E7o" }), _jsxs("strong", { children: ["R$ ", demoPreview.input.preco.toFixed(2)] })] }), _jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Cidade" }), _jsx("strong", { children: demoPreview.input.cidade })] }), _jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Valida\u00E7\u00E3o" }), _jsx("strong", { className: demoPreview.validation.status === 'APROVADO' ? 'status-ok' : 'status-review', children: demoPreview.validation.status })] }), _jsxs("div", { className: "demo-preview-item", children: [_jsx("span", { children: "Agent" }), _jsx("strong", { className: demoPreview.agentDecision.decision === 'APPROVED' ? 'status-ok' : 'status-review', children: demoPreview.agentDecision.decision })] })] }), _jsx("p", { className: "demo-preview-note", children: demoPreview.scenario })] }))] }), _jsxs("div", { className: "last-update", children: ["\u00DAltima atualiza\u00E7\u00E3o: ", new Date(metrics.lastActivityTime).toLocaleTimeString('pt-BR')] })] }));
};
