import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import '../styles/ValidationForm.css';
export const ValidationForm = ({ onSubmit, loading }) => {
    const [form, setForm] = useState({
        produto: '',
        categoria: '',
        preco: 0,
        cidade: '',
    });
    const [error, setError] = useState('');
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setError(''); // Clear error when user starts typing
        setForm((prev) => ({
            ...prev,
            [name]: name === 'preco' ? parseFloat(value) || 0 : value,
        }));
    }, []);
    const handleSubmit = useCallback((e) => {
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
    return (_jsxs("form", { className: "validation-form", onSubmit: handleSubmit, children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "produto", children: "Produto *" }), _jsx("input", { type: "text", id: "produto", name: "produto", value: form.produto, onChange: handleChange, placeholder: "Ex: Notebook Dell XPS", disabled: loading, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsxs("label", { htmlFor: "categoria", children: ["Categoria ", _jsx("span", { style: { fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem' }, children: "(opcional \u2014 inferida automaticamente)" })] }), _jsxs("select", { id: "categoria", name: "categoria", value: form.categoria, onChange: handleChange, disabled: loading, style: {
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
                        }, children: [_jsx("option", { value: "", children: "\uD83D\uDD0D Inferir automaticamente" }), _jsx("option", { value: "Eletr\u00F4nicos", children: "\uD83D\uDCBB Eletr\u00F4nicos" }), _jsx("option", { value: "Eletrodom\u00E9sticos", children: "\uD83C\uDFE0 Eletrodom\u00E9sticos" }), _jsx("option", { value: "Vestu\u00E1rio", children: "\uD83D\uDC55 Vestu\u00E1rio" }), _jsx("option", { value: "Alimentos", children: "\uD83C\uDF4E Alimentos" }), _jsx("option", { value: "Servi\u00E7os", children: "\uD83D\uDD27 Servi\u00E7os" }), _jsx("option", { value: "Outros", children: "\uD83D\uDCE6 Outros" })] })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "preco", children: "Pre\u00E7o (R$) *" }), _jsx("input", { type: "number", id: "preco", name: "preco", value: form.preco, onChange: handleChange, placeholder: "Ex: 3500.00", step: "0.01", min: "0", disabled: loading, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "cidade", children: "Cidade *" }), _jsx("input", { type: "text", id: "cidade", name: "cidade", value: form.cidade, onChange: handleChange, placeholder: "Ex: S\u00E3o Paulo", disabled: loading, required: true })] }), error && (_jsxs("div", { className: "form-error", style: {
                    padding: '12px',
                    marginBottom: '16px',
                    backgroundColor: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '4px',
                    color: '#c33',
                    fontSize: '14px'
                }, children: ["\u26A0\uFE0F ", error] })), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "submit", disabled: loading, className: "btn-primary", children: loading ? '⏳ Processando...' : '🔍 Validar' }), _jsx("button", { type: "button", onClick: handleReset, disabled: loading, className: "btn-secondary", children: "\uD83D\uDD04 Limpar" })] })] }));
};
