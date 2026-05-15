const API_BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    console.error('Network error when calling ATLAS backend:', error);
    throw new Error(`Unable to reach the ATLAS backend at ${API_BASE}. Check that the API server is running and CORS is enabled. (${error.message})`);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || payload?.detail || 'Request failed';
    throw new Error(message);
  }

  return payload.data;
}

export const atlasApi = {
  registerUser: (body) => request('/users/register', { method: 'POST', body: JSON.stringify(body) }),
  loginUser: async (body) => {
    const data = await request('/users/login', { method: 'POST', body: JSON.stringify(body) });
    // normalize to { access_token, user }
    return {
      access_token: data?.token?.access_token || data?.access_token,
      user: data?.user || null,
    };
  },
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
