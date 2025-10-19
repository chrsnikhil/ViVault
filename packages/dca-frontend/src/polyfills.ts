// Polyfills for browser environment
import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer;
  globalThis.buffer = Buffer;
}

// Make Buffer available on window object
if (typeof window !== 'undefined') {
  (window as unknown as { Buffer: typeof Buffer; buffer: typeof Buffer }).Buffer = Buffer;
  (window as unknown as { Buffer: typeof Buffer; buffer: typeof Buffer }).buffer = Buffer;
}

// Make Buffer available on global object
if (typeof global !== 'undefined') {
  (global as unknown as { Buffer: typeof Buffer; buffer: typeof Buffer }).Buffer = Buffer;
  (global as unknown as { Buffer: typeof Buffer; buffer: typeof Buffer }).buffer = Buffer;
}

export { Buffer };
