import React, { useState, useCallback } from 'react';
import { ValidationRecord } from '../types/validation';
import '../styles/ValidationForm.css';

interface ValidationFormProps {
  onSubmit: (record: ValidationRecord) => void;
  loading: boolean;
}

export const ValidationForm: React.FC<ValidationFormProps> = ({ onSubmit, loading }) => {
  const [form, setForm] = useState<ValidationRecord>({
    produto: '',
    categoria: '',
    preco: 0,
    cidade: '',
  });
  const [error, setError] = useState<string>('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setError(''); // Clear error when user starts typing
    setForm((prev) => ({
      ...prev,
      [name]: name === 'preco' ? parseFloat(value) || 0 : value,
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!form.produto || !form.cidade || form.preco <= 0) {
      setError('Por favor, preencha todos os campos obrigatórios (Produto, Cidade, Preço)');
      return;
    }
    setError('');
    onSubmit(form);
  }, [form, onSubmit]);

  const handleReset = useCallback(() => {
    setForm({
      produto: '',
      categoria: '',
      preco: 0,
      cidade: '',
    });
    setError('');
  }, []);

  return (
    <form className="validation-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="produto">Produto *</label>
        <input
          type="text"
          id="produto"
          name="produto"
          value={form.produto}
          onChange={handleChange}
          placeholder="Ex: Notebook Dell XPS"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="categoria">Categoria <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem' }}>(opcional — inferida automaticamente)</span></label>
        <select
          id="categoria"
          name="categoria"
          value={form.categoria}
          onChange={handleChange}
          disabled={loading}
          style={{
            padding: '14px 16px',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            fontSize: '1rem',
            fontFamily: 'inherit',
            background: 'white',
            color: form.categoria ? 'var(--text-dark)' : 'var(--text-light)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
            paddingRight: '44px',
          }}
        >
          <option value="">🔍 Inferir automaticamente</option>
          <option value="Eletrônicos">💻 Eletrônicos</option>
          <option value="Eletrodomésticos">🏠 Eletrodomésticos</option>
          <option value="Vestuário">👕 Vestuário</option>
          <option value="Alimentos">🍎 Alimentos</option>
          <option value="Serviços">🔧 Serviços</option>
          <option value="Outros">📦 Outros</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="preco">Preço (R$) *</label>
        <input
          type="number"
          id="preco"
          name="preco"
          value={form.preco}
          onChange={handleChange}
          placeholder="Ex: 3500.00"
          step="0.01"
          min="0"
          disabled={loading}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="cidade">Cidade *</label>
        <input
          type="text"
          id="cidade"
          name="cidade"
          value={form.cidade}
          onChange={handleChange}
          placeholder="Ex: São Paulo"
          disabled={loading}
          required
        />
      </div>

      {error && (
        <div className="form-error" style={{
          padding: '12px',
          marginBottom: '16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? '⏳ Processando...' : '🔍 Validar'}
        </button>
        <button type="button" onClick={handleReset} disabled={loading} className="btn-secondary">
          🔄 Limpar
        </button>
      </div>
    </form>
  );
};
