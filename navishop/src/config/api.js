const defaultOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';

const API_URL =
  process.env.REACT_APP_API_URL ||
  (defaultOrigin ? `${defaultOrigin}/api` : 'http://localhost:5001/api');

const ASSET_BASE_URL =
  process.env.REACT_APP_ASSET_BASE_URL ||
  (API_URL.startsWith('http') ? API_URL.replace(/\/api$/, '') : defaultOrigin) ||
  'http://localhost:5001';

export const buildApiUrl = (path = '') => {
  if (!path) return API_URL;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const buildAssetUrl = (path = '') => {
  if (!path) return ASSET_BASE_URL;
  return `${ASSET_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return buildAssetUrl(url);
};

export { API_URL, ASSET_BASE_URL };
