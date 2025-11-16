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

export const placeholderImage = (width = 400, height = 300, text = 'Navishop') => {
  const sanitizedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#e5e7eb"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" fill="#94a3b8">
      ${sanitizedText}
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export { API_URL, ASSET_BASE_URL };
