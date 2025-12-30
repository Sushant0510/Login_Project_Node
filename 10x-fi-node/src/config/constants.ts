import dotenv from 'dotenv';
dotenv.config();

// Type-safe environment variables
const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  JWT_SECRET: process.env.JWT_SECRET as string, // Type assertion since we validate this below
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
} as const;

// Validate required environment variables
const requiredVars = ['JWT_SECRET'] as const;
for (const key of requiredVars) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
} = env;