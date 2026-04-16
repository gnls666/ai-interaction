# Copilot SDK Dual Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive `/api/copilot` with `@github/copilot-sdk` first and keep the existing CLI execution path as an automatic fallback.

**Architecture:** Add a focused server runtime module for SDK session execution, event-to-timeline mapping, and fallback orchestration. Keep the HTTP handler and React client contract stable so the UI keeps working while the execution core changes.

**Tech Stack:** Node.js, Vite, Vitest, GitHub Copilot SDK, existing Copilot CLI

---

### Task 1: Add failing tests for the new runtime behavior

**Files:**
- Create: `server/copilot-runtime.test.ts`
- Create: `server/copilot-runtime.mjs`

- [ ] **Step 1: Write failing tests for SDK event mapping and CLI fallback**
- [ ] **Step 2: Run `pnpm test server/copilot-runtime.test.ts` and verify the new tests fail for the missing runtime module**

### Task 2: Implement the SDK runtime module

**Files:**
- Modify: `server/copilot-runtime.mjs`

- [ ] **Step 1: Add SDK session configuration helpers and permission gating**
- [ ] **Step 2: Add SDK event collection and mapping into existing timeline events**
- [ ] **Step 3: Add SDK-first / CLI-fallback orchestration**
- [ ] **Step 4: Run `pnpm test server/copilot-runtime.test.ts` and verify the tests pass**

### Task 3: Wire the HTTP server to the runtime module

**Files:**
- Modify: `server/copilot-server.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add `@github/copilot-sdk` to dependencies**
- [ ] **Step 2: Replace inline execution logic with runtime module calls**
- [ ] **Step 3: Keep the current response shape stable**

### Task 4: Refresh product copy and verification

**Files:**
- Modify: `src/App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Update UI/readme copy to reflect SDK-first runtime**
- [ ] **Step 2: Run `pnpm test`**
- [ ] **Step 3: Run `pnpm lint`**
- [ ] **Step 4: Run `pnpm build`**
