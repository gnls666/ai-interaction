# ChatGPT Ultra Minimal UI Design

**Goal:** Rework the current Copilot workspace UI into a more ChatGPT-like, ultra-minimal conversation surface while preserving the existing design token system, SDK-first runtime, and artifact/tool workflow.

## Product Role

This page is a utility workspace, not a dashboard and not a landing page.

The primary job is:

1. let the user ask
2. let the assistant think and work
3. let the user inspect details only when needed

The page should feel like a calm conversation tool first, and an agent workbench second.

## Approved Direction

The chosen direction is **Ultra Minimal**.

### Style target

- restrained
- intelligent
- calm
- editorial
- precise

### Visual thesis

Use a ChatGPT-like, type-led conversation layout: quiet neutrals, wide breathing room, narrow reading width, minimal chrome, and only a small amount of visible operational metadata.

### Explicit avoid list

- glass-heavy surfaces
- decorative gradients as the main identity
- control-panel feeling
- always-visible inspector pressure
- large tool cards dominating the conversation
- visually noisy badges and pills

## Core Layout

### Desktop structure

```text
+---------------------------------------------------------------+
| sidebar (quiet) |                 top meta                    |
|                 |---------------------------------------------|
| threads         |                                             |
| search          |             centered conversation           |
| light nav       |             narrow reading width            |
|                 |                                             |
|                 |                   input                     |
+---------------------------------------------------------------+
```

### Region behavior

#### 1. Sidebar

- keep it present, but visually quieter than today
- use flatter surfaces
- reduce border/shadow drama
- active thread gets subtle emphasis, not a bright treatment
- make it feel like ChatGPT history navigation, not an app control rail

#### 2. Top meta row

- keep only small operational metadata
- show runtime state, model selector, and compact counters
- remove large hero treatment from the current page
- no decorative art block

#### 3. Main conversation column

- center the entire conversation
- use one deliberate reading width
- make message spacing do most of the visual work
- assistant output should read like content, not cards
- user messages can stay slightly surfaced, but very lightly

#### 4. Input composer

- fixed at the bottom of the main reading column
- becomes the strongest surface on the page
- should feel close to ChatGPT:
  - large radius
  - clean white surface
  - very light border
  - soft elevation
- attachment, mode, and runtime hints stay inside the composer bar with low noise

#### 5. Inspector / artifacts

- not always on screen
- only open when the user explicitly focuses an artifact or tool detail
- default state is conversation-first

## Message and Thinking Model

### Main rule

The conversation flow should show **thinking summary by default** and **full thinking on demand**.

The user explicitly chose:

- default: summary in the main flow
- expanded: complete thinking in a collapsible detail view

### Thinking presentation

#### Default in the message flow

Show a lightweight reasoning summary block directly under the assistant turn when the model is working.

Examples:

- reading parser
- checking duplicates
- drafting answer

This should look like a low-noise progress trace, not a code log and not a large bordered card.

#### Full thinking

Expose a clear affordance such as:

- `View full thinking`

When opened:

- expand inline below the summary or inside a detail drawer
- preserve formatting for long reasoning text
- clearly separate it from the final answer

### Tool events

Tool activity should still exist, but be visually demoted:

- inline progress chips or compact rows while active
- detail stays inspectable
- no large artifact-heavy interruption unless the user asks for it

## Surface System

### Surface direction

- dominant language: flat tonal separation
- one main page background
- one primary elevated surface: composer
- minimal shadow use
- borders stay soft and consistent

### Radius policy

- small and consistent
- avoid mixed radii
- use calm rounding, not pill overload

### Accent policy

- one primary accent only
- accent reserved for focus, selection, and primary action
- neutral tones should carry most of the page

## Typography

Typography should carry the hierarchy more than color.

### Type rules

- one strong display voice for key entry states only
- body text should feel editorial and easy to read
- metadata recedes through tone and weight, not tiny illegible sizes
- line length should stay comfortable across desktop and mobile

## Interaction Direction

### Motion thesis

Motion should only clarify context changes.

Allowed motion:

- subtle message reveal
- smooth open/close for full thinking
- gentle inspector entrance
- small state transitions on chips, buttons, and composer

Avoid:

- floating decorative motion
- ornamental shimmer
- motion that exists only to look busy

## Responsive Behavior

### Mobile

- sidebar becomes secondary or sheet-based
- center column stays dominant
- composer remains the anchor
- message spacing and reading width still need to feel designed, not simply stacked

## Implementation Boundaries

This redesign should preserve:

- current design tokens
- current shadcn-based component layer
- current SDK-first runtime
- current thread / tool / artifact data model where possible

This redesign should change:

- page composition
- visual hierarchy
- surface hierarchy
- thinking presentation
- artifact visibility defaults

## Validation

The redesign is only complete when it passes these checks:

1. the page feels conversation-first within one glance
2. the composer is the visual anchor
3. the sidebar no longer feels heavy
4. thinking summary is useful without flooding the page
5. full thinking is accessible without dominating the default state
6. desktop and mobile both feel intentional
