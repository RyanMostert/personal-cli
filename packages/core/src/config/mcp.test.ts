import { describe, it, expect, vi } from 'vitest';
import { loadMCPConfig } from './mcp.js';
import * as fs from 'fs';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('loadMCPConfig', () => {
  it('should return an empty object if config file does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadMCPConfig();
    expect(config).toEqual({});
  });

  it('should return parsed config if file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ test: { command: 'node' } }));
    const config = loadMCPConfig();
    expect(config).toEqual({ test: { command: 'node' } });
  });

  it('should return empty object on parse error', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
    const config = loadMCPConfig();
    expect(config).toEqual({});
  });
});
