import { beforeAll } from 'vitest';

// Setup test environment variables before any imports
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.HOST = 'localhost';
  process.env.PORT = '3001';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/mdsystem_test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
  process.env.API_KEY_ENCRYPTION_SECRET = 'test-api-key-secret-32-characters';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  process.env.CROSSREF_MAILTO = 'test@example.com';
});
