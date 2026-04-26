const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload.data;
}

export const atlasApi = {
  registerUser: (body) => request('/users/register', { method: 'POST', body: JSON.stringify(body) }),
  loginUser: (body) => request('/users/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: (token) => request('/users/me', { headers: { Authorization: `Bearer ${token}` } }),
  listComponents: (query = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request(`/components${suffix}`);
  },
  getComponent: (id) => request(`/components/${id}`),
  getBuild: (id, token) => request(`/builds/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  getRecommendations: (body, token) => request('/recommendations', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: `Bearer ${token}` } }),
  getRecommendationsOptionalAuth: (body, token) =>
    request('/recommendations', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }),
};
