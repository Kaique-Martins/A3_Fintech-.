import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/AgentControl.css';
import ExplanationDisplay from './ExplanationDisplay';
import AgentEvolutionDashboard from './AgentEvolutionDashboard';
import AnomalyAlertPanel from './AnomalyAlertPanel';
import DemoProTab from './DemoProTab';
import TrainingTab from './TrainingTab';

interface AgentMetrics {
  totalProcessed: number;
  approved: number;
  rejected: number;
  flaggedForReview: number;
  successRate: number;
  avgProcessingTime: number;
  rulesApplied: Record<string, number>;
  lastUpdate: string;
}

interface AgentDecision {
  recordId: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  confidence: number;
  rulesApplied: string[];
  reasoning: string;
  timestamp: string;
  isAuto: boolean;
}

interface AgentRule {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  condition: {
    field: string;
    operator: string;
    value: any;
  };
  action: {
    autoApprove?: boolean;
    autoReject?: boolean;
    flagForReview?: boolean;
    customMessage?: string;
  };
}

interface AgentConfig {
  rules: AgentRule[];
  learningMode: 'conservative' | 'balanced' | 'aggressive';
  autoProcessing: {
    enabled: boolean;
    intervalSeconds: number;
  };
  notificationsEnabled: boolean;
}

interface LearningInsight {
  type: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  affectedDecisions: number;
  timestamp: string;
}

interface LearningStats {
  totalDecisions: number;
  approvalRate: number;
  rejectionRate: number;
  flagRate: number;
  avgConfidence: number;
  decisionAccuracy: number;
  topPerformingRules: Record<string, number>;
  bottomPerformingRules: Record<string, number>;
  anomalies: LearningInsight[];
  trends: {
    improvingMetric: string;
    decreasingMetric: string;
  };
}

export const AgentControl: React.FC = () => {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [learning, setLearning] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'metrics' | 'decisions' | 'config' | 'insights' | 'explainability' | 'evolution' | 'anomalies' | 'demo-pro' | 'training'>('metrics');
  const [, _setRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    } catch (error) {
      console.error('Error loading agent data:', error);
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      if (!config) return;
      await axios.put(`/api/agent/config`, {
        ...config,
        rules: config.rules.map((r) =>
          r.id === ruleId ? { ...r, enabled: !currentEnabled } : r
        ),
      });
      await loadAgentData();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await axios.put('/api/agent/config', config);
      await loadAgentData();
      setNotification({ type: 'success', message: '✅ Configuração salva com sucesso!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error saving config:', error);
      setNotification({ type: 'error', message: '❌ Erro ao salvar configuração' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResetMetrics = async () => {
    const confirm = window.prompt(
      'Digite "CONFIRMAR" para resetar todas as métricas do agente (esta ação não pode ser desfeita):',
    );
    if (confirm === 'CONFIRMAR') {
      try {
        await axios.post('/api/agent/reset-metrics');
        await loadAgentData();
        setNotification({ type: 'success', message: '✅ Métricas resetadas com sucesso!' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
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
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  if (loading) {
    return <div className="agent-loading">Carregando Agent...</div>;
  }

  return (
    <div className="agent-control-container">
      {notification && (
        <div className={`notification-toast notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
      <div className="agent-header">
        <h1>🤖 Autonomous Agent Control</h1>
        <p>Sistema inteligente de validação autônoma com decisão automática</p>
      </div>

      <div className="agent-tabs">
        <button
          className={`tab-button ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          📊 Métricas
        </button>
        <button
          className={`tab-button ${activeTab === 'decisions' ? 'active' : ''}`}
          onClick={() => setActiveTab('decisions')}
        >
          📋 Decisões
        </button>
        <button
          className={`tab-button ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          🧠 Insights
        </button>
        <button
          className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          ⚙️ Configuração
        </button>
        <button
          className={`tab-button ${activeTab === 'explainability' ? 'active' : ''}`}
          onClick={() => setActiveTab('explainability')}
        >
          ✨ Explainabilidade
        </button>
        <button
          className={`tab-button ${activeTab === 'evolution' ? 'active' : ''}`}
          onClick={() => setActiveTab('evolution')}
        >
          📈 Evolução
        </button>
        <button
          className={`tab-button ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          🚨 Anomalias
        </button>
        <button
          className={`tab-button ${activeTab === 'demo-pro' ? 'active' : ''}`}
          onClick={() => setActiveTab('demo-pro')}
          style={activeTab !== 'demo-pro' ? {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderColor: '#059669',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
          } : {}}
        >
          🎬 Demo Pro
        </button>
        <button
          className={`tab-button ${activeTab === 'training' ? 'active' : ''}`}
          onClick={() => setActiveTab('training')}
          style={activeTab !== 'training' ? {
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
            borderColor: '#7c3aed',
            color: '#ffffff',
            fontWeight: 700,
            boxShadow: '0 4px 14px rgba(168,85,247,0.35)',
          } : {}}
        >
          🧠 Treinamento
        </button>
      </div>

      {activeTab === 'metrics' && (
        <div className="agent-metrics-section">
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-label">Total Processado</div>
              <div className="metric-value">{metrics?.totalProcessed || 0}</div>
              <div className="metric-unit">registros</div>
            </div>

            <div className="metric-card approved">
              <div className="metric-label">✅ Aprovados</div>
              <div className="metric-value">{metrics?.approved || 0}</div>
              <div className="metric-unit">
                {metrics && metrics.totalProcessed > 0
                  ? ((metrics.approved / metrics.totalProcessed) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>

            <div className="metric-card rejected">
              <div className="metric-label">❌ Rejeitados</div>
              <div className="metric-value">{metrics?.rejected || 0}</div>
              <div className="metric-unit">
                {metrics && metrics.totalProcessed > 0
                  ? ((metrics.rejected / metrics.totalProcessed) * 100).toFixed(1)
                  : 0}
                %
              </div>
            </div>

            <div className="metric-card flagged">
              <div className="metric-label">🚩 Marcados</div>
              <div className="metric-value">{metrics?.flaggedForReview || 0}</div>
              <div className="metric-unit">para revisão</div>
            </div>

            <div className="metric-card success">
              <div className="metric-label">Taxa de Sucesso</div>
              <div className="metric-value">{(metrics?.successRate || 0).toFixed(1)}%</div>
              <div className="metric-unit">automático</div>
            </div>

            <div className="metric-card speed">
              <div className="metric-label">Velocidade</div>
              <div className="metric-value">{(metrics?.avgProcessingTime || 0).toFixed(0)}</div>
              <div className="metric-unit">ms/registro</div>
            </div>
          </div>

          <div className="agent-actions">
            <button className="action-button reset" onClick={handleResetMetrics}>
              🔄 Resetar Métricas
            </button>
            <button className="action-button toggle" onClick={handleToggleAgent}>
              ⚡ Toggle Agent
            </button>
          </div>

          {metrics?.rulesApplied && Object.keys(metrics.rulesApplied).length > 0 && (
            <div className="rules-stats">
              <h3>📌 Regras Aplicadas</h3>
              <div className="rules-list">
                {Object.entries(metrics.rulesApplied).map(([ruleId, count]) => (
                  <div key={ruleId} className="rule-stat">
                    <span className="rule-name">{ruleId}</span>
                    <span className="rule-count">{count} aplicações</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'decisions' && (
        <div className="agent-decisions-section">
          <h3>Últimas Decisões Autônomas</h3>
          <div className="decisions-list">
            {decisions.length === 0 ? (
              <p className="no-data">Nenhuma decisão registrada ainda</p>
            ) : (
              decisions.slice(0, 20).map((decision, idx) => (
                <div key={idx} className={`decision-item decision-${decision.decision.toLowerCase()}`}>
                  <div className="decision-header">
                    <span className="decision-id">{decision.recordId}</span>
                    <span className={`decision-badge decision-${decision.decision.toLowerCase()}`}>
                      {decision.decision}
                    </span>
                    <span className={`auto-badge ${decision.isAuto ? 'auto' : 'manual'}`}>
                      {decision.isAuto ? '🤖 Automático' : '👤 Manual'}
                    </span>
                  </div>
                  <div className="decision-body">
                    <p className="reasoning">{decision.reasoning}</p>
                    <div className="decision-meta">
                      <span className="confidence">Confiança: {decision.confidence.toFixed(0)}%</span>
                      <span className="timestamp">
                        {new Date(decision.timestamp).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="agent-insights-section">
          {!learning ? (
            <div className="config-loading">Carregando insights...</div>
          ) : (
            <>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Decisões analisadas</div>
                  <div className="metric-value">{learning.totalDecisions}</div>
                  <div className="metric-unit">histórico</div>
                </div>
                <div className="metric-card approved">
                  <div className="metric-label">Taxa de aprovação</div>
                  <div className="metric-value">{learning.approvalRate.toFixed(1)}%</div>
                  <div className="metric-unit">global</div>
                </div>
                <div className="metric-card rejected">
                  <div className="metric-label">Taxa de rejeição</div>
                  <div className="metric-value">{learning.rejectionRate.toFixed(1)}%</div>
                  <div className="metric-unit">global</div>
                </div>
                <div className="metric-card flagged">
                  <div className="metric-label">Taxa de revisão</div>
                  <div className="metric-value">{learning.flagRate.toFixed(1)}%</div>
                  <div className="metric-unit">global</div>
                </div>
                <div className="metric-card success">
                  <div className="metric-label">Confiança média</div>
                  <div className="metric-value">{learning.avgConfidence.toFixed(1)}%</div>
                  <div className="metric-unit">decisões</div>
                </div>
                <div className="metric-card speed">
                  <div className="metric-label">Precisão estimada</div>
                  <div className="metric-value">{learning.decisionAccuracy.toFixed(1)}%</div>
                  <div className="metric-unit">score</div>
                </div>
              </div>

              <div className="agent-actions">
                <div className="insight-callout">
                  <strong>Melhoria</strong>
                  <span>{learning.trends.improvingMetric}</span>
                </div>
                <div className="insight-callout">
                  <strong>Declínio</strong>
                  <span>{learning.trends.decreasingMetric}</span>
                </div>
              </div>

              <div className="rules-stats">
                <h3>🧠 Insights e alertas</h3>
                {learning.anomalies.length > 0 ? (
                  <div className="insights-list">
                    {learning.anomalies.map((insight, idx) => (
                      <div key={idx} className={`insight-card insight-${insight.severity}`}>
                        <div className="insight-card-header">
                          <strong>{insight.title}</strong>
                          <span>{(insight.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p>{insight.description}</p>
                        <small>{insight.recommendation}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-rules">Nenhum insight crítico detectado no momento</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="agent-config-section">
          {!config ? (
            <div className="config-loading">Carregando configurações...</div>
          ) : (
            <>
              <h3>Configuração do Agent</h3>

              <div className="config-item">
                <label>Modo de Aprendizado</label>
                <select
                  value={config.learningMode || 'balanced'}
                  onChange={(e) => {
                    setConfig({ ...config, learningMode: e.target.value as any });
                  }}
                >
                  <option value="conservative">🛡️ Conservador (melhor segurança)</option>
                  <option value="balanced">⚖️ Balanceado (recomendado)</option>
                  <option value="aggressive">⚡ Agressivo (mais rápido)</option>
                </select>
              </div>

              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={config.autoProcessing?.enabled || false}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        autoProcessing: {
                          ...config.autoProcessing,
                          enabled: e.target.checked,
                        },
                      });
                    }}
                  />
                  Processamento Automático
                </label>
                <p className="config-hint">Validar automaticamente em intervalos regulares</p>
              </div>

              <div className="config-item">
                <label>
                  <input
                    type="checkbox"
                    checked={config.notificationsEnabled || false}
                    onChange={(e) => {
                      setConfig({
                        ...config,
                        notificationsEnabled: e.target.checked,
                      });
                    }}
                  />
                  Notificações Habilitadas
                </label>
                <p className="config-hint">Receber alertas de decisões críticas</p>
              </div>

              <div className="rules-section">
                <h4>📌 Regras Ativas</h4>
                {config.rules && config.rules.length > 0 ? (
                  config.rules.map((rule) => (
                    <div key={rule.id} className="rule-item">
                      <div className="rule-header">
                        <label className="rule-toggle">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggleRule(rule.id, rule.enabled)}
                          />
                          <span className="rule-name">{rule.name}</span>
                        </label>
                        <span className="rule-priority">Prioridade: {rule.priority}</span>
                      </div>
                      <div className="rule-condition">
                        <code>
                          {rule.condition.field} {rule.condition.operator} {rule.condition.value}
                        </code>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-rules">Nenhuma regra configurada</p>
                )}
              </div>

              <div className="config-save-section">
                <button className="save-button" onClick={handleSaveConfig}>
                  💾 Salvar Configurações
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'explainability' && (
        <div className="agent-explainability-section">
          <h3>✨ Explainabilidade de Decisões</h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Ver explicações detalhadas de por que o agente tomou cada decisão e fornecer feedback para que ele aprenda.
          </p>
          {decisions.length > 0 ? (
            <div>
              {decisions.slice(0, 10).map((decision) => (
                <ExplanationDisplay
                  key={decision.recordId}
                  recordId={decision.recordId}
                  explanation={{
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
                  }}
                />
              ))}
            </div>
          ) : (
            <p className="no-data">Nenhuma decisão para explicar ainda. Valide alguns registros primeiro!</p>
          )}
        </div>
      )}

      {activeTab === 'evolution' && (
        <div className="agent-evolution-section">
          <AgentEvolutionDashboard />
        </div>
      )}

      {activeTab === 'anomalies' && (
        <div className="agent-anomalies-section">
          <AnomalyAlertPanel />
        </div>
      )}

      {activeTab === 'demo-pro' && (
        <DemoProTab />
      )}

      {activeTab === 'training' && (
        <TrainingTab />
      )}
    </div>
  );
};

export default AgentControl;
