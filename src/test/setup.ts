import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Étend les assertions de Vitest avec les matchers de jest-dom
expect.extend(matchers);

// Nettoie le DOM après chaque test
afterEach(() => {
  cleanup();
});
