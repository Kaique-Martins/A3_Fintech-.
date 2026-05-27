import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface RuleWeightHistory {
  ruleId: string;
  ruleName: string;
  currentWeight: number;
  totalAdjustments: number;
}

interface EvolutionMetric {
  timestamp: string;
  totalDecisions: number;
  userAgreementRate: number;
  accuracyTrend: { period: string; accuracy: number }[];
  ruleWeightChanges: RuleWeightHistory[];
  behaviorChanges: { timestamp: string; description: string; impactScore: number }[];
  recentDecisions?: any[];
}

export const AgentEvolutionDashboard: React.FC = () => {
  const [evolutionData, setEvolutionData] = useState<EvolutionMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '1d' | '1w'>('1d');

  useEffect(() => {
    loadEvolutionData();
    const interval = setInterval(loadEvolutionData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadEvolutionData = async () => {
    try {
      const response = await axios.get('/api/agent/explainability/evolution');
      if (response.data.success && response.data.data.latestMetrics) {
        setEvolutionData(response.data.data.latestMetrics);
      }
    } catch (error) {
      console.error('Error loading evolution data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !evolutionData) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading evolution data...</div>;
  }

  const currentAccuracy = evolutionData.accuracyTrend.find((t) => t.period === selectedPeriod);
  const accuracyValue = currentAccuracy?.accuracy || 0;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h3 style={{ marginTop: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🧠 Agent Evolution Tracker
      </h3>

      {/* Key Metrics */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Total Decisions */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
            📊 Total Decisions
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            {evolutionData.totalDecisions}
          </p>
        </div>

        {/* User Agreement Rate */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
            👤 User Agreement
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
            {evolutionData.userAgreementRate}%
          </p>
        </div>

        {/* Accuracy Trend */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
            🎯 Accuracy ({selectedPeriod})
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
            {accuracyValue}%
          </p>
        </div>

        {/* Rule Adjustments */}
        <div
          style={{
            backgroundColor: '#fff',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
            ⚖️ Rule Adjustments
          </p>
          <p style={{ margin: '0', fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {evolutionData.ruleWeightChanges.reduce((sum, r) => sum + r.totalAdjustments, 0)}
          </p>
        </div>
      </div>

      {/* Accuracy Trend Selector */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#6b7280' }}>
          Select Period:
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['1h', '1d', '1w'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              style={{
                padding: '6px 12px',
                backgroundColor: selectedPeriod === period ? '#3b82f6' : '#e5e7eb',
                color: selectedPeriod === period ? '#fff' : '#374151',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Rule Weight Changes */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>⚖️ Rule Weight Evolution</h4>
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}
        >
          {evolutionData.ruleWeightChanges.length > 0 ? (
            evolutionData.ruleWeightChanges.map((rule) => (
              <div
                key={rule.ruleId}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#1f2937' }}>
                    {rule.ruleName}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#6b7280' }}>
                    {rule.totalAdjustments} adjustments
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#3b82f6' }}>
                    {rule.currentWeight.toFixed(2)}x
                  </p>
                  <div
                    style={{
                      width: '100px',
                      height: '4px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '2px',
                      marginTop: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: rule.currentWeight > 1 ? '#10b981' : '#ef4444',
                        width: `${Math.min(100, (rule.currentWeight / 2) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p style={{ padding: '12px', color: '#6b7280', textAlign: 'center' }}>
              No rule adjustments yet
            </p>
          )}
        </div>
      </div>

      {/* Behavior Changes */}
      {evolutionData.behaviorChanges.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 12px 0' }}>🔄 Detected Behavior Changes</h4>
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            {evolutionData.behaviorChanges.map((change, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  borderBottom: idx < evolutionData.behaviorChanges.length - 1 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#1f2937' }}>
                  {change.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <p style={{ margin: '0', fontSize: '11px', color: '#6b7280' }}>
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </p>
                  <div
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#fef3c7',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#92400e',
                    }}
                  >
                    Impact: {change.impactScore}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Decisions Drilldown */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 12px 0' }}>🧾 Recent Decisions</h4>
        <div style={{ backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>Record</th>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>Decision</th>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>Confidence</th>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>RequestID</th>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>RuleVersion</th>
                <th style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {(evolutionData.recentDecisions || []).map((d: any) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px' }}>{d.recordId}</td>
                  <td style={{ padding: '8px' }}>{d.decision}</td>
                  <td style={{ padding: '8px' }}>{d.confidence}</td>
                  <td style={{ padding: '8px' }}>{d.requestId || '-'}</td>
                  <td style={{ padding: '8px' }}>{d.ruleVersion || '-'}</td>
                  <td style={{ padding: '8px' }}>{new Date(d.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgentEvolutionDashboard;
