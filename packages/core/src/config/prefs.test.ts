import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTheme, setTheme, getRecentModels, addRecentModel } from './prefs.js';
import * as fs from 'fs';
import { homedir } from 'os';

vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock('os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

describe('prefs', () => {
  const mockHome = '/mock/home';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue(mockHome);
  });

  describe('getTheme', () => {
    it('should return default if no prefs file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(getTheme()).toBe('default');
    });

    it('should return theme from prefs file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ theme: 'dark' }));
      expect(getTheme()).toBe('dark');
    });

    it('should return default if prefs file is invalid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
      expect(getTheme()).toBe('default');
    });
  });

  describe('setTheme', () => {
    it('should update theme and write to file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      setTheme('light');
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prefs.json'),
        expect.stringContaining('"theme": "light"'),
<<<<<<< HEAD
        expect.objectContaining({ mode: 0o600 })
=======
        expect.objectContaining({ mode: 0o600 }),
>>>>>>> tools_improvement
      );
    });

    it('should preserve other prefs when setting theme', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
<<<<<<< HEAD
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: [{ provider: 'p', modelId: 'm' }] }));
      
      setTheme('ocean');
      
=======
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ recentModels: [{ provider: 'p', modelId: 'm' }] }),
      );

      setTheme('ocean');

>>>>>>> tools_improvement
      const lastCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenContent = JSON.parse(lastCall[1] as string);
      expect(writtenContent.theme).toBe('ocean');
      expect(writtenContent.recentModels).toHaveLength(1);
    });
  });

  describe('getRecentModels', () => {
    it('should return empty array if no file exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(getRecentModels()).toEqual([]);
    });

    it('should return models from file', () => {
      const models = [{ provider: 'anthropic', modelId: 'claude-3-5-sonnet' }];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: models }));
      expect(getRecentModels()).toEqual(models);
    });
  });

  describe('addRecentModel', () => {
    it('should add a model to an empty list', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      addRecentModel('google', 'gemini-1.5-pro');
<<<<<<< HEAD
      
      const lastCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenContent = JSON.parse(lastCall[1] as string);
      expect(writtenContent.recentModels).toEqual([{ provider: 'google', modelId: 'gemini-1.5-pro' }]);
=======

      const lastCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenContent = JSON.parse(lastCall[1] as string);
      expect(writtenContent.recentModels).toEqual([
        { provider: 'google', modelId: 'gemini-1.5-pro' },
      ]);
>>>>>>> tools_improvement
    });

    it('should move existing model to front and avoid duplicates', () => {
      const initial = [
        { provider: 'p1', modelId: 'm1' },
<<<<<<< HEAD
        { provider: 'p2', modelId: 'm2' }
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: initial }));
      
      addRecentModel('p2', 'm2');
      
=======
        { provider: 'p2', modelId: 'm2' },
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: initial }));

      addRecentModel('p2', 'm2');

>>>>>>> tools_improvement
      const lastCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenContent = JSON.parse(lastCall[1] as string);
      expect(writtenContent.recentModels[0]).toEqual({ provider: 'p2', modelId: 'm2' });
      expect(writtenContent.recentModels).toHaveLength(2);
    });

    it('should keep only last 5 models', () => {
      const initial = [
        { provider: 'p1', modelId: 'm1' },
        { provider: 'p2', modelId: 'm2' },
        { provider: 'p3', modelId: 'm3' },
        { provider: 'p4', modelId: 'm4' },
<<<<<<< HEAD
        { provider: 'p5', modelId: 'm5' }
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: initial }));
      
      addRecentModel('p6', 'm6');
      
=======
        { provider: 'p5', modelId: 'm5' },
      ];
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ recentModels: initial }));

      addRecentModel('p6', 'm6');

>>>>>>> tools_improvement
      const lastCall = vi.mocked(fs.writeFileSync).mock.calls[0];
      const writtenContent = JSON.parse(lastCall[1] as string);
      expect(writtenContent.recentModels).toHaveLength(5);
      expect(writtenContent.recentModels[0]).toEqual({ provider: 'p6', modelId: 'm6' });
      expect(writtenContent.recentModels).not.toContainEqual({ provider: 'p5', modelId: 'm5' });
    });
  });
});
