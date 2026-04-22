# Structured Prompt Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Ant Design X style structured prompt editor to the existing AI composer, with slash-triggered templates, inline slot inputs, and structured submit payloads without introducing Ant Design dependencies.

**Architecture:** Keep the existing `AiPromptInput` shell and replace the textarea core with a focused `contenteditable`-based editor. Use local template definitions plus a small serialization layer so the UI can submit both rendered prompt text and structured slot values while remaining compatible with the current Copilot runtime.

**Tech Stack:** React, Vite, TypeScript, Vitest, existing shadcn/ui primitives, current design tokens, existing Copilot runtime adapter

---

### Task 1: Lock the structured prompt data model with tests

**Files:**
- Create: `src/lib/structured-prompt.ts`
- Create: `src/lib/structured-prompt.test.ts`

- [ ] **Step 1: Write failing tests for template defaults, rendered text output, and trigger matching**
- [ ] **Step 2: Run `pnpm test src/lib/structured-prompt.test.ts` and verify the new tests fail**
- [ ] **Step 3: Implement the minimal template utilities to pass those tests**
- [ ] **Step 4: Re-run `pnpm test src/lib/structured-prompt.test.ts` and verify they pass**

### Task 2: Build the editor core and slash menu integration

**Files:**
- Create: `src/components/structured-prompt-editor.tsx`
- Create: `src/components/structured-prompt-editor.css`
- Modify: `src/components/ai-prompt-input.tsx`

- [ ] **Step 1: Add a `contenteditable` editor shell with free text before and after inline slots**
- [ ] **Step 2: Detect `/` and `@` trigger queries from the current caret context**
- [ ] **Step 3: Insert template nodes in place of the typed trigger text and focus the first editable slot**
- [ ] **Step 4: Expose submit-ready structured value output back to `AiPromptInput`**

### Task 3: Style the slot editor to match the current token system

**Files:**
- Modify: `src/components/ai-prompt-input.css`
- Modify: `src/App.css`
- Modify: `src/components/structured-prompt-editor.css`

- [ ] **Step 1: Give the editor a quieter ChatGPT-like surface while keeping the existing page structure**
- [ ] **Step 2: Style slots as inline controls that read as part of the sentence instead of form rows**
- [ ] **Step 3: Keep the slash menu and slot controls responsive on narrow widths**

### Task 4: Wire submit behavior into the current runtime path

**Files:**
- Modify: `src/components/ai-prompt-input.tsx`
- Modify: `src/App.tsx`
- Modify: `src/data/workspace.ts` (only if demo templates or preview data need extension)

- [ ] **Step 1: Submit rendered text to the existing runtime without breaking current calls**
- [ ] **Step 2: Keep structured slot data available in the composer for future SDK and tool integration**
- [ ] **Step 3: Preserve attachments, mode selection, and send keyboard shortcuts**

### Task 5: Verify end-to-end behavior and ship a local preview

**Files:**
- No planned source changes unless verification exposes a real bug

- [ ] **Step 1: Run `pnpm test`**
- [ ] **Step 2: Run `pnpm lint`**
- [ ] **Step 3: Run `pnpm build`**
- [ ] **Step 4: Start `pnpm dev` and verify the structured editor works in the browser**
