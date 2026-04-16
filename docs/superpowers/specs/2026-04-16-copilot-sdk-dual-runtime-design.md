# Copilot SDK Dual Runtime Design

**Goal:** Replace the local Copilot adapter's direct CLI spawning with a Copilot SDK driven runtime, while preserving the current HTTP contract and keeping the existing CLI path as an automatic fallback.

## Scope

This design only covers the first integration slice:

- keep `POST /api/copilot` unchanged
- keep the current front-end timeline contract unchanged
- run requests through `@github/copilot-sdk` first
- fall back to the existing CLI execution path when SDK startup or session execution fails

Out of scope for this slice:

- persistent session restore
- server-sent events or websocket streaming to the UI
- custom agents, skill packs, or MCP server authoring

## Architecture

The server will gain a small runtime module that owns three responsibilities:

1. build SDK session configuration from the existing request payload
2. collect SDK events and map them into the current `TimelineEvent[]` response shape
3. orchestrate runtime selection: SDK first, CLI fallback second

`server/copilot-server.mjs` remains the HTTP entry point. It will delegate execution to the new runtime module instead of embedding all execution logic inline.

## Runtime behavior

### Primary path: SDK

- create a `CopilotClient`
- create a session with:
  - selected model
  - working directory from the request
  - built-in tool availability derived from UI toggles
  - a permission handler that denies disabled tool classes
- send the prompt with file attachments
- collect:
  - final assistant messages
  - tool execution start/complete events
  - terminal-like tool outputs as artifact events

### Fallback path: CLI

If SDK initialization, session creation, or message execution throws:

- run the existing non-interactive CLI path
- prepend one diagnostic event indicating that runtime fell back to CLI and why

## Mapping rules

- `assistant.message` -> `message` timeline event
- `tool.execution_start` -> `tool` event with `running`
- `tool.execution_complete` -> `tool` event with `complete` or `failed`
- terminal content blocks in tool results -> `artifact` event with `artifactType: "terminal"`
- resource-like result blocks -> `artifact` event with `artifactType: "file"`

## Constraints

- no front-end protocol change in this slice
- no new persistence layer
- no speculative session reuse
- no broad refactor of current React state
