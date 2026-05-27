import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ValidationForm } from './ValidationForm';
import { ResultDisplay } from './ResultDisplay';
import '../styles/Validator.css';
export const Validator = ({ onValidate, result, loading }) => {
    return (_jsxs("div", { className: "validator", children: [_jsxs("div", { className: "validator-header", children: [_jsx("h1", { children: "\u2705 Validador de Dados" }), _jsx("p", { children: "Valide registros de produtos para an\u00E1lise de risco de cr\u00E9dito" })] }), _jsxs("div", { className: "validator-container", children: [_jsxs("div", { className: "validator-form-section", children: [_jsx("h2", { children: "\uD83D\uDCCB Preencha os Dados" }), _jsx(ValidationForm, { onSubmit: onValidate, loading: loading })] }), _jsxs("div", { className: "validator-result-section", children: [_jsx("h2", { children: "\uD83D\uDCCA Resultado da Valida\u00E7\u00E3o" }), result ? (_jsx(ResultDisplay, { result: result, loading: loading })) : (_jsxs("div", { className: "validator-placeholder", children: [_jsx("div", { className: "placeholder-icon", children: "\uD83D\uDD0D" }), _jsx("p", { children: "Preencha o formul\u00E1rio e clique em \"Validar\"" }), _jsx("p", { className: "placeholder-subtitle", children: "O resultado aparecer\u00E1 aqui em tempo real" })] }))] })] })] }));
};
