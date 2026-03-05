import { readFile } from './tools/read-file.js';
import { createWriteFile } from './tools/write-file.js';
import { createEditFile } from './tools/edit-file.js';
import { listDir } from './tools/list-dir.js';
import { searchFiles } from './tools/search-files.js';
import { globFiles } from './tools/glob-files.js';
import { semanticSearch } from './tools/semantic-search.js';
import { diagnostics } from './tools/diagnostics.js';
import { createRunCommand } from './tools/run-command.js';
import { createWebFetch } from './tools/web-fetch.js';
import { gitStatus, gitDiff, gitLog, createGitCommit } from './tools/git.js';
import { todoWrite, todoRead } from './tools/todo.js';
import { webSearch } from './tools/web-search.js';
import { createPatch } from './tools/patch.js';
import { createQuestionTool } from './tools/question.js';
import { minimatch } from 'minimatch';
import {
  type PermissionCallback,
  type PermissionRule,
  type WriteCallback,
  type QuestionCallback,
  type LoadedPlugin,
  DEFAULT_PERMISSION_RULES,
  MODE_RULES,
} from './types.js';

export * from './types.js';
export * from './plugin-loader.js';
export { MCPToolWrapper, wrapMCPTools, convertMCPToolsToRegistryFormat } from './mcp-tools.js';

export interface CreateToolsOptions {
  onWrite?: WriteCallback;
  questionFn?: QuestionCallback;
  plugins?: LoadedPlugin[];
}

export function createTools(
  mode: 'ask' | 'plan' | 'auto' | 'build' = 'ask',
  permissionFn?: PermissionCallback,
  options?: CreateToolsOptions,
) {
  // Build effective rules: defaults + mode overrides
  const rules = [...DEFAULT_PERMISSION_RULES, ...(MODE_RULES[mode] ?? [])];

  // Wrap permissionFn with rule pre-check
  const resolvedPermission = makePermissionResolver(rules, permissionFn);

  const { onWrite, questionFn, plugins } = options ?? {};

  // Hook resolvedPermission into tools that need it
  // Lazy hook to inject resolvedPermission into read-file tool without making createTools async
  import('./tools/read-file.js')
    .then(mod => { if (mod && typeof mod.setReadFilePermission === 'function') mod.setReadFilePermission(resolvedPermission); })
    .catch(() => { /* ignore */ });

  const baseTools = {
    readFile,
    writeFile: createWriteFile(resolvedPermission, onWrite),
    editFile: createEditFile(resolvedPermission, onWrite),
    listDir,
    searchFiles,
    globFiles,
    semanticSearch,
    diagnostics,
    runCommand: createRunCommand(resolvedPermission),
    webFetch: createWebFetch(resolvedPermission),
    webSearch,
    gitStatus,
    gitDiff,
    gitLog,
    gitCommit: createGitCommit(resolvedPermission),
    todoWrite,
    todoRead,
    patch: createPatch(resolvedPermission, onWrite),
    question: createQuestionTool(questionFn),
  };

  // Merge plugin tools
  if (plugins && plugins.length > 0) {
    for (const plugin of plugins) {
      Object.assign(baseTools, plugin.tools);
    }
  }

  return baseTools;
}

function makePermissionResolver(
  rules: PermissionRule[],
  userCallback?: PermissionCallback,
): PermissionCallback {
  return async (toolName, args) => {
    const pathArg = (args.path ?? args.command ?? args.filePath ?? '') as string;

    // Check rules in reverse order (last match wins, like CSS)
    for (const rule of [...rules].reverse()) {
      const toolMatch = rule.tool === '*' || rule.tool === toolName;
      const patternMatch = !rule.pattern || minimatch(pathArg, rule.pattern, { dot: true, matchBase: true });
      if (!toolMatch || !patternMatch) continue;

      if (rule.action === 'allow') return true;
      if (rule.action === 'deny') return false;
      if (rule.action === 'ask') break; // fall through to user callback
    }

    // No deny/allow matched — delegate to user callback
    return userCallback ? userCallback(toolName, args) : true;
  };
}
