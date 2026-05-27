import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IntegratedDashboard } from './components/IntegratedDashboard';
import { Validator } from './components/Validator';
import { History } from './components/History';
import { FileUpload } from './components/FileUpload';
import { AgentControl } from './components/AgentControl';
import { api, validationService } from './services/validationService';
import './styles/index.css';
function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [apiError, setApiError] = useState(null);
    const loadHistory = async () => {
        try {
            const response = await api.get('/agent/history/persisted?limit=200');
            setHistory(response.data || []);
        }
        catch (error) {
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
    const handleValidate = async (record) => {
        setLoading(true);
        setApiError(null);
        try {
            const validationResult = await validationService.validate(record);
            setResult(validationResult);
            if (currentPage === 'history') {
                await loadHistory();
            }
        }
        catch (error) {
            console.error('Validation error:', error);
            setApiError('Erro ao validar o registro. Verifique se a API está disponível.');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "app", children: [_jsx(Navbar, { currentPage: currentPage, onNavigate: setCurrentPage }), apiError && (_jsxs("div", { style: {
                    background: '#fee2e2',
                    border: '1px solid #f87171',
                    color: '#991b1b',
                    padding: '12px 20px',
                    margin: '0 20px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }, children: [_jsxs("span", { children: ["\u26A0\uFE0F ", apiError] }), _jsx("button", { onClick: () => setApiError(null), style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#991b1b' }, children: "\u00D7" })] })), _jsxs("main", { className: "main-content", children: [currentPage === 'dashboard' && _jsx(IntegratedDashboard, { onNavigate: setCurrentPage }), currentPage === 'validator' && (_jsx(Validator, { onValidate: handleValidate, result: result, loading: loading })), currentPage === 'import' && _jsx(FileUpload, { onUploadComplete: loadHistory }), currentPage === 'history' && (_jsx(History, { validations: history, onRefresh: loadHistory })), currentPage === 'agent' && _jsx(AgentControl, {})] })] }));
}
export default App;
