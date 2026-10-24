import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

type ToolArgs = Record<string, unknown> | undefined;

const EDITOR_VERBS: Record<string, [running: string, done: string]> = {
  create: ["Creating", "Created"],
  str_replace: ["Editing", "Edited"],
  insert: ["Editing", "Edited"],
  view: ["Viewing", "Viewed"],
  undo_edit: ["Undoing edit to", "Undid edit to"],
};

const FILE_MANAGER_VERBS: Record<string, [running: string, done: string]> = {
  rename: ["Renaming", "Renamed"],
  delete: ["Deleting", "Deleted"],
};

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function getToolLabel(
  toolName: string,
  args: ToolArgs,
  isDone: boolean
): string {
  const command = str(args?.command);
  const path = str(args?.path);
  const verbs =
    toolName === "str_replace_editor"
      ? EDITOR_VERBS
      : toolName === "file_manager"
        ? FILE_MANAGER_VERBS
        : undefined;
  const pair = verbs && command ? verbs[command] : undefined;

  if (!verbs) return toolName;
  // Args stream in incrementally, so command and path may not be known yet
  if (!pair) return isDone ? "Updated files" : "Working on files...";

  const verb = pair[isDone ? 1 : 0];
  if (!path) return `${verb} a file`;

  const newPath = str(args?.new_path);
  if (command === "rename" && newPath) return `${verb} ${path} to ${newPath}`;
  return `${verb} ${path}`;
}

export function ToolInvocationBadge({
  toolInvocation,
}: {
  toolInvocation: ToolInvocation;
}) {
  const isDone = toolInvocation.state === "result" && !!toolInvocation.result;
  const label = getToolLabel(
    toolInvocation.toolName,
    toolInvocation.args,
    isDone
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
