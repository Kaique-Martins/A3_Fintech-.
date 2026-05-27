import React from 'react';
import { ValidationForm } from './ValidationForm';
import { ResultDisplay } from './ResultDisplay';
import { ValidationRecord, ValidationResult } from '../types/index';
import '../styles/Validator.css';

interface ValidatorProps {
  onValidate: (record: ValidationRecord) => Promise<void>;
  result: ValidationResult | null;
  loading: boolean;
}

export const Validator: React.FC<ValidatorProps> = ({ onValidate, result, loading }) => {
  return (
    <div className="validator">
      <div className="validator-header">
        <h1>✅ Validador de Dados</h1>
        <p>Valide registros de produtos para análise de risco de crédito</p>
      </div>

      <div className="validator-container">
        <div className="validator-form-section">
          <h2>📋 Preencha os Dados</h2>
          <ValidationForm onSubmit={onValidate} loading={loading} />
        </div>

        <div className="validator-result-section">
          <h2>📊 Resultado da Validação</h2>
          {result ? (
            <ResultDisplay result={result} loading={loading} />
          ) : (
            <div className="validator-placeholder">
              <div className="placeholder-icon">🔍</div>
              <p>Preencha o formulário e clique em &quot;Validar&quot;</p>
              <p className="placeholder-subtitle">O resultado aparecerá aqui em tempo real</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
