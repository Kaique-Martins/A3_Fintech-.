import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import '../styles/TrainingTab.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExpectedBehavior = 'APPROVE' | 'REJECT' | 'FLAG' | 'NEUTRAL' | 'CUSTOM';
type ModelStatus = 'COLD' | 'LEARNING' | 'TRAINED' | 'EXPERT';

interface TrainingExample {
  id: string;
  idealQuestion: string;
  idealAnswer: string;
  expectedBehavior: ExpectedBehavior;
  context: string;
  keywords: string[];
  confidence: number;
  positiveCount: number;
  negativeCount: number;
  priorityBoost: number;
  appliedCount: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  tags?: string[];
}

interface MatchResult {
  example: TrainingExample;
  similarity: number;
  rankScore: number;
  matchedKeywords: string[];
}

interface EvolutionPoint {
  timestamp: string;
  accuracy: number;
  totalExamples: number;
  totalFeedbacks: number;
}

interface TrainingAnalytics {
  totalExamples: number;
  totalFeedbacks: number;
  positiveFeedbacks: number;
  negativeFeedbacks: number;
  accuracyRate: number;
  avgConfidence: number;
  evolutionTrend: EvolutionPoint[];
  topExamples: TrainingExample[];
  weakExamples: TrainingExample[];
  correctedResponses: number;
  modelStatus: ModelStatus;
  lastTrainedAt?: string;
}

interface TrainingFeedback {
  id: string;
  exampleId?: string;
  decisionRecordId?: string;
  rating: 'positive' | 'negative';
  notes?: string;
  timestamp: string;
}

type SubTab = 'overview' | 'auto' | 'library' | 'create' | 'feedback' | 'playground';

interface AutoTrainEvent {
  id: string;
  timestamp: string;
  type: 'CYCLE_START' | 'EXAMPLE_CREATED' | 'EXAMPLE_REINFORCED' | 'EXAMPLE_PENALIZED' | 'CYCLE_END' | 'SKIPPED';
  message: string;
  exampleId?: string;
  cluster?: {
    decision: string;
    samples: number;
    avgQuality: number;
    avgConfidence: number;
    representativeProduct?: string;
  };
}

interface AutoTrainStatus {
  enabled: boolean;
  intervalMs: number;
  totalCycles: number;
  examplesCreated: number;
  examplesReinforced: number;
  examplesPenalized: number;
  lastCycleAt?: string;
  nextCycleAt?: string;
  isRunningCycle: boolean;
  recentEvents: AutoTrainEvent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BEHAVIOR_META: Record<ExpectedBehavior, { icon: string; label: string; color: string }> = {
  APPROVE: { icon: '✅', label: 'Aprovar',  color: '#10b981' },
  REJECT:  { icon: '❌', label: 'Rejeitar', color: '#ef4444' },
  FLAG:    { icon: '🚩', label: 'Marcar',   color: '#f59e0b' },
  NEUTRAL: { icon: '⚪', label: 'Neutro',   color: '#6b7280' },
  CUSTOM:  { icon: '⚙️', label: 'Custom',  color: '#a855f7' },
};

const STATUS_META: Record<ModelStatus, { color: string; label: string; pct: number; desc: string }> = {
  COLD:     { color: '#6b7280', label: 'Frio',       pct: 15, desc: 'Aguardando dados de treino' },
  LEARNING: { color: '#3b82f6', label: 'Aprendendo', pct: 45, desc: 'Modelo evoluindo' },
  TRAINED:  { color: '#a855f7', label: 'Treinado',   pct: 75, desc: 'Padrões consolidados' },
  EXPERT:   { color: '#10b981', label: 'Expert',     pct: 100, desc: 'Alta precisão' },
};

// ─── Sub Components ───────────────────────────────────────────────────────────

const ConfidenceBar: React.FC<{ value: number; color?: string; small?: boolean }> = ({ value, color = '#3b82f6', small }) => (
  <div className={`tt-conf-bar${small ? ' tt-conf-bar--small' : ''}`}>
    <div className="tt-conf-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    <span className="tt-conf-bar-label">{Math.round(value)}%</span>
  </div>
);

const ModelStatusBadge: React.FC<{ status: ModelStatus; pulse?: boolean }> = ({ status, pulse }) => {
  const meta = STATUS_META[status];
  return (
    <div className={`tt-status-badge${pulse ? ' tt-status-badge--pulse' : ''}`} style={{ borderColor: meta.color, color: meta.color }}>
      <span className="tt-status-dot" style={{ background: meta.color }} />
      <span className="tt-status-label">MODELO {meta.label.toUpperCase()}</span>
      <span className="tt-status-pct">{meta.pct}%</span>
    </div>
  );
};

const EvolutionChart: React.FC<{ data: EvolutionPoint[] }> = ({ data }) => {
  const W = 600;
  const H = 160;
  const padding = { top: 12, right: 12, bottom: 22, left: 32 };

  const chart = useMemo(() => {
    if (data.length === 0) return null;
    const points = data.slice(-50);
    const xs = points.map((_, i) => i);
    const ys = points.map((p) => p.accuracy);
    const maxX = Math.max(1, xs[xs.length - 1]);
    const minY = 0;
    const maxY = 100;
    const sx = (x: number) => padding.left + (x / maxX) * (W - padding.left - padding.right);
    const sy = (y: number) => H - padding.bottom - ((y - minY) / (maxY - minY)) * (H - padding.top - padding.bottom);
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(xs[i])},${sy(p.accuracy)}`).join(' ');
    const area = `${path} L${sx(xs[xs.length - 1])},${sy(0)} L${sx(0)},${sy(0)} Z`;
    return { points, sx, sy, path, area, xs, ys };
  }, [data]);

  if (!chart) {
    return (
      <div className="tt-chart-empty">
        <div className="tt-chart-empty-icon">📈</div>
        <p>Sem histórico ainda. Cadastre exemplos e envie feedbacks para ver a evolução.</p>
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="tt-chart" preserveAspectRatio="none">
      <defs>
        <linearGradient id="evoFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => {
        const y = chart.sy(g);
        return (
          <g key={g}>
            <line x1={padding.left} x2={W - padding.right} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray={g === 50 ? '0' : '3,4'} />
            <text x={4} y={y + 3} fill="#4b5563" fontSize="9">{g}%</text>
          </g>
        );
      })}
      <path d={chart.area} fill="url(#evoFill)" />
      <path d={chart.path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      {chart.points.map((p, i) => (
        <circle key={i} cx={chart.sx(i)} cy={chart.sy(p.accuracy)} r={i === chart.points.length - 1 ? 4 : 2} fill={i === chart.points.length - 1 ? '#10b981' : '#3b82f6'} />
      ))}
    </svg>
  );
};

const ExampleCard: React.FC<{
  example: TrainingExample;
  onFeedback: (id: string, rating: 'positive' | 'negative') => void;
  onDelete: (id: string) => void;
  onBoostChange: (id: string, boost: number) => void;
}> = ({ example, onFeedback, onDelete, onBoostChange }) => {
  const meta = BEHAVIOR_META[example.expectedBehavior];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tt-example-card" style={{ borderLeftColor: meta.color }}>
      <div className="tt-example-header" onClick={() => setExpanded((v) => !v)}>
        <div className="tt-example-icon" style={{ background: meta.color }}>{meta.icon}</div>
        <div className="tt-example-main">
          <div className="tt-example-q">{example.idealQuestion}</div>
          <div className="tt-example-meta">
            <span className="tt-example-behavior" style={{ color: meta.color }}>{meta.label}</span>
            <span className="tt-example-id">{example.id}</span>
            {example.appliedCount > 0 && (
              <span className="tt-example-applied">🎯 usado {example.appliedCount}x</span>
            )}
          </div>
        </div>
        <div className="tt-example-conf">
          <ConfidenceBar value={example.confidence} color={meta.color} small />
        </div>
      </div>

      {expanded && (
        <div className="tt-example-body">
          <div className="tt-example-section">
            <span className="tt-example-label">Resposta ideal</span>
            <p>{example.idealAnswer}</p>
          </div>
          {example.context && (
            <div className="tt-example-section">
              <span className="tt-example-label">Contexto</span>
              <p>{example.context}</p>
            </div>
          )}
          {example.keywords.length > 0 && (
            <div className="tt-example-section">
              <span className="tt-example-label">Palavras-chave</span>
              <div className="tt-kw-chips">
                {example.keywords.map((k) => <span key={k} className="tt-kw-chip">{k}</span>)}
              </div>
            </div>
          )}

          <div className="tt-example-counters">
            <span className="tt-counter tt-counter--pos">👍 {example.positiveCount}</span>
            <span className="tt-counter tt-counter--neg">👎 {example.negativeCount}</span>
            <span className="tt-counter">📊 {example.confidence}% confiança</span>
          </div>

          <div className="tt-example-boost">
            <label>Priority Boost</label>
            <input
              type="range" min={-50} max={50} value={example.priorityBoost}
              onChange={(e) => onBoostChange(example.id, parseInt(e.target.value, 10))}
            />
            <span>{example.priorityBoost > 0 ? `+${example.priorityBoost}` : example.priorityBoost}</span>
          </div>

          <div className="tt-example-actions">
            <button className="tt-btn tt-btn--pos" onClick={() => onFeedback(example.id, 'positive')}>👍 Reforçar</button>
            <button className="tt-btn tt-btn--neg" onClick={() => onFeedback(example.id, 'negative')}>👎 Penalizar</button>
            <button className="tt-btn tt-btn--ghost" onClick={() => onDelete(example.id)}>🗑 Remover</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const TrainingTab: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [feedback, setFeedback] = useState<TrainingFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
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
    } catch (e) {
      console.error('Erro ao carregar dados de treinamento:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 10000);
    return () => clearInterval(id);
  }, [loadAll]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleFeedback = async (exampleId: string, rating: 'positive' | 'negative') => {
    try {
      await axios.post('/api/training/feedback', { exampleId, rating });
      showToast('success', rating === 'positive' ? '👍 Reforço positivo aplicado' : '👎 Penalidade aplicada');
      loadAll();
    } catch {
      showToast('error', 'Erro ao registrar feedback');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este exemplo do treinamento?')) return;
    try {
      await axios.delete(`/api/training/examples/${id}`);
      showToast('success', 'Exemplo removido');
      loadAll();
    } catch {
      showToast('error', 'Erro ao remover');
    }
  };

  const handleBoost = async (id: string, boost: number) => {
    setExamples((prev) => prev.map((e) => e.id === id ? { ...e, priorityBoost: boost } : e));
    try {
      await axios.patch(`/api/training/examples/${id}`, { priorityBoost: boost });
    } catch {
      showToast('error', 'Erro ao ajustar boost');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="training-tab-root">
        <div className="tt-loading">
          <div className="tt-loading-orb" />
          <p>Carregando modelo de treinamento...</p>
        </div>
      </div>
    );
  }

  const a = analytics;
  const evolving = !!a && a.modelStatus === 'LEARNING';

  return (
    <div className="training-tab-root">
      {toast && (
        <div className={`tt-toast tt-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ───────────────────────────────────────── */}
      <div className="tt-header">
        <div className="tt-header-left">
          <div className="tt-header-title-row">
            <h2 className="tt-title">🧠 Centro de Treinamento</h2>
            {a && <ModelStatusBadge status={a.modelStatus} pulse={evolving} />}
          </div>
          <p className="tt-subtitle">
            Sistema de aprendizado contínuo com memória vetorial, reinforcement feedback e adaptive response engine
          </p>
        </div>
        <div className="tt-header-right">
          {a && (
            <>
              <div className="tt-kpi">
                <div className="tt-kpi-value">{a.accuracyRate}%</div>
                <div className="tt-kpi-label">Precisão</div>
              </div>
              <div className="tt-kpi">
                <div className="tt-kpi-value">{a.totalExamples}</div>
                <div className="tt-kpi-label">Exemplos</div>
              </div>
              <div className="tt-kpi">
                <div className="tt-kpi-value">{a.avgConfidence}%</div>
                <div className="tt-kpi-label">Confiança</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Sub Tabs ──────────────────────────────────────── */}
      <div className="tt-subtabs">
        {([
          ['overview',   '📊 Visão Geral'],
          ['auto',       '🤖 Auto-Training'],
          ['library',    '📚 Biblioteca'],
          ['create',     '➕ Treinar Manual'],
          ['feedback',   '💬 Feedback'],
          ['playground', '🔬 Playground'],
        ] as [SubTab, string][]).map(([k, label]) => (
          <button
            key={k}
            className={`tt-subtab${subTab === k ? ' tt-subtab--active' : ''}`}
            onClick={() => setSubTab(k)}
          >{label}</button>
        ))}
      </div>

      {/* ── Sub-tab Content ───────────────────────────────── */}
      {subTab === 'overview'   && a && <OverviewPanel analytics={a} />}
      {subTab === 'auto'       && <AutoTrainPanel onActivity={loadAll} />}
      {subTab === 'library'    && (
        <LibraryPanel
          examples={examples}
          onFeedback={handleFeedback}
          onDelete={handleDelete}
          onBoost={handleBoost}
        />
      )}
      {subTab === 'create'     && <CreatePanel onCreated={() => { loadAll(); showToast('success', '✅ Exemplo treinado e indexado'); setSubTab('library'); }} />}
      {subTab === 'feedback'   && <FeedbackPanel feedback={feedback} examples={examples} />}
      {subTab === 'playground' && <PlaygroundPanel />}
    </div>
  );
};

// ─── Overview Panel ───────────────────────────────────────────────────────────

const OverviewPanel: React.FC<{ analytics: TrainingAnalytics }> = ({ analytics: a }) => (
  <div className="tt-overview">
    <div className="tt-overview-grid">
      <div className="tt-card tt-card--primary">
        <div className="tt-card-header">
          <span className="tt-card-icon">📈</span>
          <h3>Evolução da Precisão</h3>
          <span className="tt-card-badge">últimos {Math.min(a.evolutionTrend.length, 50)} pontos</span>
        </div>
        <EvolutionChart data={a.evolutionTrend} />
      </div>

      <div className="tt-card">
        <div className="tt-card-header">
          <span className="tt-card-icon">🎯</span>
          <h3>Feedback Distribution</h3>
        </div>
        <div className="tt-fb-distribution">
          <div className="tt-fb-row">
            <span>👍 Positivos</span>
            <strong style={{ color: '#10b981' }}>{a.positiveFeedbacks}</strong>
          </div>
          <ConfidenceBar value={a.totalFeedbacks > 0 ? (a.positiveFeedbacks / a.totalFeedbacks) * 100 : 0} color="#10b981" />
          <div className="tt-fb-row">
            <span>👎 Negativos</span>
            <strong style={{ color: '#ef4444' }}>{a.negativeFeedbacks}</strong>
          </div>
          <ConfidenceBar value={a.totalFeedbacks > 0 ? (a.negativeFeedbacks / a.totalFeedbacks) * 100 : 0} color="#ef4444" />
          <div className="tt-fb-row tt-fb-row--total">
            <span>Total</span>
            <strong>{a.totalFeedbacks}</strong>
          </div>
        </div>
      </div>

      <div className="tt-card">
        <div className="tt-card-header">
          <span className="tt-card-icon">🏆</span>
          <h3>Top Exemplos</h3>
          <span className="tt-card-badge">por confiança</span>
        </div>
        <div className="tt-list">
          {a.topExamples.length === 0 && <div className="tt-empty">Nenhum exemplo treinado ainda</div>}
          {a.topExamples.map((ex) => {
            const meta = BEHAVIOR_META[ex.expectedBehavior];
            return (
              <div key={ex.id} className="tt-list-item">
                <span className="tt-list-icon" style={{ background: meta.color }}>{meta.icon}</span>
                <div className="tt-list-content">
                  <div className="tt-list-title">{ex.idealQuestion.slice(0, 60)}{ex.idealQuestion.length > 60 ? '…' : ''}</div>
                  <ConfidenceBar value={ex.confidence} color={meta.color} small />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tt-card">
        <div className="tt-card-header">
          <span className="tt-card-icon">⚠️</span>
          <h3>Necessitam Reforço</h3>
          <span className="tt-card-badge">menor confiança</span>
        </div>
        <div className="tt-list">
          {a.weakExamples.length === 0 && <div className="tt-empty">Nenhum exemplo cadastrado</div>}
          {a.weakExamples.map((ex) => {
            const meta = BEHAVIOR_META[ex.expectedBehavior];
            return (
              <div key={ex.id} className="tt-list-item">
                <span className="tt-list-icon" style={{ background: meta.color }}>{meta.icon}</span>
                <div className="tt-list-content">
                  <div className="tt-list-title">{ex.idealQuestion.slice(0, 60)}{ex.idealQuestion.length > 60 ? '…' : ''}</div>
                  <ConfidenceBar value={ex.confidence} color={meta.color} small />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>

    <div className="tt-concepts">
      <h4>🎓 Conceitos aplicados neste sistema</h4>
      <div className="tt-concepts-grid">
        <div className="tt-concept">
          <strong>Vector Memory</strong>
          <p>Embeddings TF-IDF sobre bag-of-words com boost em keywords</p>
        </div>
        <div className="tt-concept">
          <strong>Cosine Similarity</strong>
          <p>Retrieval de exemplos relevantes via produto escalar normalizado</p>
        </div>
        <div className="tt-concept">
          <strong>Reinforcement Feedback</strong>
          <p>Confidence via Laplace smoothing sobre 👍/👎</p>
        </div>
        <div className="tt-concept">
          <strong>Adaptive Response</strong>
          <p>Agent consulta exemplos antes de decidir e ajusta comportamento</p>
        </div>
        <div className="tt-concept">
          <strong>Contextual Learning</strong>
          <p>Cada exemplo carrega pergunta, resposta, comportamento e contexto</p>
        </div>
        <div className="tt-concept">
          <strong>Temporal Decay</strong>
          <p>Exemplos recém-usados ganham peso no ranking adaptativo</p>
        </div>
      </div>
    </div>
  </div>
);

// ─── Library Panel ────────────────────────────────────────────────────────────

const LibraryPanel: React.FC<{
  examples: TrainingExample[];
  onFeedback: (id: string, r: 'positive' | 'negative') => void;
  onDelete: (id: string) => void;
  onBoost: (id: string, b: number) => void;
}> = ({ examples, onFeedback, onDelete, onBoost }) => {
  const [filter, setFilter] = useState<'all' | ExpectedBehavior>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return examples
      .filter((e) => filter === 'all' ? true : e.expectedBehavior === filter)
      .filter((e) => query.trim() === '' ? true :
        (e.idealQuestion + ' ' + e.idealAnswer + ' ' + e.keywords.join(' '))
          .toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => b.confidence - a.confidence);
  }, [examples, filter, query]);

  return (
    <div className="tt-library">
      <div className="tt-library-toolbar">
        <input
          className="tt-input"
          placeholder="🔍 Buscar exemplos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tt-filter-row">
          {(['all', 'APPROVE', 'REJECT', 'FLAG', 'NEUTRAL', 'CUSTOM'] as const).map((k) => (
            <button
              key={k}
              className={`tt-filter${filter === k ? ' tt-filter--active' : ''}`}
              onClick={() => setFilter(k)}
            >{k === 'all' ? 'Todos' : BEHAVIOR_META[k].label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="tt-empty-state">
          <div className="tt-empty-icon">📭</div>
          <p>Nenhum exemplo encontrado.</p>
          <p className="tt-empty-hint">Use a aba <strong>➕ Treinar</strong> para começar.</p>
        </div>
      ) : (
        <div className="tt-examples-grid">
          {filtered.map((ex) => (
            <ExampleCard
              key={ex.id}
              example={ex}
              onFeedback={onFeedback}
              onDelete={onDelete}
              onBoostChange={onBoost}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Create Panel ─────────────────────────────────────────────────────────────

const CreatePanel: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const [form, setForm] = useState({
    idealQuestion: '',
    idealAnswer: '',
    expectedBehavior: 'APPROVE' as ExpectedBehavior,
    context: '',
    keywordsRaw: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

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
        idealAnswer:   form.idealAnswer.trim(),
        expectedBehavior: form.expectedBehavior,
        context: form.context.trim(),
        keywords: form.keywordsRaw.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setForm({ idealQuestion: '', idealAnswer: '', expectedBehavior: 'APPROVE', context: '', keywordsRaw: '' });
      onCreated();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erro ao salvar exemplo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tt-create">
      <div className="tt-create-header">
        <h3>Treinar novo padrão</h3>
        <p>O exemplo será indexado via embedding vetorial e consultado pelo agente em decisões futuras.</p>
      </div>

      <div className="tt-form">
        <div className="tt-field">
          <label>Pergunta / Cenário ideal <span className="tt-req">*</span></label>
          <input
            type="text"
            className="tt-input"
            placeholder="Ex: Notebook Dell com qualidade 95% e categoria Eletrônicos"
            value={form.idealQuestion}
            onChange={(e) => update('idealQuestion', e.target.value)}
          />
        </div>

        <div className="tt-field">
          <label>Resposta / Decisão ideal <span className="tt-req">*</span></label>
          <textarea
            className="tt-textarea"
            placeholder="Ex: Aprovar automaticamente — alta qualidade, marca conhecida, preço dentro do esperado"
            rows={3}
            value={form.idealAnswer}
            onChange={(e) => update('idealAnswer', e.target.value)}
          />
        </div>

        <div className="tt-field">
          <label>Comportamento esperado</label>
          <div className="tt-behavior-pick">
            {(['APPROVE', 'REJECT', 'FLAG', 'NEUTRAL'] as ExpectedBehavior[]).map((b) => {
              const meta = BEHAVIOR_META[b];
              const active = form.expectedBehavior === b;
              return (
                <button
                  key={b}
                  type="button"
                  className={`tt-behavior-btn${active ? ' tt-behavior-btn--active' : ''}`}
                  style={active ? { background: meta.color, borderColor: meta.color, color: '#fff' } : { color: meta.color, borderColor: meta.color }}
                  onClick={() => update('expectedBehavior', b)}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="tt-field">
          <label>Contexto adicional</label>
          <textarea
            className="tt-textarea"
            placeholder="Ex: Itens de eletrônicos com marca reconhecida e nota fiscal usualmente seguem este padrão"
            rows={2}
            value={form.context}
            onChange={(e) => update('context', e.target.value)}
          />
        </div>

        <div className="tt-field">
          <label>Palavras-chave (separadas por vírgula)</label>
          <input
            type="text"
            className="tt-input"
            placeholder="notebook, eletrônicos, alta qualidade"
            value={form.keywordsRaw}
            onChange={(e) => update('keywordsRaw', e.target.value)}
          />
          <small>Termos com 3× boost no embedding vetorial</small>
        </div>

        {error && <div className="tt-error">{error}</div>}

        <div className="tt-form-actions">
          <button className="tt-btn tt-btn--primary tt-btn--lg" disabled={submitting} onClick={submit}>
            {submitting ? '⏳ Indexando...' : '🧠 Treinar Agente'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Feedback Panel ───────────────────────────────────────────────────────────

const FeedbackPanel: React.FC<{ feedback: TrainingFeedback[]; examples: TrainingExample[] }> = ({ feedback, examples }) => {
  const exMap = useMemo(() => new Map(examples.map((e) => [e.id, e])), [examples]);

  if (feedback.length === 0) {
    return (
      <div className="tt-empty-state">
        <div className="tt-empty-icon">💬</div>
        <p>Nenhum feedback registrado ainda.</p>
        <p className="tt-empty-hint">Use os botões 👍 / 👎 na biblioteca para reforçar ou penalizar padrões.</p>
      </div>
    );
  }

  return (
    <div className="tt-feedback">
      <h3 className="tt-section-title">Histórico de Reinforcement Signals</h3>
      <div className="tt-feedback-list">
        {feedback.map((fb) => {
          const ex = fb.exampleId ? exMap.get(fb.exampleId) : undefined;
          const time = new Date(fb.timestamp).toLocaleString('pt-BR');
          return (
            <div key={fb.id} className={`tt-fb-item tt-fb-item--${fb.rating}`}>
              <span className="tt-fb-rating">{fb.rating === 'positive' ? '👍' : '👎'}</span>
              <div className="tt-fb-content">
                <div className="tt-fb-title">
                  {ex
                    ? <>Reforço em <strong>{ex.idealQuestion.slice(0, 60)}{ex.idealQuestion.length > 60 ? '…' : ''}</strong></>
                    : fb.decisionRecordId
                      ? <>Feedback sobre decisão <code>{fb.decisionRecordId}</code></>
                      : 'Feedback geral'}
                </div>
                {fb.notes && <div className="tt-fb-notes">"{fb.notes}"</div>}
                <div className="tt-fb-time">{time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Playground Panel ─────────────────────────────────────────────────────────

const PlaygroundPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSuggestion(null);
    try {
      const [matchRes, sugRes] = await Promise.all([
        axios.get(`/api/training/match?q=${encodeURIComponent(query)}&topK=5`),
        axios.post('/api/training/suggest', { query }),
      ]);
      setResults(Array.isArray(matchRes.data) ? matchRes.data : []);
      setSuggestion(sugRes.data);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="tt-playground">
      <div className="tt-pg-header">
        <h3>🔬 Playground de Retrieval</h3>
        <p>Teste como o agente consulta a memória vetorial antes de responder. Digite um cenário e veja os exemplos mais próximos.</p>
      </div>

      <div className="tt-pg-input-row">
        <input
          className="tt-input tt-input--lg"
          placeholder="Ex: Smart TV LG 55 polegadas eletrônicos qualidade 90%"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
        />
        <button className="tt-btn tt-btn--primary" onClick={run} disabled={searching}>
          {searching ? '⏳' : '🚀 Consultar'}
        </button>
      </div>

      {suggestion && (
        <div className={`tt-pg-suggestion${suggestion.influencedByTraining ? ' tt-pg-suggestion--strong' : ''}`}>
          <div className="tt-pg-sug-header">
            <span>🤖 Adaptive Response Engine</span>
            {suggestion.influencedByTraining && <span className="tt-pg-strong-badge">MATCH FORTE</span>}
          </div>
          {suggestion.matched ? (
            <>
              <div className="tt-pg-sug-row">
                <span>Comportamento sugerido:</span>
                <strong style={{ color: BEHAVIOR_META[suggestion.suggestedBehavior as ExpectedBehavior]?.color }}>
                  {BEHAVIOR_META[suggestion.suggestedBehavior as ExpectedBehavior]?.icon} {BEHAVIOR_META[suggestion.suggestedBehavior as ExpectedBehavior]?.label}
                </strong>
              </div>
              <div className="tt-pg-sug-row">
                <span>Ajuste de confiança:</span>
                <strong style={{ color: suggestion.confidenceBoost >= 0 ? '#10b981' : '#ef4444' }}>
                  {suggestion.confidenceBoost > 0 ? '+' : ''}{suggestion.confidenceBoost} pts
                </strong>
              </div>
              <div className="tt-pg-sug-reasoning">"{suggestion.suggestedReasoning}"</div>
            </>
          ) : (
            <div className="tt-pg-sug-empty">Nenhum match acima do threshold. O agente decidirá apenas pelas regras.</div>
          )}
        </div>
      )}

      <h4 className="tt-section-title">Top {results.length} matches por similarity</h4>
      <div className="tt-pg-results">
        {results.length === 0 ? (
          <div className="tt-empty-hint">Sem resultados. Cadastre exemplos primeiro.</div>
        ) : results.map((m, i) => {
          const meta = BEHAVIOR_META[m.example.expectedBehavior];
          return (
            <div key={m.example.id} className="tt-pg-result">
              <div className="tt-pg-rank">#{i + 1}</div>
              <div className="tt-pg-result-main">
                <div className="tt-pg-result-q">
                  <span style={{ color: meta.color }}>{meta.icon}</span> {m.example.idealQuestion}
                </div>
                <div className="tt-pg-result-meta">
                  <span>similarity <strong>{(m.similarity * 100).toFixed(1)}%</strong></span>
                  <span>confidence <strong>{m.example.confidence}%</strong></span>
                  <span>rank score <strong>{m.rankScore.toFixed(3)}</strong></span>
                  {m.matchedKeywords.length > 0 && (
                    <span>kw: {m.matchedKeywords.map((k) => <code key={k}>{k}</code>)}</span>
                  )}
                </div>
                <div className="tt-pg-similarity-bar">
                  <div className="tt-pg-similarity-fill" style={{ width: `${m.similarity * 100}%`, background: meta.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Auto-Training Panel ──────────────────────────────────────────────────────

const AutoTrainPanel: React.FC<{ onActivity: () => void }> = ({ onActivity }) => {
  const [status, setStatus] = useState<AutoTrainStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [intervalSec, setIntervalSec] = useState(15);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/training/auto/status');
      setStatus(res.data);
    } catch (e) {
      console.error('auto status:', e);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 2500);
    return () => clearInterval(id);
  }, [load]);

  const toggleEnabled = async () => {
    if (!status) return;
    setBusy(true);
    try {
      const res = await axios.post('/api/training/auto/toggle', {
        enabled: !status.enabled,
        intervalMs: intervalSec * 1000,
      });
      setStatus(res.data);
      onActivity();
    } finally {
      setBusy(false);
    }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const res = await axios.post('/api/training/auto/run-now');
      setStatus(res.data);
      onActivity();
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <div className="tt-loading">
        <div className="tt-loading-orb" />
        <p>Conectando ao Auto-Training Engine...</p>
      </div>
    );
  }

  const eventIcon = (type: AutoTrainEvent['type']): string => ({
    CYCLE_START:        '🔁',
    CYCLE_END:          '✅',
    EXAMPLE_CREATED:    '✨',
    EXAMPLE_REINFORCED: '👍',
    EXAMPLE_PENALIZED:  '👎',
    SKIPPED:            '⏸',
  })[type] || '•';

  const eventColor = (type: AutoTrainEvent['type']): string => ({
    CYCLE_START:        '#3b82f6',
    CYCLE_END:          '#10b981',
    EXAMPLE_CREATED:    '#a855f7',
    EXAMPLE_REINFORCED: '#10b981',
    EXAMPLE_PENALIZED:  '#ef4444',
    SKIPPED:            '#6b7280',
  })[type] || '#6b7280';

  const lastTime = status.lastCycleAt ? new Date(status.lastCycleAt).toLocaleTimeString('pt-BR') : '—';
  const nextTime = status.nextCycleAt ? new Date(status.nextCycleAt).toLocaleTimeString('pt-BR') : '—';

  return (
    <div className="tt-auto-root">

      {/* HERO */}
      <div className={`tt-auto-hero${status.enabled ? ' tt-auto-hero--on' : ''}`}>
        <div className="tt-auto-hero-bg" />
        <div className="tt-auto-hero-content">
          <div className="tt-auto-hero-left">
            <div className="tt-auto-hero-title">
              <span className="tt-auto-hero-icon">🤖</span>
              <div>
                <h3>Self-Supervised Auto-Training</h3>
                <p>O agente analisa suas próprias decisões e extrai padrões automaticamente</p>
              </div>
            </div>
            <div className="tt-auto-status-line">
              <span className={`tt-auto-pill${status.enabled ? ' tt-auto-pill--on' : ''}`}>
                <span className="tt-auto-pill-dot" />
                {status.enabled ? 'ATIVO' : 'PAUSADO'}
              </span>
              {status.isRunningCycle && (
                <span className="tt-auto-pill tt-auto-pill--running">
                  <span className="tt-auto-spinner" />
                  PROCESSANDO CICLO
                </span>
              )}
              {status.enabled && !status.isRunningCycle && (
                <span className="tt-auto-pill tt-auto-pill--waiting">⏱ próximo: {nextTime}</span>
              )}
            </div>
          </div>

          <div className="tt-auto-hero-right">
            <div className="tt-auto-interval">
              <label>Intervalo (segundos)</label>
              <input
                type="range" min={3} max={60} step={1} value={intervalSec}
                onChange={(e) => setIntervalSec(parseInt(e.target.value, 10))}
              />
              <span>{intervalSec}s</span>
            </div>
            <div className="tt-auto-actions">
              <button
                className={`tt-btn tt-btn--lg ${status.enabled ? 'tt-btn--neg' : 'tt-btn--primary'}`}
                onClick={toggleEnabled} disabled={busy}
              >
                {status.enabled ? '⏸ Pausar' : '▶ Ativar Aprendizado'}
              </button>
              <button className="tt-btn" onClick={runNow} disabled={busy || status.isRunningCycle}>
                ⚡ Rodar Ciclo Agora
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="tt-auto-stats">
        <div className="tt-auto-stat">
          <div className="tt-auto-stat-value" style={{ color: '#3b82f6' }}>{status.totalCycles}</div>
          <div className="tt-auto-stat-label">Ciclos Executados</div>
        </div>
        <div className="tt-auto-stat">
          <div className="tt-auto-stat-value" style={{ color: '#a855f7' }}>{status.examplesCreated}</div>
          <div className="tt-auto-stat-label">✨ Exemplos Criados</div>
        </div>
        <div className="tt-auto-stat">
          <div className="tt-auto-stat-value" style={{ color: '#10b981' }}>{status.examplesReinforced}</div>
          <div className="tt-auto-stat-label">👍 Padrões Reforçados</div>
        </div>
        <div className="tt-auto-stat">
          <div className="tt-auto-stat-value" style={{ color: '#ef4444' }}>{status.examplesPenalized}</div>
          <div className="tt-auto-stat-label">👎 Padrões Penalizados</div>
        </div>
        <div className="tt-auto-stat">
          <div className="tt-auto-stat-value" style={{ color: '#f59e0b' }}>{lastTime}</div>
          <div className="tt-auto-stat-label">Último Ciclo</div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div className="tt-auto-pipeline">
        <h4>⚙️ Como o aprendizado autônomo funciona</h4>
        <div className="tt-auto-pipeline-grid">
          <div className="tt-auto-step">
            <div className="tt-auto-step-num">1</div>
            <strong>Mineração</strong>
            <p>Lê últimas 100 decisões persistidas do agente</p>
          </div>
          <div className="tt-auto-arrow">→</div>
          <div className="tt-auto-step">
            <div className="tt-auto-step-num">2</div>
            <strong>Clustering</strong>
            <p>Agrupa por (produto, status, faixa de qualidade)</p>
          </div>
          <div className="tt-auto-arrow">→</div>
          <div className="tt-auto-step">
            <div className="tt-auto-step-num">3</div>
            <strong>Inconsistência</strong>
            <p>Calcula divergência entre decisões do mesmo cluster</p>
          </div>
          <div className="tt-auto-arrow">→</div>
          <div className="tt-auto-step">
            <div className="tt-auto-step-num">4</div>
            <strong>Síntese</strong>
            <p>Cluster consistente vira exemplo; inconsistente é penalizado</p>
          </div>
        </div>
      </div>

      {/* EVENT LOG */}
      <div className="tt-auto-log">
        <div className="tt-auto-log-header">
          <h4>📜 Log de Aprendizado em Tempo Real</h4>
          <span className="tt-auto-log-count">{status.recentEvents.length} eventos</span>
        </div>
        {status.recentEvents.length === 0 ? (
          <div className="tt-empty-state">
            <div className="tt-empty-icon">🌱</div>
            <p>Ainda não há eventos.</p>
            <p className="tt-empty-hint">Ative o auto-training e processe alguns registros para o agente começar a aprender sozinho.</p>
          </div>
        ) : (
          <div className="tt-auto-log-list">
            {status.recentEvents.map((ev) => {
              const time = new Date(ev.timestamp).toLocaleTimeString('pt-BR');
              const color = eventColor(ev.type);
              return (
                <div key={ev.id} className="tt-auto-log-item" style={{ borderLeftColor: color }}>
                  <div className="tt-auto-log-icon" style={{ background: color }}>{eventIcon(ev.type)}</div>
                  <div className="tt-auto-log-main">
                    <div className="tt-auto-log-msg">{ev.message}</div>
                    {ev.cluster && (
                      <div className="tt-auto-log-meta">
                        <span>📦 {ev.cluster.samples} amostras</span>
                        <span>🎯 {ev.cluster.decision}</span>
                        <span>Q: {ev.cluster.avgQuality}%</span>
                        <span>C: {ev.cluster.avgConfidence}%</span>
                        {ev.cluster.representativeProduct && (
                          <span>"{ev.cluster.representativeProduct.slice(0, 30)}{ev.cluster.representativeProduct.length > 30 ? '…' : ''}"</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="tt-auto-log-time">{time}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainingTab;
