import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/IntegratedDashboard.css';
import { api, validationService } from '../services/validationService';
import { useCountUp } from '../hooks/useCountUp';

interface IntegratedDashboardProps {
  onNavigate: (page: 'dashboard' | 'validator' | 'history' | 'import' | 'agent') => void;
}

interface SystemMetrics {
  validations: number;
  imports: number;
  agentDecisions: number;
  historicalRecords: number;
  lastActivityTime: string;
}

interface ModuleStatus {
  validator: { status: 'ready' | 'processing' | 'idle'; lastActivity?: string };
  importer: { status: 'ready' | 'processing' | 'idle'; lastActivity?: string };
  agent: { status: 'ready' | 'processing' | 'idle'; lastActivity?: string };
  history: { status: 'ready' | 'idle'; recordCount?: number };
}

interface DemoPreview {
  recordId: string;
  scenario: string;
  input: {
    produto: string;
    categoria?: string;
    preco: number;
    cidade: string;
  };
  validation: {
    status: 'APROVADO' | 'QUARENTENA';
    qualityScore: number;
    confidenceLevel: number;
    motivo: string;
  };
  agentDecision: {
    decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
    confidence: number;
    reasoning: string;
  };
  timestamp: string;
}

export const IntegratedDashboard: React.FC<IntegratedDashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    validations: 0,
    imports: 0,
    agentDecisions: 0,
    historicalRecords: 0,
    lastActivityTime: new Date().toISOString(),
  });

  const moduleStatus: ModuleStatus = {
    validator: { status: 'idle' },
    importer: { status: 'idle' },
    agent: { status: 'idle' },
    history: { status: 'idle' },
  };
  const [selectedFlow, setSelectedFlow] = useState<'full' | 'agent' | 'validator'>('full');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [demoPreview, setDemoPreview] = useState<DemoPreview | null>(null);
  const [demoNextScenario, setDemoNextScenario] = useState<string>('');

  const countImports = useCountUp(metrics.imports);
  const countValidations = useCountUp(metrics.validations);
  const countDecisions = useCountUp(metrics.agentDecisions);
  const countHistory = useCountUp(metrics.historicalRecords);

  // Use useRef to track all intervals for proper cleanup
  const intervalsRef = useRef<Array<ReturnType<typeof setInterval>>>([]);

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

    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }, []);

  const checkDemoStatus = useCallback(async () => {
    try {
      const response = await api.get('/demo/status');
      setDemoRunning(response.data.isRunning);
    } catch (error) {
      console.error('Error checking demo status:', error);
    }
  }, []);

  const loadDemoPreview = useCallback(async () => {
    try {
      const response = await api.get('/demo/preview');
      setDemoPreview(response.data.lastSnapshot || null);
      setDemoNextScenario(response.data.nextScenario || '');
    } catch (error) {
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
    } catch (error) {
      console.error('Error starting demo:', error);
    } finally {
      setDemoLoading(false);
    }
  }, [loadSystemMetrics, loadDemoPreview]);

  const stopDemo = useCallback(async () => {
    try {
      setDemoLoading(true);
      await api.post('/demo/stop');
      setDemoRunning(false);
    } catch (error) {
      console.error('Error stopping demo:', error);
    } finally {
      setDemoLoading(false);
    }
  }, []);

  const getStatusColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  return (
    <div className="integrated-dashboard">
      <div className="dashboard-header">
        <h1>🏗️ Visão Integrada do Sistema</h1>
        <p>Fluxo completo: Importar → Validar → Agent Autônomo → Histórico</p>
      </div>

      {errorMessage && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      {/* Flow Selection */}
      <div className="flow-selector">
        <button
          className={`flow-btn ${selectedFlow === 'full' ? 'active' : ''}`}
          onClick={() => setSelectedFlow('full')}
        >
          📊 Fluxo Completo
        </button>
        <button
          className={`flow-btn ${selectedFlow === 'validator' ? 'active' : ''}`}
          onClick={() => setSelectedFlow('validator')}
        >
          ✅ Validator
        </button>
        <button
          className={`flow-btn ${selectedFlow === 'agent' ? 'active' : ''}`}
          onClick={() => setSelectedFlow('agent')}
        >
          🤖 Agent
        </button>
      </div>

      {/* System Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📤</span>
            <h3>Importações</h3>
          </div>
          <div className="metric-value">{countImports}</div>
          <div className="metric-status">Total de arquivos importados</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">✅</span>
            <h3>Validações</h3>
          </div>
          <div className="metric-value">{countValidations}</div>
          <div className="metric-status">Registros validados</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">🤖</span>
            <h3>Decisões do Agent</h3>
          </div>
          <div className="metric-value">{countDecisions}</div>
          <div className="metric-status">Decisões autônomas tomadas</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-icon">📚</span>
            <h3>Histórico</h3>
          </div>
          <div className="metric-value">{countHistory}</div>
          <div className="metric-status">Registros armazenados</div>
        </div>
      </div>

      {/* Module Status */}
      <div className="modules-section">
        <h2>📡 Status dos Módulos</h2>
        <div className="modules-grid">
          <div className="module-card">
            <div className="module-header">
              <span className="module-name">📥 Importer</span>
              <span
                className="module-status-indicator"
                style={{ backgroundColor: getStatusColor(moduleStatus.importer.status) }}
              >
                {getStatusLabel(moduleStatus.importer.status)}
              </span>
            </div>
            <div className="module-description">Importar dados de arquivos</div>
            <div className="module-action">
              <button className="action-link" onClick={() => onNavigate('import')}>→ Ir para Importador</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <span className="module-name">✅ Validator</span>
              <span
                className="module-status-indicator"
                style={{ backgroundColor: getStatusColor(moduleStatus.validator.status) }}
              >
                {getStatusLabel(moduleStatus.validator.status)}
              </span>
            </div>
            <div className="module-description">Validar registros importados</div>
            <div className="module-action">
              <button className="action-link" onClick={() => onNavigate('validator')}>→ Ir para Validador</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <span className="module-name">🤖 Agent</span>
              <span
                className="module-status-indicator"
                style={{ backgroundColor: getStatusColor(moduleStatus.agent.status) }}
              >
                {getStatusLabel(moduleStatus.agent.status)}
              </span>
            </div>
            <div className="module-description">Decisões autônomas em tempo real</div>
            <div className="module-action">
              <button className="action-link" onClick={() => onNavigate('agent')}>→ Ir para Agent</button>
            </div>
          </div>

          <div className="module-card">
            <div className="module-header">
              <span className="module-name">📚 History</span>
              <span
                className="module-status-indicator"
                style={{ backgroundColor: getStatusColor(moduleStatus.history.status) }}
              >
                {getStatusLabel(moduleStatus.history.status)}
              </span>
            </div>
            <div className="module-description">Histórico de validações e decisões</div>
            <div className="module-action">
              <button className="action-link" onClick={() => onNavigate('history')}>→ Ir para Histórico</button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Flow Visualization */}
      <div className="flow-visualization">
        <h2>📊 Fluxo de Dados em Tempo Real</h2>
        <div className="flow-diagram">
          <div className="flow-step">
            <div className="flow-icon">📤</div>
            <div className="flow-label">Importar</div>
            <div className="flow-desc">{metrics.imports} arquivos</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-icon">✅</div>
            <div className="flow-label">Validar</div>
            <div className="flow-desc">{metrics.validations} registros</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-icon">🤖</div>
            <div className="flow-label">Agent</div>
            <div className="flow-desc">{metrics.agentDecisions} decisões</div>
          </div>

          <div className="flow-arrow">→</div>

          <div className="flow-step">
            <div className="flow-icon">📚</div>
            <div className="flow-label">Histórico</div>
            <div className="flow-desc">{metrics.historicalRecords} logs</div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="health-section">
        <h2>💚 Saúde do Sistema</h2>
        <div className="health-cards">
          <div className="health-item">
            <span className="health-label">Backend API</span>
            <span className="health-status healthy">🟢 Online</span>
          </div>
          <div className="health-item">
            <span className="health-label">Persistência</span>
            <span className="health-status healthy">🟢 JSON Ativa</span>
          </div>
          <div className="health-item">
            <span className="health-label">Agent Scheduler</span>
            <span className="health-status healthy">🟢 Executando</span>
          </div>
          <div className="health-item">
            <span className="health-label">Notificações</span>
            <span className="health-status healthy">🟢 Ativas</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Ações Rápidas</h2>
        <div className="actions-grid">
          <button className="quick-action" onClick={() => onNavigate('import')}>Importar Novo Arquivo</button>
          <button className="quick-action" onClick={() => onNavigate('validator')}>Validar Todos</button>
          <button className="quick-action" onClick={() => onNavigate('agent')}>Processar com Agent</button>
          <button className="quick-action" onClick={() => onNavigate('history')}>Ver Histórico Completo</button>
          <button
            className="quick-action"
            onClick={async () => {
              try {
                const response = await validationService.getAgentReportCsv();
                const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `agent-report-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                console.error('Error exporting report:', error);
                setErrorMessage('Não foi possível exportar o relatório agora.');
                setTimeout(() => setErrorMessage(''), 5000);
              }
            }}
          >
            Exportar Relatório
          </button>
          <button className="quick-action" onClick={() => onNavigate('agent')}>Configurar Agent</button>
        </div>
      </div>

      {/* Demo Controls */}
      <div className="demo-section">
        <h2>🎬 Modo Demonstração</h2>
        <div className="demo-container">
          <div className="demo-info">
            <p className="demo-kicker">Fluxo guiado para apresentação</p>
            <p>Inicie a demonstração para acompanhar cenários reais de compra, padronização, inferência e quarentena em sequência.</p>
            <div className="demo-badges">
              <span className={`demo-status-badge ${demoRunning ? 'running' : 'stopped'}`}>
                {demoRunning ? '● Demonstração ativa' : '○ Demonstração inativa'}
              </span>
              <span className="demo-status-badge neutral">
                Próximo: {demoNextScenario || 'aguardando execução'}
              </span>
            </div>
          </div>
          <div className="demo-controls">
            {!demoRunning ? (
              <button 
                className="demo-btn start-btn" 
                onClick={startDemo}
                disabled={demoLoading}
              >
                {demoLoading ? '⏳ Iniciando...' : '▶️ Iniciar Demo'}
              </button>
            ) : (
              <button 
                className="demo-btn stop-btn" 
                onClick={stopDemo}
                disabled={demoLoading}
              >
                {demoLoading ? '⏳ Parando...' : '⏹️ Parar Demo'}
              </button>
            )}
          </div>
        </div>
        {demoPreview && (
          <div className="demo-preview-card">
            <div className="demo-preview-header">
              <strong>Último cenário processado</strong>
              <span>{new Date(demoPreview.timestamp).toLocaleTimeString('pt-BR')}</span>
            </div>
            <div className="demo-preview-grid">
              <div className="demo-preview-item">
                <span>Produto</span>
                <strong>{demoPreview.input.produto}</strong>
              </div>
              <div className="demo-preview-item">
                <span>Categoria</span>
                <strong>{demoPreview.input.categoria || 'Não informada'}</strong>
              </div>
              <div className="demo-preview-item">
                <span>Preço</span>
                <strong>R$ {demoPreview.input.preco.toFixed(2)}</strong>
              </div>
              <div className="demo-preview-item">
                <span>Cidade</span>
                <strong>{demoPreview.input.cidade}</strong>
              </div>
              <div className="demo-preview-item">
                <span>Validação</span>
                <strong className={demoPreview.validation.status === 'APROVADO' ? 'status-ok' : 'status-review'}>{demoPreview.validation.status}</strong>
              </div>
              <div className="demo-preview-item">
                <span>Agent</span>
                <strong className={demoPreview.agentDecision.decision === 'APPROVED' ? 'status-ok' : 'status-review'}>{demoPreview.agentDecision.decision}</strong>
              </div>
            </div>
            <p className="demo-preview-note">{demoPreview.scenario}</p>
          </div>
        )}
      </div>

      {/* Last Update */}
      <div className="last-update">
        Última atualização: {new Date(metrics.lastActivityTime).toLocaleTimeString('pt-BR')}
      </div>
    </div>
  );
};
