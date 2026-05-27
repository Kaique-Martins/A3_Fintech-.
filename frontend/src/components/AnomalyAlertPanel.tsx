import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface AnomalyIndicator {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  metrics: {
    expected: number;
    actual: number;
    deviation: number;
  };
  detectedAt: string;
  suggestedAction: string;
}

export const AnomalyAlertPanel: React.FC = () => {
  const [anomalies, setAnomalies] = useState<AnomalyIndicator[]>([]);
  const [correctedRecords, setCorrectedRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

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
    } catch (error) {
      console.error('Error loading anomalies:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnomalies = anomalies.filter(
    (a) => filter === 'ALL' || a.severity === filter,
  );

  const getSeverityColor = (severity: string) => {
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

  const getSeverityIcon = (severity: string) => {
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
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading anomaly data...</div>;
  }

  const highCount = anomalies.filter((a) => a.severity === 'HIGH').length;
  const mediumCount = anomalies.filter((a) => a.severity === 'MEDIUM').length;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚨 Anomaly Detection
        </h3>
        {highCount > 0 && (
          <div
            style={{
              backgroundColor: '#dc2626',
              color: '#fff',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {highCount} High Severity
          </div>
        )}
      </div>

      {/* Filter Buttons */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => (
          <button
            key={severity}
            onClick={() => setFilter(severity)}
            style={{
              padding: '6px 12px',
              backgroundColor: filter === severity ? '#3b82f6' : '#e5e7eb',
              color: filter === severity ? '#fff' : '#374151',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {severity}
          </button>
        ))}
      </div>

      {/* Anomalies List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredAnomalies.length > 0 ? (
          filteredAnomalies.map((anomaly, idx) => {
            const colors = getSeverityColor(anomaly.severity);
            return (
              <div
                key={idx}
                style={{
                  backgroundColor: '#fff',
                  border: `2px solid ${colors.border}`,
                  borderRadius: '6px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '8px', flex: 1 }}>
                    <span style={{ fontSize: '20px', marginTop: '2px' }}>
                      {getSeverityIcon(anomaly.severity)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <h5 style={{ margin: '0 0 4px 0', color: colors.text }}>
                        {anomaly.type.replace(/_/g, ' ')}
                      </h5>
                      <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#374151' }}>
                        {anomaly.description}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: colors.bg,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: colors.text,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {anomaly.severity}
                  </div>
                </div>

                {/* Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    marginBottom: '8px',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '11px' }}>Expected</p>
                    <p style={{ margin: '0', fontWeight: 'bold', color: '#1f2937' }}>
                      {anomaly.metrics.expected.toFixed(1)}%
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '11px' }}>Actual</p>
                    <p style={{ margin: '0', fontWeight: 'bold', color: '#1f2937' }}>
                      {anomaly.metrics.actual.toFixed(1)}%
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#f3f4f6', padding: '6px', borderRadius: '4px' }}>
                    <p style={{ margin: '0', color: '#6b7280', fontSize: '11px' }}>Deviation</p>
                    <p style={{ margin: '0', fontWeight: 'bold', color: colors.text }}>
                      {anomaly.metrics.deviation > 0 ? '+' : ''}{anomaly.metrics.deviation.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Suggested Action */}
                <div
                  style={{
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #0284c7',
                    borderRadius: '4px',
                    padding: '8px',
                  }}
                >
                  <p style={{ margin: '0', fontSize: '12px', color: '#0c4a6e', fontWeight: 'bold' }}>
                    💡 Suggested Action:
                  </p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#0c4a6e' }}>
                    {anomaly.suggestedAction}
                  </p>
                </div>

                {/* Timestamp */}
                <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
                  Detected at {new Date(anomaly.detectedAt).toLocaleTimeString()}
                </p>
              </div>
            );
          })
        ) : (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#ecfdf5',
              borderRadius: '6px',
              border: '1px solid #86efac',
            }}
          >
            <p style={{ margin: '0', color: '#166534', fontWeight: 'bold' }}>
              ✅ Agent behaving normally - no anomalies detected
            </p>
          </div>
        )}
      </div>

      {/* Corrected Records */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ marginBottom: '8px' }}>✏️ Registros Corrigidos (últimos)</h4>
        {correctedRecords.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Record ID</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Produto</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Categoria</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Preço</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Cidade</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Motivo</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {correctedRecords.map((r, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '6px' }}>{r.recordId}</td>
                    <td style={{ padding: '6px' }}>{r.correctedData?.produto || '-'}</td>
                    <td style={{ padding: '6px' }}>{r.correctedData?.categoria || '-'}</td>
                    <td style={{ padding: '6px' }}>{r.correctedData?.preco ?? '-'}</td>
                    <td style={{ padding: '6px' }}>{r.correctedData?.cidade || '-'}</td>
                    <td style={{ padding: '6px' }}>{r.motivo || ''}</td>
                    <td style={{ padding: '6px' }}>{new Date(r.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#6b7280' }}>Nenhum registro corrigido recentemente.</div>
        )}
      </div>

      {/* Summary Stats */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          fontSize: '12px',
          color: '#6b7280',
        }}
      >
        <p style={{ margin: '0' }}>
          📊 Total anomalies detected: {anomalies.length} | High: {highCount} | Medium: {mediumCount}
        </p>
      </div>
    </div>
  );
};

export default AnomalyAlertPanel;
