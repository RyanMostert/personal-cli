import { tool } from 'ai';
import { z } from 'zod';
import { readFile, setReadFilePermission } from './tools/read-file.js';
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
import { createTodoTools, type TodoUpdateCallback } from './tools/todo.js';
import { webSearch } from './tools/web-search.js';
import { createPatch } from './tools/patch.js';
import { createQuestionTool } from './tools/question.js';
import { createMoveFile, createCopyFile, createDeleteFile } from './tools/fs-ops.js';
import { createBatchEdit } from './tools/batch-edit.js';
import { memoryWrite, memoryRead, memoryDelete } from './tools/session-memory.js';
import { createRunTests } from './tools/run-tests.js';
import { createNotifyUser, type NotifyCallback } from './tools/notify.js';
import { minimatch } from 'minimatch';
import {
  type PermissionCallback,
  type PermissionRule,
  type WriteCallback,
  type QuestionCallback,
  type LoadedPlugin,
  type ToolArgSchema,
  DEFAULT_PERMISSION_RULES,
  MODE_RULES,
} from './types.js';

export { loadMemoryForPrompt } from './tools/session-memory.js';
export type { NotifyCallback };

export * from './types.js';
export * from './plugin-loader.js';
export { MCPToolWrapper, wrapMCPTools, convertMCPToolsToRegistryFormat } from './mcp-tools.js';

export interface CreateToolsOptions {
  onWrite?: WriteCallback;
  questionFn?: QuestionCallback;
  plugins?: LoadedPlugin[];
  onTodoUpdate?: TodoUpdateCallback;
  onNotify?: NotifyCallback;
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

  // Hook resolvedPermission into readFile synchronously
  setReadFilePermission(resolvedPermission);

  const { onWrite, questionFn, plugins, onTodoUpdate, onNotify } = options ?? {};
  const { todoWrite, todoRead } = createTodoTools(onTodoUpdate);

  const baseTools: Record<string, any> = {
    readFile,
    writeFile: createWriteFile(resolvedPermission, onWrite),
    editFile: createEditFile(resolvedPermission, onWrite),
    listDir,
    searchFiles,
    globFiles,
    semanticSearch,
    diagnostics,
    runCommand: createRunCommand(resolvedPermission),
    runTests: createRunTests(resolvedPermission),
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
    moveFile: createMoveFile(resolvedPermission, onWrite),
    copyFile: createCopyFile(resolvedPermission, onWrite),
    deleteFile: createDeleteFile(resolvedPermission, onWrite),
    batchEdit: createBatchEdit(resolvedPermission, onWrite),
    memoryWrite,
    memoryRead,
    memoryDelete,
    notifyUser: createNotifyUser(onNotify),
  };

  // Merge plugin tools
  if (plugins && plugins.length > 0) {
    for (const plugin of plugins) {
      for (const schema of plugin.manifest.tools) {
        const fn = plugin.tools[schema.name] as any;
        if (typeof fn === 'function') {
          baseTools[schema.name] = tool({
            description: schema.description,
            execute: fn,
            inputSchema: convertArgsToZod(schema.args),
          });
        }
      }
    }
  }

  return baseTools;
}

function convertArgsToZod(args?: Record<string, ToolArgSchema>) {
  if (!args || Object.keys(args).length === 0) {
    return z.object({});
  }

  const shape: any = {};
  for (const [key, config] of Object.entries(args)) {
    let zodType: any;
    switch (config.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'object':
        zodType = z.record(z.any());
        break;
      case 'array':
        zodType = z.array(z.any());
        break;
      default:
        zodType = z.any();
    }

    if (config.description) zodType = zodType.describe(config.description);
    if (!config.required) zodType = zodType.optional();
    if (config.default !== undefined) zodType = zodType.default(config.default);

    shape[key] = zodType;
  }

  return z.object(shape);
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
      const patternMatch =
        !rule.pattern || minimatch(pathArg, rule.pattern, { dot: true, matchBase: true });
      if (!toolMatch || !patternMatch) continue;

      if (rule.action === 'allow') return true;
      if (rule.action === 'deny') return false;
      if (rule.action === 'ask') break; // fall through to user callback
    }

    // No deny/allow matched — delegate to user callback
    return userCallback ? userCallback(toolName, args) : true;
  };
}
