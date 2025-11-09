// Shared API configuration for admin panel
const defaultBackendBase = 'https://navishop-backend.vercel.app';

export const apiUrl = process.env.REACT_APP_API_URL || `${defaultBackendBase}/api`;
export const baseUrl = process.env.REACT_APP_BASE_URL || defaultBackendBase;

// Helper function to get full image URL
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  return imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
};

// Helper function for API requests with auth
export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
};
