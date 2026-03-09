import type {
  CreateToolsOptions,
  PermissionCallback,
  LoadedPlugin,
  QuestionCallback,
} from '@personal-cli/tools';
import type { TodoItem, AgentMode } from '@personal-cli/shared';
import { createTools } from '@personal-cli/tools';

interface BuildToolsParams {
  mode: AgentMode;
  permissionFn: PermissionCallback | undefined;
  onWrite?: (path: string, before: string | null, after: string) => void;
  questionFn?: QuestionCallback;
  plugins: LoadedPlugin[];
  onTodoUpdate?: (todos: TodoItem[]) => void;
}

export function buildTools(params: BuildToolsParams): ReturnType<typeof createTools> {
  const opts: CreateToolsOptions = {
    onWrite: params.onWrite,
    questionFn: params.questionFn,
    plugins: params.plugins,
    onTodoUpdate: params.onTodoUpdate,
  };

  return createTools(params.mode, params.permissionFn, opts);
}
