import jwt from 'jsonwebtoken';

function buildAuthError(message, status = 401) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export default function verifyAdminRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw buildAuthError('No token provided');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    if (decoded.role !== 'admin') {
      throw buildAuthError('Admin access required');
    }

    return decoded;
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw buildAuthError('Invalid or expired token');
    }
    throw error;
  }
}
