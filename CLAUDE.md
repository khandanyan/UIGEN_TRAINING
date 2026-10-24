# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

UIGen: an AI-powered React component generator with live preview. Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind v4, Prisma + SQLite, Vercel AI SDK (`ai` v4) with `@ai-sdk/anthropic`. Path alias `@/` → `src/`.

## Commands

- `npm run setup` — install deps, `prisma generate`, `prisma migrate dev` (first-time setup)
- `npm run dev` — dev server on http://localhost:3000 (Turbopack)
- `npm run build` / `npm run start` — production build / serve
- `npm run lint` — `next lint`
- `npm test` — Vitest (jsdom); watch mode by default
- Single test: `npx vitest run src/lib/__tests__/file-system.test.ts` (add `-t "name"` to filter by test name)
- `npm run db:reset` — reset the SQLite database (destructive)

`ANTHROPIC_API_KEY` in `.env` is optional. Without it, `getLanguageModel()` in `src/lib/provider.ts` returns `MockLanguageModel`, which streams canned counter/form/card components (and the chat route limits `maxSteps` to 4 instead of 40).

The Prisma client is generated to `src/generated/prisma` (not the default location), so re-run `npx prisma generate` after schema changes.

## Architecture

The app is a chat on the left, and a live preview / code editor on the right. Generated code never touches disk — it lives in an in-memory virtual file system.

**Generation loop** (`src/app/api/chat/route.ts`): The client POSTs `{ messages, files, projectId }`. The server rebuilds a `VirtualFileSystem` from the serialized `files`, then runs `streamText` with two tools bound to that FS: `str_replace_editor` (`src/lib/tools/str-replace.ts`: create / str_replace / insert) and `file_manager` (`src/lib/tools/file-manager.ts`: rename / delete). The system prompt requires a root `/App.jsx` default export, Tailwind styling, and `@/` imports for non-library files. On finish, if the user is authenticated and `projectId` is set, messages and serialized FS are saved to `Project.messages` / `Project.data` (JSON strings).

**Client state mirrors the server FS**: Tool calls streamed back to the browser are replayed against the client-side `VirtualFileSystem` via `handleToolCall` in `src/lib/contexts/file-system-context.tsx`, which bumps `refreshTrigger` so the editor, file tree, and preview re-render. `chat-context.tsx` wraps the AI SDK chat hook and sends the current FS with each request. Both server and client implement the same tool semantics against `src/lib/file-system.ts`, so changes to tool behavior must be kept consistent in both places.

**Preview pipeline** (`src/components/preview/PreviewFrame.tsx` + `src/lib/transform/jsx-transformer.ts`): Each JS/JSX/TS/TSX file is compiled in the browser with `@babel/standalone`, turned into a Blob URL, and registered in a generated import map (with variants for `@/` alias, leading slash, and extensionless paths). Bare package imports resolve to `https://esm.sh/<pkg>`; missing local imports get placeholder modules; CSS imports are stripped and inlined. The result is an HTML document (Tailwind via CDN, React 19 from esm.sh) rendered in an iframe, with transform errors shown as a syntax-error panel.

**Auth & persistence**: Custom JWT sessions (`jose`) in `src/lib/auth.ts`, passwords hashed with `bcrypt`; `src/middleware.ts` guards `/api/projects` and `/api/filesystem`. Server actions in `src/actions/` handle project CRUD. Anonymous users can work without an account (`src/lib/anon-work-tracker.ts` tracks their work); `Project.userId` is nullable. Schema: `User` and `Project` in `prisma/schema.prisma` (SQLite at `prisma/dev.db`).

**UI**: shadcn-style primitives in `src/components/ui/` (config in `components.json`); feature components under `src/components/{chat,editor,preview,auth}`. Tests live in `__tests__` folders next to the code they cover.

## Code style

- Use comments sparingly. Only comment complex code.

## Database

- The database schema is defined in @prisma/schema.prisma. Reference it anytime you need to understand the structure of data stored in the database.
