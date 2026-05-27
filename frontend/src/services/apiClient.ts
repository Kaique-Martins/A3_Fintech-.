import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

axios.defaults.baseURL = API_URL;

export default axios;
