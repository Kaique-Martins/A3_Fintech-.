import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: { hasError: false, error: null }
        });
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return (_jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    padding: '40px',
                    textAlign: 'center',
                }, children: [_jsx("div", { style: { fontSize: '48px', marginBottom: '16px' }, children: "\u26A0\uFE0F" }), _jsx("h2", { style: { color: '#991b1b', marginBottom: '8px' }, children: "Algo deu errado" }), _jsx("p", { style: { color: '#6b7280', marginBottom: '24px' }, children: this.state.error?.message || 'Erro inesperado no componente.' }), _jsx("button", { onClick: () => this.setState({ hasError: false, error: null }), style: {
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            padding: '10px 24px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }, children: "Tentar novamente" })] }));
        }
        return this.props.children;
    }
}
