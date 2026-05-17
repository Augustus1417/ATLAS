import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_PATHS = ['/users/login', '/users/register'];

function isAuthRequest(url = '') {
  return AUTH_PATHS.some((path) => url.includes(path));
}

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors (do not redirect on failed login/register)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !isAuthRequest(requestUrl)) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/** Normalize API / network errors for auth forms. */
export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  if (!error.response) {
    return `Cannot reach the server at ${API_BASE_URL}. Is the backend running?`;
  }
  const { data, status } = error.response;
  if (data?.message) return data.message;
  if (status === 422 && Array.isArray(data?.data)) {
    return data.data.map((e) => e.msg || e.message).filter(Boolean).join('. ') || fallback;
  }
  return fallback;
}

export const authAPI = {
  register: (data) => api.post('/users/register', data),
  login: (data) => api.post('/users/login', data),
  getMe: () => api.get('/users/me'),
};

export const componentsAPI = {
  getAll: (params) => api.get('/components', { params }),
  getById: (id) => api.get(`/components/${id}`),
  create: (data) => api.post('/components', data),
  update: (id, data) => api.put(`/components/${id}`, data),
  delete: (id) => api.delete(`/components/${id}`),
  getSpecs: (id) => api.get(`/components/${id}/specs`),
  addSpecs: (id, data) => api.post(`/components/${id}/specs`, data),
  getPricing: (id) => api.get(`/components/${id}/pricing`),
  addPricing: (id, data) => api.post(`/components/${id}/pricing`, data),
};

export const builderAPI = {
  getPartsByCategory: (category) =>
    api.get('/builder/parts-by-category', { params: { category } }),
  getPartsFlat: (category) =>
    api.get('/builder/parts-flat', { params: { category } }),
};

export const buildsAPI = {
  create: (data) => api.post('/builds', data),
  getById: (id) => api.get(`/builds/${id}`),
  getAll: (params) => api.get('/builds', { params }),
  update: (id, data) => api.put(`/builds/${id}`, data),
  delete: (id) => api.delete(`/builds/${id}`),
};

export const compatibilityAPI = {
  check: (componentIds) =>
    api.post('/compatibility/check', { component_ids: componentIds }),
};

export const recommendationsAPI = {
  generate: (data) => api.post('/recommendations', data),
};

export const chatAPI = {
  send: (data) => api.post('/chat', data),
};

export default api;
