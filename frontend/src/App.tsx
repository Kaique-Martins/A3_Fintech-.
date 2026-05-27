import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IntegratedDashboard } from './components/IntegratedDashboard';
import { Validator } from './components/Validator';
import { History } from './components/History';
import { FileUpload } from './components/FileUpload';
import { AgentControl } from './components/AgentControl';
import { api, validationService } from './services/validationService';
import { ValidationRecord, ValidationResult, AgentHistoryEntry } from './types/index';
import './styles/index.css';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'validator' | 'history' | 'import' | 'agent'>('dashboard');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AgentHistoryEntry[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const response = await api.get('/agent/history/persisted?limit=200');
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  useEffect(() => {
    if (currentPage === 'history') {
      loadHistory();
      const interval = setInterval(loadHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [currentPage]);

  const handleValidate = async (record: ValidationRecord) => {
    setLoading(true);
    setApiError(null);
    try {
      const validationResult = await validationService.validate(record);
      setResult(validationResult);
      if (currentPage === 'history') {
        await loadHistory();
      }
    } catch (error) {
      console.error('Validation error:', error);
      setApiError('Erro ao validar o registro. Verifique se a API está disponível.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />

      {apiError && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #f87171',
          color: '#991b1b',
          padding: '12px 20px',
          margin: '0 20px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠️ {apiError}</span>
          <button
            onClick={() => setApiError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#991b1b' }}
          >
            ×
          </button>
        </div>
      )}

      <main className="main-content">
        {currentPage === 'dashboard' && <IntegratedDashboard onNavigate={setCurrentPage} />}
        {currentPage === 'validator' && (
          <Validator onValidate={handleValidate} result={result} loading={loading} />
        )}
        {currentPage === 'import' && <FileUpload onUploadComplete={loadHistory} />}
        {currentPage === 'history' && (
          <History validations={history} onRefresh={loadHistory} />
        )}
        {currentPage === 'agent' && <AgentControl />}
      </main>
    </div>
  );
}

export default App;
