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
import { think } from './tools/think.js';
import { minimatch } from 'minimatch';
import {
  type PermissionCallback,
  type PermissionRule,
  DEFAULT_PERMISSION_RULES,
  MODE_RULES,
} from './types.js';

export * from './types.js';

export function createTools(
  mode: 'ask' | 'plan' | 'auto' | 'build' = 'ask',
  permissionFn?: PermissionCallback,
) {
  // Build effective rules: defaults + mode overrides
  const rules = [...DEFAULT_PERMISSION_RULES, ...(MODE_RULES[mode] ?? [])];

  // Wrap permissionFn with rule pre-check
  const resolvedPermission = makePermissionResolver(rules, permissionFn);

  return {
    readFile,
    writeFile: createWriteFile(resolvedPermission),
    editFile: createEditFile(resolvedPermission),
    listDir,
    searchFiles,
    globFiles,
    semanticSearch,
    diagnostics,
    runCommand: createRunCommand(resolvedPermission),
    webFetch: createWebFetch(resolvedPermission),
    gitStatus,
    gitDiff,
    gitLog,
    gitCommit: createGitCommit(resolvedPermission),
    think,
  };
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
      const patternMatch = !rule.pattern || minimatch(pathArg, rule.pattern);
      if (!toolMatch || !patternMatch) continue;

      if (rule.action === 'allow') return true;
      if (rule.action === 'deny') return false;
      if (rule.action === 'ask') break; // fall through to user callback
    }

    // No deny/allow matched — delegate to user callback
    return userCallback ? userCallback(toolName, args) : true;
  };
}
