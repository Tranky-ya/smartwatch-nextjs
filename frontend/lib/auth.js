// Helper para manejar autenticación en el frontend

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
};

export const handleAuthError = (response) => {
  if (response.status === 401 || response.status === 403) {
    logout();
    return true;
  }
  return false;
};

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    logout();
    throw new Error('No authenticated');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Unauthorized');
  }

  return response;
};
