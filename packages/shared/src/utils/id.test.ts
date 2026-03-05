import { describe, it, expect } from 'vitest';
import { generateId } from './id.js';

describe('generateId', () => {
  it('should generate a valid UUID', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    // Basic UUID validation
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});
