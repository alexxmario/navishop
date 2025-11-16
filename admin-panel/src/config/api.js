export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
export const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5001';

export const buildApiUrl = (path = '') => {
  if (!path) return API_URL;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const buildBaseUrl = (path = '') => {
  if (!path) return BASE_URL;
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const resolveImageUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : buildBaseUrl(url);
};
