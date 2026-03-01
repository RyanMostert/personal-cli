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
import type { PermissionCallback } from './types.js';

export * from './types.js';

export function createTools(permissionFn?: PermissionCallback) {
  return {
    readFile,
    writeFile: createWriteFile(permissionFn),
    editFile: createEditFile(permissionFn),
    listDir,
    searchFiles,
    globFiles,
    semanticSearch,
    diagnostics,
    runCommand: createRunCommand(permissionFn),
    webFetch: createWebFetch(permissionFn),
    gitStatus,
    gitDiff,
    gitLog,
    gitCommit: createGitCommit(permissionFn),
    think,
  };
}
