import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { appendHistory, loadHistory } from './history.js';
import * as fs from 'fs';
import { homedir } from 'os';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

describe('history', () => {
  const mockHome = '/mock/home';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue(mockHome);
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('appendHistory', () => {
    it('should not append empty text', () => {
      appendHistory('  ');
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it('should append new entry to file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.readFileSync).mockReturnValue('');
<<<<<<< HEAD
      
      appendHistory('hello world');
      
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prompt-history.jsonl'),
        expect.stringContaining('"text":"hello world"'),
        expect.objectContaining({ mode: 0o600 })
=======

      appendHistory('hello world');

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prompt-history.jsonl'),
        expect.stringContaining('"text":"hello world"'),
        expect.objectContaining({ mode: 0o600 }),
>>>>>>> tools_improvement
      );
    });

    it('should skip duplicate if identical to last entry', () => {
      const lastEntry = { text: 'last one', timestamp: Date.now() - 1000 };
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lastEntry) + '\n');
<<<<<<< HEAD
      
      appendHistory('last one');
      
=======

      appendHistory('last one');

>>>>>>> tools_improvement
      expect(fs.appendFileSync).not.toHaveBeenCalled();
    });

    it('should trim history if it exceeds MAX_ENTRIES', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
<<<<<<< HEAD
      
      // Create 100 entries already in file
      let fileContent = Array.from({ length: 100 }, (_, i) => 
        JSON.stringify({ text: `entry ${i}`, timestamp: Date.now() + i })
      ).join('\n') + '\n';
      
=======

      // Create 100 entries already in file
      let fileContent =
        Array.from({ length: 100 }, (_, i) =>
          JSON.stringify({ text: `entry ${i}`, timestamp: Date.now() + i }),
        ).join('\n') + '\n';

>>>>>>> tools_improvement
      vi.mocked(fs.readFileSync).mockImplementation(() => fileContent);
      vi.mocked(fs.appendFileSync).mockImplementation((path, data) => {
        fileContent += data;
      });
<<<<<<< HEAD
      
      appendHistory('new entry');
      
=======

      appendHistory('new entry');

>>>>>>> tools_improvement
      expect(fs.writeFileSync).toHaveBeenCalled();
      const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
      const lines = writtenContent.trim().split('\n');
      expect(lines).toHaveLength(100);
      expect(lines[lines.length - 1]).toContain('new entry');
      expect(lines[0]).not.toContain('entry 0');
    });
  });

  describe('loadHistory', () => {
    it('should return empty array if file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(loadHistory()).toEqual([]);
    });

    it('should return empty array if file is empty', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('  ');
      expect(loadHistory()).toEqual([]);
    });

    it('should parse and return history entries sorted by timestamp desc', () => {
      const e1 = { text: 'first', timestamp: 1000 };
      const e2 = { text: 'second', timestamp: 2000 };
      const e3 = { text: 'third', timestamp: 1500 };
<<<<<<< HEAD
      
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        [JSON.stringify(e1), JSON.stringify(e2), JSON.stringify(e3)].join('\n')
      );
      
=======

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        [JSON.stringify(e1), JSON.stringify(e2), JSON.stringify(e3)].join('\n'),
      );

>>>>>>> tools_improvement
      const history = loadHistory();
      expect(history).toEqual(['second', 'third', 'first']);
    });

    it('should skip malformed lines', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
<<<<<<< HEAD
        JSON.stringify({ text: 'valid', timestamp: 1000 }) + '\ninvalid json\n'
      );
      
=======
        JSON.stringify({ text: 'valid', timestamp: 1000 }) + '\ninvalid json\n',
      );

>>>>>>> tools_improvement
      expect(loadHistory()).toEqual(['valid']);
    });
  });
});
