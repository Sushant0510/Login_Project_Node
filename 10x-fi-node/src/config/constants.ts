// Load environment variables
require('dotenv').config();

export const PORT = process.env.PORT || 3000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/enterprise-starter';
export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Add other configuration constants here
