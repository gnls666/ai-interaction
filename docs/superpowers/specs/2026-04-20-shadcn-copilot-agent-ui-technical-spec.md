# Copilot SDK + shadcn.io AI Interaction Technical Spec

## 0. Scope

This spec is for the AI interaction workspace UI, not for final business logic.

Goals:

- Use shadcn/ui as the app skeleton.
- Use shadcn.io AI component source as copyable frontend primitives.
- Use GitHub Copilot SDK as the primary runtime/data source.
- Make message history, chat resume, artifacts, tools, charts, and generated UI first-class.
- Keep implementation small enough to ship in this Vite app without inventing a new framework.

Non-goals:

- Do not depend on `pnpm dlx shadcn add ...` as the only setup path.
- Do not store chain-of-thought as user-facing text. Store reasoning summaries and raw SDK events only when needed for debugging.
- Do not run arbitrary generated React/JS from the model.

Copyable source:

- shadcn.io AI source files: `vendor/shadcn-io/source/**`
- One-file copy appendix: `docs/superpowers/specs/2026-04-20-shadcn-io-ai-source-appendix.md`

## 1. Product Shape

The first screen is the workspace, close to ChatGPT's empty and calm layout:

```txt
┌──────────────────────┬───────────────────────────────────────────────┬──────────────────────┐
│ Threads              │                                               │ Artifact detail      │
│                      │  Today                                        │ optional / collapses │
│ New chat             │                                               │                      │
│ Search chats         │     User message                              │ Selected artifact    │
│                      │     Assistant response                        │ metadata/actions     │
│ Recent               │     Thinking summary                          │ preview/details      │
│ - ETF overlap        │     Tool call rows                            │                      │
│ - Debug agent        │                                               │                      │
│ - Holdings diff      │  ┌─────────────────────────────────────────┐  │                      │
│                      │  │ Artifact canvas in the message stream   │  │                      │
│                      │  └─────────────────────────────────────────┘  │                      │
│                      │                                               │                      │
│                      │                 [ model ][ tools ][ upload ]  │                      │
│                      │                 Ask anything...               │                      │
└──────────────────────┴───────────────────────────────────────────────┴──────────────────────┘
```

Interaction rules:

- Left rail is a real chat history list, not decorative navigation.
- Center is the source of truth: messages, reasoning summaries, tool calls, and inline artifacts live together.
- Clicking an artifact opens the right panel for enlarged preview, actions, provenance, and structured data.
- On narrow screens, thread list and artifact detail become sheets.
- Empty state should be sparse: one prompt composer, a few capability chips, no marketing hero.

## 2. Component Index

| Area | Component Source | Target Role |
| --- | --- | --- |
| App shell | shadcn `sheet`, `scroll-area`, `separator`, `button`, repo design tokens | Layout, responsive sidebars, app chrome |
| Thread list | local `ThreadList` + shadcn `button`, `badge`, `scroll-area` | Chat history, search, pinned/recent grouping |
| Conversation | `vendor/shadcn-io/source/conversation/...` | Scroll container, stick-to-bottom behavior |
| Message | `vendor/shadcn-io/source/message/...` | User/assistant/system message blocks |
| Prompt input | `vendor/shadcn-io/source/prompt-input/...` | Chat box, submit state, file upload, mic affordance |
| Attachments | `vendor/shadcn-io/source/attachments/...` | Uploaded file chips and previews |
| Model selector | `vendor/shadcn-io/source/model-selector/...` | Copilot model and reasoning effort control |
| Reasoning | `vendor/shadcn-io/source/reasoning/...` | Collapsible "thinking" / reasoning summary |
| Tool calls | `vendor/shadcn-io/source/tool/...` | Search/read/shell/write/github tool status rows |
| Artifacts | `vendor/shadcn-io/source/artifact/...` | Inline artifact canvas and right-panel detail |
| Code blocks | `vendor/shadcn-io/source/code-block/...` | Code, patches, generated snippets |
| Terminal | `vendor/shadcn-io/source/terminal/...` | Shell output and CLI logs |
| Sources | `vendor/shadcn-io/source/sources/...` | Search citations and file references |
| Confirmation | `vendor/shadcn-io/source/confirmation/...` | Dangerous write/shell permission prompts |
| Web preview | `vendor/shadcn-io/source/web-preview/...` | Safe iframe preview for generated HTML |
| Shimmer | `vendor/shadcn-io/source/shimmer/...` | Streaming/reasoning loading surface |
| Image | `vendor/shadcn-io/source/image/...` | Image attachment/generated image display |

Required dependency surface from the copied source:

- npm packages: `ai`, `lucide-react`, `motion`, `nanoid`, `shiki`, `streamdown`, `use-stick-to-bottom`
- shadcn/ui registry primitives: `alert`, `badge`, `button`, `button-group`, `collapsible`, `command`, `dialog`, `dropdown-menu`, `hover-card`, `input`, `input-group`, `select`, `tooltip`
- This repo already has part of the UI primitive set. Missing primitives should be copied from shadcn/ui or installed from the normal shadcn/ui source, then styled with the existing design tokens.

Import adaptation:

- Upstream source uses `~/components/...` and `~/lib/utils`.
- In this repo, replace `~/` with `@/`.
- Upstream source also uses `~/packages/ai/*`; if copied into `src/components/ai`, replace those imports with `@/components/ai/*`.
- Keep component APIs unchanged where possible so future upstream re-copy is easy.

## 3. File Plan

| File | Responsibility |
| --- | --- |
| `src/components/workspace/ai-workspace.tsx` | Three-column shell, responsive sheets, selected thread/artifact state |
| `src/components/workspace/thread-list.tsx` | Thread summaries, search, pin/archive affordances |
| `src/components/workspace/conversation-view.tsx` | Message stream rendering with conversation/message/reasoning/tool/source components |
| `src/components/workspace/prompt-composer.tsx` | shadcn.io prompt input, model selector, tool toggles, attachments |
| `src/components/workspace/artifact-canvas.tsx` | Inline artifact cards in center column |
| `src/components/workspace/artifact-detail.tsx` | Enlarged artifact panel, download/copy/open actions |
| `src/components/workspace/renderers/*` | Markdown, code, diff, terminal, chart, table, JSON, HTML iframe renderers |
| `src/lib/copilot/client.ts` | Frontend API client for threads, messages, runs, upload, resume |
| `src/lib/copilot/events.ts` | Normalize Copilot SDK events into UI events |
| `src/lib/copilot/store.ts` | Thread/message/artifact client cache and optimistic updates |
| `server/copilot-session-manager.mjs` | Long-lived `CopilotClient`, session map, create/resume/send/disconnect |
| `server/thread-store.mjs` | Persistent thread summaries, messages, events, artifacts |
| `server/copilot-server.mjs` | HTTP/SSE routes |

First implementation can keep `server/copilot-server.mjs`, but the runtime must change from single request/response into session + event streaming.

## 4. Data Model

Use an append-only event log plus compact read models. This gives fast UI rendering and reliable resume without replaying everything on each paint.

```ts
export type ThreadSummary = {
  threadId: string
  copilotSessionId?: string
  title: string
  lastMessagePreview: string
  model: string
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  status: "idle" | "running" | "failed"
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export type MessageRecord = {
  id: string
  threadId: string
  role: "user" | "assistant" | "system"
  status: "pending" | "streaming" | "complete" | "failed"
  parts: MessagePart[]
  copilotMessageId?: string
  runId?: string
  createdAt: string
  updatedAt: string
}

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning_summary"; text: string; openByDefault?: boolean }
  | { type: "tool"; toolCallId: string; name: string; status: "running" | "complete" | "failed"; summary: string }
  | { type: "source"; title: string; url?: string; path?: string }
  | { type: "artifact_ref"; artifactId: string }

export type ArtifactRecord = {
  artifactId: string
  threadId: string
  messageId: string
  kind: "markdown" | "code" | "diff" | "terminal" | "chart" | "table" | "html" | "component" | "json"
  title: string
  content: unknown
  status: "streaming" | "ready" | "failed"
  createdAt: string
  updatedAt: string
}

export type EventRecord = {
  eventId: string
  threadId: string
  runId: string
  sequence: number
  sdkType: string
  raw: unknown
  createdAt: string
}
```

Storage choice:

- Phase 1: browser IndexedDB for read models + server JSON/SQLite for SDK session mapping.
- Phase 2: SQLite on the server becomes source of truth if multiple windows or devices matter.
- Do not use `localStorage` for full messages; it is fine only for UI preferences.

## 5. Message History List

The thread list must come from `ThreadSummary`, not by scanning full messages.

Read API:

```txt
GET /api/threads?query=&cursor=&limit=30
→ { items: ThreadSummary[], nextCursor?: string }
```

Update rules:

1. When the user submits a prompt, create or update `ThreadSummary` immediately:
   - `status = "running"`
   - `lastMessagePreview = user prompt first line`
   - `updatedAt = now`
2. Store the user `MessageRecord` before sending to Copilot SDK.
3. When `assistant.message_delta` arrives, update the active assistant message preview and the thread preview.
4. When `session.idle` arrives, mark the thread idle and persist final title/preview.
5. When an error arrives, mark only the current run failed. Keep previous messages readable.

UI behavior:

- Thread list renders instantly from cached summaries.
- Active thread messages render from `GET /api/threads/:threadId/messages`.
- Search filters title, preview, and optional tags; full semantic search can come later.
- For long chats, load newest messages first and page upward.

Important SDK boundary:

- GitHub Copilot SDK exposes `client.listSessions()` for session metadata.
- The SDK docs do not expose a reliable `listMessages()` bulk history API in the current package.
- Therefore the app must maintain its own `MessageRecord` and `EventRecord` store from SDK events.
- Use `listSessions()` only to reconcile Copilot session existence, not as the UI message database.

## 6. Resume Design

Resume has two layers:

1. UI resume: reload our saved thread/messages/artifacts immediately.
2. SDK resume: reconnect to the existing Copilot session so new messages continue in the same agent context.

Resume API:

```txt
POST /api/threads/:threadId/resume
→ {
  thread: ThreadSummary,
  messages: MessageRecord[],
  artifacts: ArtifactRecord[],
  connection: { status: "resumed" | "created" | "read-only", copilotSessionId?: string }
}
```

Resume flow:

1. Frontend opens `threadId`.
2. Server loads `ThreadSummary`, `MessageRecord[]`, and `ArtifactRecord[]`.
3. UI paints saved content immediately.
4. If `copilotSessionId` exists, server calls `client.resumeSession(copilotSessionId, config)`.
5. If resume succeeds, attach SDK event listeners and return `connection.status = "resumed"`.
6. If resume fails but messages exist, return `connection.status = "read-only"` and let the next user send create a new Copilot session fork.
7. If there is no `copilotSessionId`, create a new session on first send and bind it to the thread.

Session binding:

```ts
export type ThreadSessionBinding = {
  threadId: string
  copilotSessionId: string
  cwd: string
  model: string
  tools: string[]
  createdAt: string
  lastResumedAt: string
}
```

When the user sends after resume:

```txt
POST /api/threads/:threadId/messages
body: { prompt, attachments, model, reasoningEffort, tools }

server:
  binding = loadBinding(threadId)
  session = binding ? resumeSession(binding.copilotSessionId) : createSession()
  messageId = await session.send({ prompt, attachments, mode: "immediate" })
  stream SDK events into EventRecord + SSE
```

Why this matters:

- The UI can always show old messages even when Copilot CLI is offline.
- Copilot context continues only when `resumeSession()` succeeds.
- A failed resume does not delete the chat. It only changes the next send into a fork/new session.

## 7. Copilot SDK Runtime

Server should own a long-lived `CopilotClient`:

```ts
const client = new CopilotClient({
  cliPath: process.env.COPILOT_CLI_PATH,
  logLevel: "error",
  useLoggedInUser: true,
})

await client.start()
```

Session creation:

```ts
const session = await client.createSession({
  model,
  reasoningEffort,
  streaming: true,
  workingDirectory: cwd,
  tools,
  onPermissionRequest,
  hooks,
})
```

Events to normalize:

| SDK Event | UI Record |
| --- | --- |
| `user.message` | confirmed user message |
| `assistant.message_delta` | streaming text part |
| `assistant.message` | final assistant message |
| `assistant.reasoning_delta` | transient thinking indicator |
| `assistant.reasoning` | collapsible reasoning summary |
| `tool.execution_start` | running tool row |
| `tool.execution_complete` | completed tool row + artifacts/sources |
| `session.idle` | run complete, thread idle |
| `session.updated` lifecycle | invalidate thread summary cache |

Frontend event stream:

```txt
GET /api/threads/:threadId/runs/:runId/events
Accept: text/event-stream

event: message.delta
data: { messageId, textDelta }

event: tool.update
data: { toolCallId, name, status, summary }

event: artifact.update
data: { artifactId, kind, title, contentDelta, status }

event: run.idle
data: { runId }
```

Use SSE first. WebSocket is only needed when the client must send control messages mid-run.

## 8. Prompt, Files, Models, Tools

Prompt composer requirements:

- Textarea grows but remains visually stable.
- Upload supports drag/drop, paste, and file picker.
- Attachments appear as chips above the input.
- Submit button shows running state and can stop a run.
- Model selector includes model and reasoning effort.
- Tool picker exposes `search`, `read`, `shell`, `url`, `write`, `github`.

Send payload:

```ts
export type SendMessagePayload = {
  threadId?: string
  prompt: string
  model: string
  reasoningEffort?: "low" | "medium" | "high" | "xhigh"
  cwd: string
  tools: Array<"search" | "read" | "shell" | "url" | "write" | "github">
  attachments: Array<{
    name: string
    mimeType: string
    size: number
    content?: string
    uploadId?: string
  }>
}
```

Attachment handling:

- Browser uploads to server first.
- Server stores temporary files under `.copilot-uploads/`.
- SDK send uses `attachments: [{ type: "file", path }]` when possible.
- For image blobs, use SDK blob attachments only when direct file persistence is not available.

Tool safety:

- `read`, `search`, `url` default on.
- `shell`, `write`, `github` require visible toggles and per-run permission rules.
- Dangerous tool calls should render through `confirmation` before execution.

## 9. Artifacts

Artifacts are message parts with their own persisted records.

Kinds:

- `markdown`: rendered with markdown/GFM.
- `code`: rendered with `code-block` and copy action.
- `diff`: rendered as patch viewer.
- `terminal`: rendered with `terminal`.
- `chart`: rendered from a small JSON chart schema.
- `table`: rendered from structured rows/columns.
- `html`: rendered in sandboxed iframe.
- `component`: rendered only from an allow-listed component registry.
- `json`: rendered as inspectable structured data.

Chart schema:

```ts
export type ChartArtifact = {
  type: "bar" | "line" | "area" | "pie"
  title: string
  x: string
  y: string
  data: Array<Record<string, string | number>>
}
```

Generated UI rule:

- The model may emit `{ component: "HoldingsOverlapChart", props: {...} }`.
- The app maps that to a local allow-listed React component.
- Never evaluate arbitrary generated JSX or JavaScript.

Placement:

- Small artifacts render inline in the center stream.
- Click opens the right panel.
- Right panel can show preview, raw data, source/tool provenance, copy/download actions.

## 10. Implementation Order

1. Copy required shadcn.io AI source from `vendor/shadcn-io/source` into `src/components/ai`.
2. Add missing shadcn/ui primitives and normalize imports from `~/` to `@/`.
3. Build `ThreadStore` and `MessageStore` with local persistence.
4. Replace current one-shot `/api/copilot` with thread/session routes.
5. Add long-lived `CopilotClient` and `resumeSession()` support.
6. Add SSE event stream and normalize SDK events.
7. Wire prompt input, attachments, model selector, and tool picker.
8. Add artifact records and renderers.
9. Add right-side artifact detail panel.
10. Add tests for event normalization, resume fallback, and message list ordering.

## 11. Acceptance Criteria

- User can start a new chat and see the thread appear immediately in the left list.
- User can upload files and send them through Copilot SDK attachments.
- Streaming assistant text appears before final completion.
- Thinking state appears while reasoning/tool work is running.
- Tool calls render as readable rows and become artifacts/sources when useful.
- Artifacts render inline and enlarge in the right panel when clicked.
- Refreshing the browser restores thread list and messages.
- Reopening a thread calls SDK `resumeSession()` when a Copilot session id exists.
- If SDK resume fails, old messages remain visible and the next send can fork into a new session.
- The copy appendix contains the shadcn.io AI component source without requiring CLI download.
