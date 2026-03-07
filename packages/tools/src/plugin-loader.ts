import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, extname } from 'path';
import { homedir } from 'os';
import { pathToFileURL } from 'url';
import type { LoadedPlugin, PluginManifest, ToolSchema } from './types.js';

const PLUGIN_DIR = () => join(homedir(), '.personal-cli', 'plugins');
const MACRO_DIR = () => join(homedir(), '.personal-cli', 'macros');

export interface MacroDefinition {
  name: string;
  description?: string;
  steps: MacroStep[];
}

export interface MacroStep {
  tool: string;
  args?: Record<string, unknown>;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export async function loadPlugins(): Promise<LoadedPlugin[]> {
  const plugins: LoadedPlugin[] = [];
  const pluginDir = PLUGIN_DIR();

  if (!existsSync(pluginDir)) {
    ensureDir(pluginDir);
    return plugins;
  }

  const entries = readdirSync(pluginDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const pluginPath = join(pluginDir, entry.name);
    const manifestPath = join(pluginPath, 'plugin.json');

    if (!existsSync(manifestPath)) continue;

    try {
      const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      const modulePath = join(pluginPath, 'index.js');

      if (!existsSync(modulePath)) {
        console.warn(`Plugin ${entry.name}: index.js not found, skipping`);
        continue;
      }

      const moduleUrl = pathToFileURL(modulePath).href;
      const module = await import(moduleUrl);
      const tools: Record<string, unknown> = {};

      for (const toolSchema of manifest.tools) {
        if (module[toolSchema.name]) {
          tools[toolSchema.name] = module[toolSchema.name];
        } else {
          console.warn(
            `Plugin ${entry.name}: Tool '${toolSchema.name}' defined in manifest but not exported from index.js`,
          );
        }
      }

      plugins.push({ manifest, module, tools });
    } catch (err) {
      console.warn(`Failed to load plugin ${entry.name}:`, err);
    }
  }

  return plugins;
}

// Note: loadPluginsSync removed because ESM doesn't support synchronous dynamic imports
// Use loadPlugins() with async/await instead

export function getBuiltInToolSchemas(): ToolSchema[] {
  return [
    {
      name: 'readFile',
      description: 'Read the contents of a file',
      category: 'file',
      args: {
        path: { type: 'string', required: true },
        startLine: { type: 'number' },
        endLine: { type: 'number' },
      },
    },
    {
      name: 'writeFile',
      description: 'Write content to a file',
      category: 'file',
      args: {
        path: { type: 'string', required: true },
        content: { type: 'string', required: true },
      },
    },
    {
      name: 'editFile',
      description: 'Apply a surgical edit to a file by replacing an exact string',
      category: 'file',
      args: {
        path: { type: 'string', required: true },
        oldText: { type: 'string', required: true },
        newText: { type: 'string', required: true },
        allowMultiple: { type: 'boolean' },
      },
    },
    {
      name: 'listDir',
      description: 'List directory contents',
      category: 'file',
      args: { path: { type: 'string' } },
    },
    {
      name: 'searchFiles',
      description: 'Search for text in files',
      category: 'search',
      args: {
        query: { type: 'string', required: true },
        path: { type: 'string' },
        filePattern: { type: 'string' },
        caseSensitive: { type: 'boolean' },
      },
    },
    {
      name: 'globFiles',
      description: 'Find files matching a glob pattern',
      category: 'search',
      args: {
        pattern: { type: 'string', required: true },
        path: { type: 'string' },
      },
    },
    {
      name: 'semanticSearch',
      description: 'AST-aware semantic outline search over files',
      category: 'search',
      args: { patterns: { type: 'array', required: true } },
    },
    {
      name: 'diagnostics',
      description: 'Get TypeScript type errors for specific files',
      category: 'utility',
      args: { paths: { type: 'array', required: true } },
    },
    {
      name: 'runCommand',
      description: 'Run a shell command',
      category: 'system',
      args: {
        command: { type: 'string', required: true },
        cwd: { type: 'string' },
      },
    },
    {
      name: 'webFetch',
      description: 'Fetch content from a URL',
      category: 'web',
      args: {
        url: { type: 'string', required: true },
        useRaw: { type: 'boolean' },
      },
    },
    {
      name: 'webSearch',
      description: 'Search the web',
      category: 'web',
      args: {
        query: { type: 'string', required: true },
        maxResults: { type: 'number' },
      },
    },
    {
      name: 'gitStatus',
      description: 'Show git status',
      category: 'git',
      args: { cwd: { type: 'string' } },
    },
    {
      name: 'gitDiff',
      description: 'Show git diff',
      category: 'git',
      args: {
        staged: { type: 'boolean' },
        file: { type: 'string' },
        cwd: { type: 'string' },
      },
    },
    {
      name: 'gitLog',
      description: 'Show git commit history',
      category: 'git',
      args: {
        limit: { type: 'number' },
        cwd: { type: 'string' },
      },
    },
    {
      name: 'gitCommit',
      description: 'Create a git commit',
      category: 'git',
      args: {
        message: { type: 'string', required: true },
        cwd: { type: 'string' },
      },
    },
    {
      name: 'todoWrite',
      description: 'Write or update the session task list',
      category: 'utility',
      args: { tasks: { type: 'array', required: true } },
    },
    { name: 'todoRead', description: 'Read the session task list', category: 'utility' },
    {
      name: 'patch',
      description: 'Apply a patch to a file',
      category: 'file',
      args: {
        path: { type: 'string', required: true },
        patch: { type: 'string', required: true },
      },
    },
    {
      name: 'question',
      description: 'Ask the user a question',
      category: 'utility',
      args: {
        header: { type: 'string', required: true },
        options: { type: 'array', required: true },
      },
    },
    // ── File system operations ──────────────────────────────────────────────
    {
      name: 'moveFile',
      description: 'Move or rename a file or directory',
      category: 'file',
      args: {
        source: { type: 'string', required: true },
        destination: { type: 'string', required: true },
        overwrite: { type: 'boolean' },
      },
    },
    {
      name: 'copyFile',
      description: 'Copy a file or directory to a new location',
      category: 'file',
      args: {
        source: { type: 'string', required: true },
        destination: { type: 'string', required: true },
        overwrite: { type: 'boolean' },
      },
    },
    {
      name: 'deleteFile',
      description: 'Delete a file or directory (soft-delete to trash for undo recovery)',
      category: 'file',
      args: {
        path: { type: 'string', required: true },
        recursive: { type: 'boolean' },
      },
    },
    // ── Multi-file editing ──────────────────────────────────────────────────
    {
      name: 'batchEdit',
      description: 'Search-and-replace across multiple files matching a glob pattern',
      category: 'file',
      args: {
        pattern: { type: 'string', required: true },
        replacement: { type: 'string', required: true },
        glob: { type: 'string', required: true },
        isRegex: { type: 'boolean' },
        flags: { type: 'string' },
        dryRun: { type: 'boolean' },
      },
    },
    // ── Testing ─────────────────────────────────────────────────────────────
    {
      name: 'runTests',
      description: 'Run the project test suite (auto-detects vitest/jest/mocha)',
      category: 'system',
      args: {
        filter: { type: 'string' },
        cwd: { type: 'string' },
      },
    },
    // ── Workspace memory ────────────────────────────────────────────────────
    {
      name: 'memoryWrite',
      description: 'Store a named fact in workspace memory (.pcli-memory.json)',
      category: 'utility',
      args: {
        key: { type: 'string', required: true },
        value: { type: 'string', required: true },
      },
    },
    {
      name: 'memoryRead',
      description: 'Read one or all entries from workspace memory',
      category: 'utility',
      args: { key: { type: 'string' } },
    },
    {
      name: 'memoryDelete',
      description: 'Delete a key from workspace memory',
      category: 'utility',
      args: { key: { type: 'string', required: true } },
    },
    // ── Notifications ───────────────────────────────────────────────────────
    {
      name: 'notifyUser',
      description: 'Notify the user when a long-running task completes (terminal bell + status-bar flash)',
      category: 'utility',
      args: {
        title: { type: 'string', required: true },
        body: { type: 'string' },
        level: { type: 'string' },
        osNotify: { type: 'boolean' },
      },
    },
  ];
}

export function getAllToolSchemas(plugins: LoadedPlugin[]): ToolSchema[] {
  const builtins = getBuiltInToolSchemas();
  const pluginTools = plugins.flatMap((p) => p.manifest.tools);
  return [...builtins, ...pluginTools];
}

export function getToolSchemaByName(name: string, plugins: LoadedPlugin[]): ToolSchema | undefined {
  const all = getAllToolSchemas(plugins);
  return all.find((t) => t.name === name);
}

export function getPluginDir(): string {
  return PLUGIN_DIR();
}

export function getMacroDir(): string {
  return MACRO_DIR();
}

export function listMacros(): MacroDefinition[] {
  const macroDir = MACRO_DIR();
  ensureDir(macroDir);

  const macros: MacroDefinition[] = [];
  const files = readdirSync(macroDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const content = readFileSync(join(macroDir, file), 'utf-8');
      macros.push(JSON.parse(content));
    } catch (err) {
      console.warn(`Failed to load macro from ${file}:`, err);
    }
  }

  return macros;
}

export function saveMacro(macro: MacroDefinition): void {
  const macroDir = MACRO_DIR();
  ensureDir(macroDir);

  const filename = `${macro.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  writeFileSync(join(macroDir, filename), JSON.stringify(macro, null, 2));
}

export function deleteMacro(name: string): boolean {
  const macroDir = MACRO_DIR();
  const filename = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
  const filepath = join(macroDir, filename);

  if (!existsSync(filepath)) return false;

  unlinkSync(filepath);
  return true;
}
