# ChatGPT Ultra Minimal UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the current workspace into a ChatGPT-like ultra-minimal interface with a calm centered conversation, quieter navigation, stronger composer, and collapsed full-thinking details.

**Architecture:** Keep the existing React app and token system, but recompose the layout around a conversation-first center column. Add assistant thinking metadata to timeline messages, then restyle the page and timeline so tools and artifacts read as secondary operational context instead of primary panels.

**Tech Stack:** React, Vite, TypeScript, Vitest, existing shadcn/ui primitives, current Copilot SDK runtime

---

### Task 1: Extend timeline data for thinking summaries

**Files:**
- Modify: `src/lib/timeline.ts`
- Modify: `src/lib/timeline.test.ts`
- Modify: `server/copilot-runtime.mjs`
- Modify: `server/copilot-runtime.test.ts`

- [ ] **Step 1: Write failing tests for assistant thinking metadata and summary extraction**
- [ ] **Step 2: Run `pnpm test src/lib/timeline.test.ts server/copilot-runtime.test.ts` and verify the new tests fail**
- [ ] **Step 3: Add message-level thinking summary and full thinking fields to the timeline model**
- [ ] **Step 4: Map SDK reasoning text and recent tool activity into those fields**
- [ ] **Step 5: Re-run `pnpm test src/lib/timeline.test.ts server/copilot-runtime.test.ts` and verify they pass**

### Task 2: Recompose the app shell around a centered conversation layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Remove the current hero-heavy frame structure and replace it with a quieter ChatGPT-like top row**
- [ ] **Step 2: Keep sidebar present but visually lighter and less dominant**
- [ ] **Step 3: Stop auto-opening the inspector after runs so the default state stays conversation-first**
- [ ] **Step 4: Rebuild center-column spacing, reading width, and bottom composer anchoring**

### Task 3: Rebuild message rendering and full-thinking disclosure

**Files:**
- Modify: `src/components/timeline-renderer.tsx`
- Modify: `src/components/inspector-panel.tsx`

- [ ] **Step 1: Convert assistant and user messages to cleaner chat-style rows**
- [ ] **Step 2: Render thinking summary inline under assistant turns**
- [ ] **Step 3: Add a collapsed `View full thinking` disclosure for complete reasoning text**
- [ ] **Step 4: Demote tool and artifact rows so they feel secondary and inspectable instead of loud cards**

### Task 4: Refine the composer and operational chrome

**Files:**
- Modify: `src/components/ai-prompt-input.tsx`
- Modify: `src/components/ai-prompt-input.css`

- [ ] **Step 1: Make the composer the dominant surface, closer to ChatGPT in shape and weight**
- [ ] **Step 2: Reduce label noise and move runtime/model hints into a quieter supporting role**
- [ ] **Step 3: Keep attachments, mode, and send affordances readable on mobile and desktop**

### Task 5: Verify finish quality and refresh template output

**Files:**
- Modify: `README.md` (only if wording needs to match the new UI)
- Modify: `templates/ai-interaction.template.json`

- [ ] **Step 1: Run `pnpm test`**
- [ ] **Step 2: Run `pnpm lint`**
- [ ] **Step 3: Run `pnpm build`**
- [ ] **Step 4: Run `pnpm template:pack`**
- [ ] **Step 5: Check the page in the browser and verify the Ultra Minimal direction actually reads like ChatGPT instead of the old workbench**
