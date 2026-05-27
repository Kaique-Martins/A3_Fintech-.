import axios from 'axios';
const API_URL = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
export const validationService = {
    async validate(record) {
        try {
            const response = await api.post('/validation/validate', record);
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            console.error('Validation failed:', axiosError.message || axiosError);
            throw error;
        }
    },
    async batchValidate(records) {
        try {
            const response = await api.post('/validation/batch-validate', records);
            return response.data;
        }
        catch (error) {
            const axiosError = error;
            console.error('Batch validation failed:', axiosError.message || error);
            throw error;
        }
    },
    async getInterface() {
        try {
            const response = await api.get('/validation/interface');
            return response.data.interface;
        }
        catch (error) {
            console.error('Failed to get validation interface:', error);
            throw error;
        }
    },
    async getInfo() {
        try {
            const response = await api.get('/validation/info');
            return response.data;
        }
        catch (error) {
            console.error('Failed to get validation info:', error);
            throw error;
        }
    },
    async getAgentReportCsv() {
        try {
            const response = await api.get('/agent/history/export/csv');
            return response.data;
        }
        catch (error) {
            console.error('Failed to export CSV report:', error);
            throw error;
        }
    },
};
