const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5122/api';

export function getToken() {
  return localStorage.getItem('aitu_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('aitu_token', token);
  } else {
    localStorage.removeItem('aitu_token');
  }
}

export function getStoredUserData() {
  const userStr = localStorage.getItem('aitu_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

export function setStoredUserData(user) {
  if (user) {
    localStorage.setItem('aitu_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('aitu_user');
  }
}

export function clearAuth() {
  localStorage.removeItem('aitu_token');
  localStorage.removeItem('aitu_user');
}

async function apiFetch(method, path, body = null, params = null) {
  const url = new URL(`${BASE_URL}${path.startsWith('/') ? path : '/' + path}`);
  
  if (params) {
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });
  }

  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), options);
    
    if (response.status === 401) {
      clearAuth();
      // Optional: trigger window reload or custom event if needed
    }

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = typeof data === 'object' && data?.message ? data.message : 'API request failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${method} ${path}]:`, error);
    throw error;
  }
}

export const api = {
  get: (path, params) => apiFetch('GET', path, null, params),
  post: (path, body) => apiFetch('POST', path, body),
  put: (path, body) => apiFetch('PUT', path, body),
  delete: (path) => apiFetch('DELETE', path),
};

export default api;
