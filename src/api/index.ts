import axios from 'axios';

const PRODUCTION_API_URL = 'https://painel-monet-uei6.vercel.app';

export function resolveApiBaseUrl(): string {
  const envUrl = (process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '');
  const isLocalHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (!isLocalHost) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return PRODUCTION_API_URL;
    }
    return envUrl;
  }

  return envUrl || 'http://127.0.0.1:3000';
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
