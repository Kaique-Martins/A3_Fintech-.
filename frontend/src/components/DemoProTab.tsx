import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DemoInput {
  produto: string;
  categoria?: string;
  preco: number;
  cidade: string;
}

interface ValidationAlert {
  severity?: string;
  message?: string;
  [key: string]: any;
}

interface DemoValidation {
  dado_corrigido?: DemoInput;
  status: string;
  motivo?: string;
  qualityScore: number;
  confidenceLevel: number;
  alerts?: ValidationAlert[];
  recommendations?: string[];
}

// Detect critical alerts whether they're strings or { severity, message } objects
function hasCriticalAlert(alerts: any[]): boolean {
  return alerts.some(a => {
    if (typeof a === 'string') return a.includes('CRÍTICO');
    if (a && typeof a === 'object') {
      return String(a.severity ?? '').includes('CRÍTICO') ||
             String(a.message ?? '').includes('CRÍTICO');
    }
    return false;
  });
}

function alertToString(a: any): string {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') {
    const sev = a.severity ? `[${a.severity}] ` : '';
    return `${sev}${a.message ?? JSON.stringify(a)}`;
  }
  return String(a);
}

interface DemoAgentDecision {
  recordId: string;
  decision: 'APPROVED' | 'REJECTED' | 'FLAGGED' | 'NEUTRAL';
  confidence: number;
  rulesApplied: string[];
  reasoning: string;
  timestamp: string;
  isAuto: boolean;
}

interface DemoSnapshot {
  recordId: string;
  scenario: string;
  input: DemoInput;
  validation: DemoValidation;
  agentDecision: DemoAgentDecision;
  timestamp: string;
}

// ─── Safe accessors ───────────────────────────────────────────────────────────
const safeNum = (v: any): number => (typeof v === 'number' && !isNaN(v) ? v : 0);
const safeStr = (v: any): string => (typeof v === 'string' ? v : '');
const safeArr = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

function normalizeSnapshot(raw: any): DemoSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
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
        alerts: safeArr<ValidationAlert>(raw.validation?.alerts),
        recommendations: safeArr<string>(raw.validation?.recommendations),
      },
      agentDecision: {
        recordId: safeStr(raw.agentDecision?.recordId),
        decision: (['APPROVED', 'REJECTED', 'FLAGGED', 'NEUTRAL'].includes(raw.agentDecision?.decision)
          ? raw.agentDecision.decision
          : 'NEUTRAL') as DemoSnapshot['agentDecision']['decision'],
        confidence: safeNum(raw.agentDecision?.confidence),
        rulesApplied: safeArr<string>(raw.agentDecision?.rulesApplied),
        reasoning: safeStr(raw.agentDecision?.reasoning) || 'Sem raciocínio disponível',
        timestamp: safeStr(raw.agentDecision?.timestamp) || new Date().toISOString(),
        isAuto: !!raw.agentDecision?.isAuto,
      },
      timestamp: safeStr(raw.timestamp) || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

interface DemoStats {
  total: number;
  approved: number;
  rejected: number;
  flagged: number;
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
] as const;

// ─── Sub-Components ───────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ value: number; label: string; color: string }> = ({ value, label, color }) => {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const dashArray = `${(clamped / 100) * circ} ${circ}`;
  return (
    <div className="score-ring-wrap">
      <svg width="66" height="66" viewBox="0 0 66 66">
        <circle cx="33" cy="33" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
        <circle
          cx="33" cy="33" r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={dashArray}
          strokeLinecap="round"
          transform="rotate(-90 33 33)"
          style={{ transition: 'stroke-dasharray 0.7s ease' }}
        />
        <text x="33" y="38" textAnchor="middle" fill={color} fontSize="13" fontWeight="800">
          {Math.round(clamped)}%
        </text>
      </svg>
      <span className="score-ring-label">{label}</span>
    </div>
  );
};

const DecisionBadge: React.FC<{ decision: string; large?: boolean }> = ({ decision, large }) => {
  const map: Record<string, { bg: string; color: string; icon: string; label: string; glow: string }> = {
    APPROVED: { bg: 'rgba(16,185,129,0.18)', color: '#10b981', icon: '✅', label: 'APROVADO',  glow: '0 0 24px rgba(16,185,129,0.45)' },
    REJECTED: { bg: 'rgba(239,68,68,0.18)',  color: '#ef4444', icon: '❌', label: 'REJEITADO', glow: '0 0 24px rgba(239,68,68,0.45)'  },
    FLAGGED:  { bg: 'rgba(245,158,11,0.18)', color: '#f59e0b', icon: '🚩', label: 'MARCADO',   glow: '0 0 24px rgba(245,158,11,0.45)' },
    NEUTRAL:  { bg: 'rgba(107,114,128,0.18)',color: '#6b7280', icon: '⚪', label: 'NEUTRO',    glow: 'none' },
  };
  const d = map[decision] ?? map.NEUTRAL;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: large ? '10px' : '6px',
      background: d.bg, color: d.color,
      padding: large ? '10px 18px' : '5px 11px',
      borderRadius: large ? '12px' : '7px',
      fontWeight: 800, fontSize: large ? '18px' : '12px',
      boxShadow: large ? d.glow : 'none',
      border: `1.5px solid ${d.color}`,
      letterSpacing: '0.06em',
      transition: 'all 0.4s ease',
    }}>
      <span>{d.icon}</span>
      <span>{d.label}</span>
    </div>
  );
};

const PipelineStep: React.FC<{
  step: number;
  icon: string;
  title: string;
  subtitle?: string;
  active: boolean;
  flash: boolean;
  decision?: string;
  children?: React.ReactNode;
}> = ({ step, icon, title, subtitle, active, flash, decision, children }) => {
  const decisionColor: Record<string, string> = {
    APPROVED: '#10b981', REJECTED: '#ef4444', FLAGGED: '#f59e0b', NEUTRAL: '#6b7280',
  };
  const borderColor = decision ? decisionColor[decision] : active ? '#3b82f6' : 'rgba(255,255,255,0.1)';
  const glow = decision ? `0 0 20px ${decisionColor[decision]}40` : active ? '0 0 16px rgba(59,130,246,0.2)' : 'none';

  return (
    <div
      className={`dp-step${active ? ' dp-step--active' : ''}${flash ? ' dp-step--flash' : ''}`}
      style={{ borderColor, boxShadow: glow }}
    >
      <div className="dp-step-header">
        <div className="dp-step-number">{step}</div>
        <span className="dp-step-icon">{icon}</span>
        <div>
          <div className="dp-step-title">{title}</div>
          {subtitle && <div className="dp-step-subtitle">{subtitle}</div>}
        </div>
      </div>
      <div className="dp-step-body">
        {active ? children : (
          <div className="dp-step-empty">Aguardando dados...</div>
        )}
      </div>
    </div>
  );
};

const PipelineArrow: React.FC<{ active: boolean }> = ({ active }) => (
  <div className={`dp-arrow${active ? ' dp-arrow--active' : ''}`}>
    <div className="dp-arrow-line" />
    <div className="dp-arrow-dot dp-arrow-dot--1" />
    <div className="dp-arrow-dot dp-arrow-dot--2" />
    <div className="dp-arrow-dot dp-arrow-dot--3" />
    <div className="dp-arrow-head">›</div>
  </div>
);

const RuleCard: React.FC<{
  rule: typeof RULE_DEFS[number];
  fired: boolean;
  snapshot: DemoSnapshot | null;
}> = ({ rule, fired, snapshot }) => {
  let actualValue: string | number = '—';
  if (snapshot) {
    if (rule.id === 'rule-high-quality' || rule.id === 'rule-reject-invalid') {
      actualValue = `${Math.round(snapshot.validation.qualityScore)}%`;
    } else if (rule.id === 'rule-low-confidence') {
      actualValue = `${Math.round(snapshot.validation.confidenceLevel)}%`;
    } else if (rule.id === 'rule-critical-alerts') {
      const alerts = snapshot.validation.alerts ?? [];
      actualValue = hasCriticalAlert(alerts) ? 'SIM' : 'NÃO';
    }
  }

  return (
    <div
      className={`dp-rule-card${fired ? ' dp-rule-card--fired' : ''}`}
      style={{
        background: fired ? rule.bg : 'rgba(255,255,255,0.03)',
        borderColor: fired ? rule.color : 'rgba(255,255,255,0.08)',
        boxShadow: fired ? `0 0 16px ${rule.glow}` : 'none',
      }}
    >
      <div className="dp-rule-header">
        <div className="dp-rule-status" style={{ background: fired ? rule.color : '#374151' }}>
          {fired ? rule.actionIcon : '○'}
        </div>
        <div className="dp-rule-info">
          <div className="dp-rule-name" style={{ color: fired ? rule.color : '#9ca3af' }}>
            {rule.name}
          </div>
          <div className="dp-rule-priority">Prioridade {rule.priority}</div>
        </div>
        <div
          className="dp-rule-badge"
          style={{
            background: fired ? rule.color : 'rgba(107,114,128,0.2)',
            color: fired ? '#fff' : '#6b7280',
          }}
        >
          {fired ? rule.actionLabel : 'INATIVA'}
        </div>
      </div>

      <div className="dp-rule-condition">
        <code>{rule.condition}</code>
      </div>

      <div className="dp-rule-desc">{rule.description}</div>

      {snapshot && (
        <div className="dp-rule-value">
          <span>Valor atual:</span>
          <strong style={{ color: fired ? rule.color : '#6b7280' }}>{actualValue}</strong>
        </div>
      )}
    </div>
  );
};

const HistoryItem: React.FC<{ item: DemoSnapshot; isLatest: boolean }> = ({ item, isLatest }) => {
  const colorMap: Record<string, string> = {
    APPROVED: '#10b981', REJECTED: '#ef4444', FLAGGED: '#f59e0b', NEUTRAL: '#6b7280',
  };
  const iconMap: Record<string, string> = {
    APPROVED: '✅', REJECTED: '❌', FLAGGED: '🚩', NEUTRAL: '⚪',
  };
  const color = colorMap[item.agentDecision.decision] ?? '#6b7280';
  const icon = iconMap[item.agentDecision.decision] ?? '⚪';
  const time = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`dp-history-item${isLatest ? ' dp-history-item--latest' : ''}`}>
      <div className="dp-history-dot" style={{ background: color, boxShadow: isLatest ? `0 0 10px ${color}` : 'none' }} />
      <div className="dp-history-line" />
      <div className="dp-history-content">
        <div className="dp-history-row">
          <span className="dp-history-icon">{icon}</span>
          <span className="dp-history-decision" style={{ color }}>{item.agentDecision.decision}</span>
          <span className="dp-history-conf">{Math.round(item.agentDecision.confidence)}%</span>
          {isLatest && <span className="dp-history-new">NOVO</span>}
        </div>
        <div className="dp-history-scenario">{item.scenario}</div>
        <div className="dp-history-meta">
          <span>{item.input.produto?.slice(0, 28)}{item.input.produto?.length > 28 ? '…' : ''}</span>
          <span className="dp-history-time">{time}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── Error Boundary ───────────────────────────────────────────────────────────
class DemoErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) { console.error('DemoProTab crash:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: '2rem', borderRadius: '1rem',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', textAlign: 'center',
        }}>
          <h3 style={{ marginTop: 0 }}>⚠️ Erro ao renderizar Demo Pro</h3>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: '1rem', padding: '0.5rem 1rem',
              background: '#3b82f6', color: '#fff', border: 'none',
              borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const DemoProTabInner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [snapshot, setSnapshot] = useState<DemoSnapshot | null>(null);
  const [history, setHistory] = useState<DemoSnapshot[]>([]);
  const [nextScenario, setNextScenario] = useState<string>('');
  const [flash, setFlash] = useState(false);
  const [stats, setStats] = useState<DemoStats>({ total: 0, approved: 0, rejected: 0, flagged: 0 });
  const [stepping, setStepping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef<string | null>(null);

  const applySnapshot = useCallback((snap: DemoSnapshot) => {
    if (snap.recordId === lastIdRef.current) return;
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
      if (typeof next === 'string') setNextScenario(next);
      const normalized = normalizeSnapshot(snap);
      if (normalized) applySnapshot(normalized);
    } catch {
      // silently ignore network errors
    }
  }, [applySnapshot]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  useEffect(() => {
    if (isRunning) {
      pollRef.current = setInterval(fetchPreview, 1500);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isRunning, fetchPreview]);

  const handleStart = async () => {
    try {
      await axios.post('/api/demo/start');
      setIsRunning(true);
    } catch (e) {
      console.error('Erro ao iniciar demo:', e);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post('/api/demo/stop');
      setIsRunning(false);
    } catch (e) {
      console.error('Erro ao parar demo:', e);
    }
  };

  const handleStep = async () => {
    setStepping(true);
    try {
      await axios.post('/api/demo/step');
      await fetchPreview();
    } catch (e) {
      console.warn('Endpoint /step indisponível (backend precisa ser reiniciado). Usando start/stop:', e);
      // Fallback: start then stop após primeiro tick
      try {
        await axios.post('/api/demo/start');
        await new Promise(r => setTimeout(r, 200));
        await axios.post('/api/demo/stop');
        await fetchPreview();
      } catch (e2) {
        console.error('Fallback também falhou:', e2);
      }
    } finally {
      setStepping(false);
    }
  };

  const approvalRate = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : '0';

  return (
    <div className="demo-pro-root">

      {/* ── Header ── */}
      <div className="demo-pro-header">
        <div className="demo-pro-header-left">
          <div className="demo-pro-title-row">
            <h2 className="demo-pro-title">🎬 Demo Pro</h2>
            <span className={`demo-live-badge${isRunning ? ' demo-live-badge--on' : ''}`}>
              <span className="demo-live-dot" />
              {isRunning ? 'AO VIVO' : 'PARADO'}
            </span>
          </div>
          <p className="demo-pro-subtitle">
            Visualize o pipeline completo: entrada de dados → validação → decisão autônoma do agente
          </p>
        </div>
        <div className="demo-pro-controls">
          {nextScenario && (
            <div className="demo-next-label">
              <span>Próximo cenário:</span>
              <strong>{nextScenario}</strong>
            </div>
          )}
          <div className="demo-buttons">
            <button
              className={`demo-btn demo-btn--step${stepping ? ' demo-btn--loading' : ''}`}
              onClick={handleStep}
              disabled={isRunning || stepping}
              title="Processar um registro manualmente"
            >
              {stepping ? '⏳' : '⏭'} Passo a Passo
            </button>
            <button
              className={`demo-btn${isRunning ? ' demo-btn--stop' : ' demo-btn--start'}`}
              onClick={isRunning ? handleStop : handleStart}
            >
              {isRunning ? '⏹ Parar Demo' : '▶ Iniciar Demo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="demo-stats-row">
        <div className="demo-stat">
          <div className="demo-stat-value">{stats.total}</div>
          <div className="demo-stat-label">Total Processado</div>
          <div className="demo-stat-bar" style={{ width: '100%', background: '#3b82f6' }} />
        </div>
        <div className="demo-stat demo-stat--green">
          <div className="demo-stat-value">{stats.approved}</div>
          <div className="demo-stat-label">✅ Aprovados</div>
          <div className="demo-stat-bar" style={{
            width: stats.total > 0 ? `${(stats.approved / stats.total) * 100}%` : '0%',
            background: '#10b981'
          }} />
        </div>
        <div className="demo-stat demo-stat--red">
          <div className="demo-stat-value">{stats.rejected}</div>
          <div className="demo-stat-label">❌ Rejeitados</div>
          <div className="demo-stat-bar" style={{
            width: stats.total > 0 ? `${(stats.rejected / stats.total) * 100}%` : '0%',
            background: '#ef4444'
          }} />
        </div>
        <div className="demo-stat demo-stat--yellow">
          <div className="demo-stat-value">{stats.flagged}</div>
          <div className="demo-stat-label">🚩 Marcados</div>
          <div className="demo-stat-bar" style={{
            width: stats.total > 0 ? `${(stats.flagged / stats.total) * 100}%` : '0%',
            background: '#f59e0b'
          }} />
        </div>
        <div className="demo-stat demo-stat--purple">
          <div className="demo-stat-value">{approvalRate}%</div>
          <div className="demo-stat-label">Taxa de Aprovação</div>
          <div className="demo-stat-bar" style={{
            width: `${approvalRate}%`,
            background: 'linear-gradient(90deg, #3b82f6, #a855f7)'
          }} />
        </div>
      </div>

      {/* ── Pipeline Flow ── */}
      <div className="demo-pipeline-section">
        <div className="demo-section-title">⚡ Pipeline de Processamento</div>
        {snapshot && (
          <div className="demo-scenario-banner">
            <span>📋 Cenário atual:</span>
            <strong>{snapshot.scenario}</strong>
            <span className="demo-record-id">{snapshot.recordId}</span>
          </div>
        )}

        <div className="demo-pipeline">
          {/* Step 1: Input */}
          <PipelineStep step={1} icon="📥" title="Entrada de Dados" subtitle="Dados brutos recebidos" active={!!snapshot} flash={flash}>
            {snapshot && (
              <div className="dp-step-fields">
                <div className="dp-field"><span>Produto</span><strong>{snapshot.input.produto}</strong></div>
                <div className="dp-field"><span>Categoria</span><strong>{snapshot.input.categoria || <em>inferida</em>}</strong></div>
                <div className="dp-field"><span>Preço</span><strong>R$ {snapshot.input.preco?.toFixed(2)}</strong></div>
                <div className="dp-field"><span>Cidade</span><strong>{snapshot.input.cidade}</strong></div>
              </div>
            )}
          </PipelineStep>

          <PipelineArrow active={!!snapshot} />

          {/* Step 2: Validation */}
          <PipelineStep step={2} icon="🔍" title="Motor de Validação" subtitle="Qualidade & integridade" active={!!snapshot} flash={flash}>
            {snapshot && (
              <div className="dp-step-rings">
                <ScoreRing value={snapshot.validation.qualityScore} label="Qualidade" color="#3b82f6" />
                <ScoreRing value={snapshot.validation.confidenceLevel} label="Confiança" color="#a855f7" />
                <div className="dp-validation-status">
                  <div
                    className="dp-status-tag"
                    style={{
                      background: snapshot.validation.status === 'valid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: snapshot.validation.status === 'valid' ? '#10b981' : '#f59e0b',
                    }}
                  >
                    {snapshot.validation.status?.toUpperCase()}
                  </div>
                  {(snapshot.validation.alerts ?? []).length > 0 && (
                    <div className="dp-alerts-count">
                      🔔 {snapshot.validation.alerts!.length} alerta{snapshot.validation.alerts!.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </PipelineStep>

          <PipelineArrow active={!!snapshot} />

          {/* Step 3: Agent */}
          <PipelineStep step={3} icon="🤖" title="Agente Autônomo" subtitle="Avaliação das regras" active={!!snapshot} flash={flash}>
            {snapshot && (
              <div className="dp-step-agent">
                <ScoreRing value={snapshot.agentDecision.confidence} label="Confiança IA" color="#f59e0b" />
                <div className="dp-rules-applied">
                  <div className="dp-rules-count">
                    <strong>{snapshot.agentDecision.rulesApplied.length}</strong>
                    <span>regra{snapshot.agentDecision.rulesApplied.length !== 1 ? 's' : ''} ativa{snapshot.agentDecision.rulesApplied.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="dp-rules-chips">
                    {snapshot.agentDecision.rulesApplied.map(r => (
                      <span key={r} className="dp-rule-chip">{r.replace('rule-', '')}</span>
                    ))}
                    {snapshot.agentDecision.rulesApplied.length === 0 && (
                      <span className="dp-rule-chip dp-rule-chip--none">nenhuma disparada</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </PipelineStep>

          <PipelineArrow active={!!snapshot} />

          {/* Step 4: Decision */}
          <PipelineStep step={4} icon="⚡" title="Decisão Final" subtitle="Resultado autônomo" active={!!snapshot} flash={flash} decision={snapshot?.agentDecision.decision}>
            {snapshot && (
              <div className="dp-step-decision">
                <DecisionBadge decision={snapshot.agentDecision.decision} large />
                <p className="dp-reasoning">{snapshot.agentDecision.reasoning}</p>
                <div className="dp-auto-tag">
                  {snapshot.agentDecision.isAuto ? '🤖 Decisão Automática' : '👤 Decisão Manual'}
                </div>
              </div>
            )}
          </PipelineStep>
        </div>
      </div>

      {/* ── Rules + History ── */}
      <div className="demo-bottom-grid">

        {/* Rules Engine */}
        <div className="demo-rules-section">
          <div className="demo-section-title">⚙️ Motor de Regras — Por que essa decisão?</div>
          <p className="demo-section-desc">
            Cada regra é avaliada em sequência. As regras destacadas foram ativadas e influenciaram a decisão final.
          </p>
          <div className="dp-rules-grid">
            {RULE_DEFS.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                fired={!!snapshot?.agentDecision.rulesApplied.includes(rule.id)}
                snapshot={snapshot}
              />
            ))}
          </div>

          {/* Reasoning block */}
          {snapshot && (
            <div className="demo-reasoning-block">
              <div className="demo-reasoning-title">💬 Raciocínio completo do agente:</div>
              <div className="demo-reasoning-text">"{snapshot.agentDecision.reasoning}"</div>
              {snapshot.validation.motivo && (
                <div className="demo-reasoning-validation">
                  <strong>Validação:</strong> {snapshot.validation.motivo}
                </div>
              )}
              {(snapshot.validation.alerts ?? []).length > 0 && (
                <div className="demo-recommendations">
                  <strong>Alertas detectados:</strong>
                  <ul>
                    {snapshot.validation.alerts!.map((a, i) => (
                      <li key={i}>{alertToString(a)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(snapshot.validation.recommendations ?? []).length > 0 && (
                <div className="demo-recommendations">
                  <strong>Recomendações:</strong>
                  <ul>
                    {snapshot.validation.recommendations!.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* History Feed */}
        <div className="demo-history-section">
          <div className="demo-section-title">📜 Histórico ao Vivo</div>
          <p className="demo-section-desc">Últimas decisões tomadas pelo agente em tempo real.</p>
          <div className="dp-history-feed">
            {history.length === 0 ? (
              <div className="demo-empty-state">
                <div className="demo-empty-icon">🤖</div>
                <div className="demo-empty-text">Inicie o demo ou use "Passo a Passo" para ver decisões ao vivo</div>
              </div>
            ) : (
              history.map((item, idx) => (
                <HistoryItem key={item.recordId} item={item} isLatest={idx === 0} />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export const DemoProTab: React.FC = () => (
  <DemoErrorBoundary>
    <DemoProTabInner />
  </DemoErrorBoundary>
);

export default DemoProTab;
