import { Decimal } from 'decimal.js';

// Global configuration for Decimal.js
// We want enough precision for culinary math (grams, fractions).
// Default precision is 20, which is plenty.
Decimal.set({ precision: 20 });

export { Decimal };
