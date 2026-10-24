import { test, expect, afterEach, describe } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ToolInvocation } from "ai";
import { ToolInvocationBadge, getToolLabel } from "../ToolInvocationBadge";

afterEach(() => {
  cleanup();
});

function invocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "partial-call" | "call" | "result" = "result"
): ToolInvocation {
  const base = { toolCallId: "id", toolName, args };
  return state === "result"
    ? { ...base, state, result: "Success" }
    : ({ ...base, state } as ToolInvocation);
}

describe("getToolLabel", () => {
  test.each([
    ["str_replace_editor", { command: "create", path: "/App.jsx" }, "Creating /App.jsx", "Created /App.jsx"],
    ["str_replace_editor", { command: "str_replace", path: "/App.jsx" }, "Editing /App.jsx", "Edited /App.jsx"],
    ["str_replace_editor", { command: "insert", path: "/App.jsx" }, "Editing /App.jsx", "Edited /App.jsx"],
    ["str_replace_editor", { command: "view", path: "/App.jsx" }, "Viewing /App.jsx", "Viewed /App.jsx"],
    ["str_replace_editor", { command: "undo_edit", path: "/App.jsx" }, "Undoing edit to /App.jsx", "Undid edit to /App.jsx"],
    ["file_manager", { command: "delete", path: "/old.jsx" }, "Deleting /old.jsx", "Deleted /old.jsx"],
    ["file_manager", { command: "rename", path: "/a.jsx", new_path: "/b.jsx" }, "Renaming /a.jsx to /b.jsx", "Renamed /a.jsx to /b.jsx"],
  ])("%s %j", (toolName, args, running, done) => {
    expect(getToolLabel(toolName, args, false)).toBe(running);
    expect(getToolLabel(toolName, args, true)).toBe(done);
  });

  test("omits the path when it has not streamed in yet", () => {
    expect(getToolLabel("str_replace_editor", { command: "create" }, false)).toBe(
      "Creating a file"
    );
  });

  test("omits the new path for a rename when it is missing", () => {
    expect(
      getToolLabel("file_manager", { command: "rename", path: "/a.jsx" }, false)
    ).toBe("Renaming /a.jsx");
  });

  test("uses a generic label when the command is missing or unknown", () => {
    expect(getToolLabel("str_replace_editor", {}, false)).toBe(
      "Working on files..."
    );
    expect(getToolLabel("str_replace_editor", undefined, true)).toBe(
      "Updated files"
    );
    expect(
      getToolLabel("file_manager", { command: "explode", path: "/a" }, false)
    ).toBe("Working on files...");
  });

  test("falls back to the tool name for unknown tools", () => {
    expect(getToolLabel("mystery_tool", { command: "create" }, false)).toBe(
      "mystery_tool"
    );
  });
});

describe("ToolInvocationBadge", () => {
  test("shows a completed label and green dot when the call has a result", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={invocation("str_replace_editor", {
          command: "create",
          path: "/components/Card.jsx",
        })}
      />
    );

    expect(screen.getByText("Created /components/Card.jsx")).toBeDefined();
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
  });

  test("shows an in-progress label and spinner while the call is running", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={invocation(
          "str_replace_editor",
          { command: "str_replace", path: "/App.jsx" },
          "call"
        )}
      />
    );

    expect(screen.getByText("Editing /App.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
    expect(container.querySelector(".bg-emerald-500")).toBeNull();
  });

  test("handles partial args while streaming", () => {
    render(
      <ToolInvocationBadge
        toolInvocation={invocation("str_replace_editor", {}, "partial-call")}
      />
    );

    expect(screen.getByText("Working on files...")).toBeDefined();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  test("keeps the spinner when the result is empty", () => {
    const { container } = render(
      <ToolInvocationBadge
        toolInvocation={
          {
            toolCallId: "id",
            toolName: "file_manager",
            args: { command: "delete", path: "/a.jsx" },
            state: "result",
            result: "",
          } as ToolInvocation
        }
      />
    );

    expect(screen.getByText("Deleting /a.jsx")).toBeDefined();
    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  test("renders the raw tool name for unknown tools", () => {
    render(
      <ToolInvocationBadge toolInvocation={invocation("mystery_tool", {})} />
    );

    expect(screen.getByText("mystery_tool")).toBeDefined();
  });
});
