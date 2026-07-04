import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

globalThis.expect = expect;
globalThis.sinon = {
  spy: (...args) => vi.fn(...args),
  stub: (...args) => vi.fn(...args),
};

afterEach(() => {
  cleanup();
});
