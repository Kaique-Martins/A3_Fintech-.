import { useState, useCallback } from 'react';
const STORAGE_KEY = 'fintech_validation_history';
export const useValidationHistory = () => {
    const [history, setHistory] = useState(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    });
    const addValidation = useCallback((input, result) => {
        const newValidation = {
            ...result,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            input,
        };
        const updated = [newValidation, ...history];
        setHistory(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return newValidation;
    }, [history]);
    const getStats = useCallback(() => {
        const total = history.length;
        const approved = history.filter((v) => v.status === 'APROVADO').length;
        const quarantine = history.filter((v) => v.status === 'QUARENTENA').length;
        const approvalRate = total === 0 ? 0 : (approved / total) * 100;
        return {
            totalValidations: total,
            approved,
            quarantine,
            approvalRate,
        };
    }, [history]);
    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);
    return {
        history,
        addValidation,
        getStats,
        clearHistory,
    };
};
