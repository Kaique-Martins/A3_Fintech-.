import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { validationService } from '../services/validationService';
import '../styles/FileUpload.css';
export const FileUpload = ({ onUploadComplete }) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const parseCSV = (text) => {
        const lines = text.trim().split('\n');
        if (lines.length < 2)
            throw new Error('CSV deve ter pelo menos uma linha de header e uma linha de dados');
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const recordsMap = {};
        ['produto', 'categoria', 'preco', 'cidade'].forEach((field) => {
            const idx = headers.findIndex(h => h.includes(field) || h === field);
            if (idx !== -1)
                recordsMap[field] = idx;
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
    const parseJSON = (text) => {
        const data = JSON.parse(text);
        if (!Array.isArray(data))
            throw new Error('JSON deve ser um array de objetos');
        return data.map(item => ({
            produto: item.produto || '',
            categoria: item.categoria || '',
            preco: parseFloat(item.preco) || 0,
            cidade: item.cidade || '',
        }));
    };
    const handleFile = async (selectedFile) => {
        setError(null);
        setFile(selectedFile);
        setLoading(true);
        try {
            const text = await selectedFile.text();
            let records = [];
            if (selectedFile.name.endsWith('.csv')) {
                records = parseCSV(text);
            }
            else if (selectedFile.name.endsWith('.json')) {
                records = parseJSON(text);
            }
            else {
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
            setResult(null);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleFile(files[0]);
        }
    };
    const downloadResults = () => {
        if (!result)
            return;
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
    return (_jsxs("div", { className: "file-upload", children: [_jsxs("div", { className: "upload-header", children: [_jsx("h2", { children: "\uD83D\uDCC1 Importar Arquivo" }), _jsx("p", { children: "Fa\u00E7a upload de CSV ou JSON com m\u00FAltiplos registros para valida\u00E7\u00E3o em lote" })] }), _jsx("div", { className: `upload-zone ${dragActive ? 'active' : ''}`, onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, children: !loading && !result ? (_jsx(_Fragment, { children: _jsxs("label", { htmlFor: "file-input", className: "upload-label", children: [_jsx("div", { className: "upload-icon", children: "\uD83D\uDCE4" }), _jsx("p", { children: "Arraste arquivos aqui ou clique para selecionar" }), _jsx("p", { className: "upload-formats", children: ".CSV ou .JSON" }), _jsx("input", { id: "file-input", type: "file", accept: ".csv,.json", onChange: (e) => e.target.files && handleFile(e.target.files[0]), style: { display: 'none' } })] }) })) : loading ? (_jsxs("div", { className: "upload-loading", children: [_jsx("div", { className: "spinner" }), _jsxs("p", { children: ["Processando ", file?.name, "..."] })] })) : null }), error && _jsx("div", { className: "error-message", children: error }), result && (_jsxs("div", { className: "results-container", children: [_jsxs("div", { className: "results-summary", children: [_jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-label", children: "Total de Registros" }), _jsx("div", { className: "stat-value", children: result.totalRecords })] }), _jsxs("div", { className: "stat-card success", children: [_jsx("div", { className: "stat-label", children: "Aprovados" }), _jsx("div", { className: "stat-value", children: result.results.filter(r => r.result?.status === 'APROVADO').length })] }), _jsxs("div", { className: "stat-card warning", children: [_jsx("div", { className: "stat-label", children: "Quarentena" }), _jsx("div", { className: "stat-value", children: result.results.filter(r => r.result?.status === 'QUARENTENA').length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("div", { className: "stat-label", children: "Tempo" }), _jsxs("div", { className: "stat-value", children: [result.processingTime, "ms"] })] })] }), _jsx("div", { className: "results-table", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Linha" }), _jsx("th", { children: "Produto" }), _jsx("th", { children: "Categoria" }), _jsx("th", { children: "Pre\u00E7o" }), _jsx("th", { children: "Cidade" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Detalhes" })] }) }), _jsx("tbody", { children: result.results.map((item, idx) => (_jsxs("tr", { className: item.result?.status === 'QUARENTENA' ? 'quarantine' : '', children: [_jsx("td", { children: item.rowIndex }), _jsx("td", { children: item.record.produto }), _jsx("td", { children: item.result?.dado_corrigido.categoria || 'N/A' }), _jsxs("td", { children: ["R$ ", item.result?.dado_corrigido.preco.toFixed(2) || 'N/A'] }), _jsx("td", { children: item.result?.dado_corrigido.cidade || 'N/A' }), _jsx("td", { children: _jsx("span", { className: `status-badge ${item.result?.status.toLowerCase() || 'error'}`, children: item.result?.status || 'ERRO' }) }), _jsxs("td", { title: item.result?.motivo || item.error || '', className: "details-cell", children: [(item.result?.motivo || item.error || '').substring(0, 50), "..."] })] }, idx))) })] }) }), _jsxs("div", { className: "results-actions", children: [_jsx("button", { onClick: downloadResults, className: "btn-download", children: "\uD83D\uDCE5 Baixar Resultados (CSV)" }), _jsx("button", { onClick: () => {
                                    setResult(null);
                                    setFile(null);
                                }, className: "btn-new", children: "\u2795 Novo Arquivo" })] })] }))] }));
};
