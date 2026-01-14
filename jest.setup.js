import '@testing-library/jest-dom';

// Polyfill Web APIs for Next.js server-side testing
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js server Request/Response
if (typeof Request === 'undefined') {
  global.Request = class Request {};
}

if (typeof Response === 'undefined') {
  global.Response = class Response {};
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {};
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => ({ userId: 'test-user-id' })),
  currentUser: jest.fn(() => ({ id: 'test-user-id', emailAddresses: [{ emailAddress: 'test@example.com' }] })),
  useAuth: jest.fn(() => ({ userId: 'test-user-id', isLoaded: true, isSignedIn: true })),
  useUser: jest.fn(() => ({ user: { id: 'test-user-id', emailAddresses: [{ emailAddress: 'test@example.com' }] }, isLoaded: true })),
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
  ClerkProvider: ({ children }) => children,
}));

// Mock nanoid to avoid ESM issues
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test1234567890abcdefghijklmno'),
}));

// Suppress console errors in tests
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render')) {
    return;
  }
  originalError.call(console, ...args);
};
