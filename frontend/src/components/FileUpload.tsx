import React, { useState } from 'react';
import { ValidationRecord } from '../types/index';
import { validationService, BatchValidationResponse } from '../services/validationService';
import '../styles/FileUpload.css';

export const FileUpload: React.FC<{ onUploadComplete?: () => void }> = ({ onUploadComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BatchValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const parseCSV = (text: string): ValidationRecord[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV deve ter pelo menos uma linha de header e uma linha de dados');

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const recordsMap: { [key: string]: number } = {};
    
    ['produto', 'categoria', 'preco', 'cidade'].forEach((field) => {
      const idx = headers.findIndex(h => h.includes(field) || h === field);
      if (idx !== -1) recordsMap[field] = idx;
    });

    return lines.slice(1)
      .filter(line => line.trim())
      .map((line) => {
        const values = line.split(',').map(v => v.trim());
        return {
          produto: values[recordsMap['produto'] || 0] || '',
          categoria: values[recordsMap['categoria'] || 1] || '',
          preco: parseFloat(values[recordsMap['preco'] || 2]) || 0,
          cidade: values[recordsMap['cidade'] || 3] || '',
        };
      });
  };

  const parseJSON = (text: string): ValidationRecord[] => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('JSON deve ser um array de objetos');
    return data.map(item => ({
      produto: item.produto || '',
      categoria: item.categoria || '',
      preco: parseFloat(item.preco) || 0,
      cidade: item.cidade || '',
    }));
  };

  const handleFile = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setLoading(true);

    try {
      const text = await selectedFile.text();
      let records: ValidationRecord[] = [];

      if (selectedFile.name.endsWith('.csv')) {
        records = parseCSV(text);
      } else if (selectedFile.name.endsWith('.json')) {
        records = parseJSON(text);
      } else {
        throw new Error('Formato de arquivo não suportado. Use CSV ou JSON.');
      }

      if (records.length === 0) {
        throw new Error('Nenhum registro encontrado no arquivo');
      }

      const batchResult = await validationService.batchValidate(records);
      setResult(batchResult);
      
      // Notify parent component that upload completed successfully
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const downloadResults = () => {
    if (!result) return;

    const csv = [
      'Linha,Produto,Categoria,Preço,Cidade,Status,Motivo',
      ...result.results.map(r => {
        const record = r.record;
        const status = r.result?.status || 'ERRO';
        const motivo = r.result?.motivo || r.error || '';
        return `${r.rowIndex},"${record.produto}","${record.categoria}",${record.preco},"${record.cidade}",${status},"${motivo.replace(/"/g, '""')}"`;
      }),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validation-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="file-upload">
      <div className="upload-header">
        <h2>📁 Importar Arquivo</h2>
        <p>Faça upload de CSV ou JSON com múltiplos registros para validação em lote</p>
      </div>

      <div
        className={`upload-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {!loading && !result ? (
          <>
            <label htmlFor="file-input" className="upload-label">
              <div className="upload-icon">📤</div>
              <p>Arraste arquivos aqui ou clique para selecionar</p>
              <p className="upload-formats">.CSV ou .JSON</p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.json"
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </label>
          </>
        ) : loading ? (
          <div className="upload-loading">
            <div className="spinner"></div>
            <p>Processando {file?.name}...</p>
          </div>
        ) : null}
      </div>

      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="results-container">
          <div className="results-summary">
            <div className="stat-card">
              <div className="stat-label">Total de Registros</div>
              <div className="stat-value">{result.totalRecords}</div>
            </div>
            <div className="stat-card success">
              <div className="stat-label">Aprovados</div>
              <div className="stat-value">
                {result.results.filter(r => r.result?.status === 'APROVADO').length}
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-label">Quarentena</div>
              <div className="stat-value">
                {result.results.filter(r => r.result?.status === 'QUARENTENA').length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Tempo</div>
              <div className="stat-value">{result.processingTime}ms</div>
            </div>
          </div>

          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Preço</th>
                  <th>Cidade</th>
                  <th>Status</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((item, idx) => (
                  <tr key={idx} className={item.result?.status === 'QUARENTENA' ? 'quarantine' : ''}>
                    <td>{item.rowIndex}</td>
                    <td>{item.record.produto}</td>
                    <td>{item.result?.dado_corrigido.categoria || 'N/A'}</td>
                    <td>R$ {item.result?.dado_corrigido.preco.toFixed(2) || 'N/A'}</td>
                    <td>{item.result?.dado_corrigido.cidade || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${item.result?.status.toLowerCase() || 'error'}`}>
                        {item.result?.status || 'ERRO'}
                      </span>
                    </td>
                    <td title={item.result?.motivo || item.error || ''} className="details-cell">
                      {(item.result?.motivo || item.error || '').substring(0, 50)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="results-actions">
            <button onClick={downloadResults} className="btn-download">
              📥 Baixar Resultados (CSV)
            </button>
            <button
              onClick={() => {
                setResult(null);
                setFile(null);
              }}
              className="btn-new"
            >
              ➕ Novo Arquivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
