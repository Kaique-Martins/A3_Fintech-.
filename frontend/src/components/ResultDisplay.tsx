import React from 'react';
import { ValidationResult } from '../types/index';
import { CircularGauge } from './CircularGauge';
import '../styles/ResultDisplay.css';

interface ResultDisplayProps {
  result: ValidationResult | null;
  loading: boolean;
}

const Skeleton: React.FC<{ height?: number; width?: string; rounded?: boolean }> = ({
  height = 20,
  width = '100%',
  rounded = false,
}) => (
  <div
    className="skeleton-pulse"
    style={{
      height,
      width,
      borderRadius: rounded ? '50%' : '8px',
      background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
      backgroundSize: '200% 100%',
    }}
  />
);

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading }) => {
  if (loading) {
    return (
      <div className="result-container" style={{ gap: 24 }}>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: '8px 0' }}>
          <Skeleton height={110} width="110px" rounded />
          <Skeleton height={110} width="110px" rounded />
        </div>
        <Skeleton height={64} />
        <Skeleton height={100} />
        <Skeleton height={80} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!result) return null;

  const isQuarentine = result.status === 'QUARENTENA';

  const getSeverityIcon = (severity: string) => {
    const icons: Record<string, string> = {
      CRÍTICO: '🔴', ALTO: '🟠', MÉDIO: '🟡', BAIXO: '🟢', INFO: 'ℹ️',
    };
    return icons[severity] || '•';
  };

  return (
    <div className={`result-container ${isQuarentine ? 'quarantine' : 'approved'}`}>

      {/* ── Gauges ── */}
      <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
        <CircularGauge value={result.qualityScore} label="Qualidade dos Dados" />
        <CircularGauge value={result.confidenceLevel} label="Nível de Confiança" />
      </div>

      {/* ── Status Banner ── */}
      <div className={`status-badge ${isQuarentine ? 'quarentine' : 'approved'}`}>
        {isQuarentine
          ? '🚨 QUARENTENA — Dados requerem revisão manual'
          : '✅ APROVADO — Dados validados com sucesso'}
      </div>

      {/* ── Score rápido ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="score-chip" style={{ background: isQuarentine ? '#fff7ed' : '#f0fdf4', borderColor: isQuarentine ? '#fed7aa' : '#bbf7d0' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Alertas</span>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: result.alerts.length > 0 ? '#ef4444' : '#10b981' }}>
            {result.alerts.length}
          </span>
        </div>
        <div className="score-chip" style={{ background: '#f0f9ff', borderColor: '#bae6fd', flex: 1 }}>
          <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Versão do Motor</span>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0369a1' }}>v3.0 — Precisão Máxima</span>
        </div>
      </div>

      {/* ── Dados Corrigidos ── */}
      <div className="corrected-data">
        <h3>✏️ Dados Corrigidos</h3>
        <div className="data-grid">
          {[
            { label: 'Produto', value: result.dado_corrigido.produto },
            { label: 'Categoria', value: result.dado_corrigido.categoria },
            { label: 'Preço', value: `R$ ${result.dado_corrigido.preco.toFixed(2)}` },
            { label: 'Cidade', value: result.dado_corrigido.cidade },
          ].map(({ label, value }) => (
            <div className="data-item" key={label}>
              <label>{label}</label>
              <span>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Alterações realizadas ── */}
      {result.motivo && (
        <div className="motivo-section">
          <h3>📝 Alterações Realizadas</h3>
          <div className="motivo-text">
            {result.motivo.split(' | ').filter(Boolean).map((m, i) => (
              <div key={i} className="motivo-item">• {m}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alertas ── */}
      {result.alerts.length > 0 && (
        <div className="alerts-section">
          <h3>⚠️ Alertas Detectados ({result.alerts.length})</h3>
          <div className="alerts-list">
            {result.alerts.map((alert, i) => (
              <div key={i} className={`alert-item ${alert.severity.toLowerCase()}`}>
                <div className="alert-header">
                  <span className="alert-icon">{getSeverityIcon(alert.severity)}</span>
                  <span className="alert-severity">{alert.severity}</span>
                  <span className="alert-field">[{alert.field.toUpperCase()}]</span>
                </div>
                <div className="alert-message">{alert.message}</div>
                {alert.suggestion && (
                  <div className="alert-suggestion">💡 {alert.suggestion}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recomendações ── */}
      {result.recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>🎯 Recomendações</h3>
          <div className="recommendations-list">
            {result.recommendations.map((rec, i) => (
              <div key={i} className="recommendation-item">{rec}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── JSON bruto ── */}
      <details className="json-view">
        <summary>📋 Ver JSON Completo</summary>
        <div className="json-box">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      </details>
    </div>
  );
};
