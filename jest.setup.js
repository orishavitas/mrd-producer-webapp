// Jest setup file
// Add any global test setup here

// Require @testing-library/jest-dom for React component assertions
require('@testing-library/jest-dom');

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock environment variables for tests
process.env.GOOGLE_API_KEY = 'test-api-key';
process.env.GOOGLE_SEARCH_ENGINE_ID = 'test-search-engine-id';
