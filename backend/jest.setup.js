// Jest setup file
// Increase timeout for database operations
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agile-management-test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
