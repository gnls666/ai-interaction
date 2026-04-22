# AntDX-Like Structured Prompt Input Solution

## 1. Goal

This document records the final approach for building an AI prompt input that:

- keeps the **outer experience** close to Ant Design X `Sender` / `Suggestion` / `Slot Mode`
- keeps the **inner implementation** on our own `shadcn/ui` stack
- keeps the **design token layer** on our existing `find etfs by holdings` token system
- supports:
  - slash commands
  - at commands
  - structured slot filling
  - file upload
  - runtime / mode metadata
  - direct text submission

This document intentionally includes **copyable source code**, because the intended usage is not `shadcn` CLI fetch on another machine, but direct copy / paste into an existing project.

## 2. Core Principle

The solution is split into two layers:

```text
[ AntDX-like shell ]
  - sender silhouette
  - spacing rhythm
  - popup placement
  - inline slot density
  - unified bottom action row

[ shadcn/ui internals ]
  - Popover
  - Command
  - InputGroup
  - Button
  - Select
  - custom structured prompt editor
```

This is the key design boundary:

- **Do not** import or depend on Ant Design X
- **Do not** replicate Ant Design X DOM structure 1:1
- **Do** replicate the interaction model and visual rhythm
- **Do** keep all primitives inside our own component system

## 3. UI Target

ASCII target:

```text
┌──────────────────────────────────────────────────────────────┐
│ Compare [ ETF A ] and [ ETF B ] between [ date ] and [ date ]│
│ across the top [ 10 ] holdings                              │
│                                                              │
│ Attach      Auto                                     Send    │
└──────────────────────────────────────────────────────────────┘

    /overlap      ETF overlap
    /holdings     Holdings drilldown
    @workspace    Workspace agent
```

The shell should feel close to AntDX:

- one unified sender surface
- low-contrast border
- restrained shadow
- top text area + bottom controls in one container
- popup aligned to the left edge of the input surface
- slot inputs treated as inline prompt tokens, not as regular form blocks

## 4. File Map

### Core files

- `src/components/ai-prompt-input.tsx`
  - outer prompt shell
  - attach button
  - mode selector
  - send button
  - usage / runtime metadata

- `src/components/ai-prompt-input.css`
  - AntDX-like sender shell styling
  - button density
  - send button appearance
  - textarea width / alignment fix

- `src/components/prompt/structured-prompt-editor.tsx`
  - dual-mode editor
  - plain draft mode
  - structured template mode
  - slash/@ trigger detection
  - structured submission generation

- `src/components/prompt/structured-prompt-editor.css`
  - suggestion popup styling
  - slot styling
  - inline editor density
  - template chip / token treatment

- `src/components/prompt/template-command-menu.tsx`
  - popup menu for slash and at commands
  - built with `Popover + Command`

- `src/lib/structured-prompt.ts`
  - template schema
  - trigger matching
  - filtering
  - slot defaults
  - final structured payload build

### Required shadcn-style primitives

- `src/components/ui/command.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/input-group.tsx`

### Integration point

- `src/App.tsx`
  - mounts `AiPromptInput` into the main chat layout

### Guard file

- `src/lib/structured-prompt.test.ts`
  - template defaults
  - trigger parsing
  - submission serialization
  - slash vs at separation

## 5. Functional Model

## 5.1 Plain prompt mode

When no template is active:

- input is a textarea
- user types natural language
- `/` or `@` near caret activates trigger detection
- `TemplateCommandMenu` opens above the input

## 5.2 Structured prompt mode

When a template is selected:

- draft textarea is replaced by a structured surface
- template text is rendered inline
- slots become inputs / selects / dates
- user can still type free text **before** and **after** the template
- final submit produces:
  - flattened prompt text
  - structured slot object

## 5.3 Submission contract

The output is always shaped like:

```ts
type StructuredPromptSubmission = {
  templateId: string
  text: string
  slots: Record<string, string>
}
```

Example:

```ts
{
  templateId: "etf-overlap",
  text: "Please help. Compare SPY and QQQ between 2026-01-01 and 2026-03-31 across the top 15 holdings. Focus on only overlapping names.",
  slots: {
    benchmarkA: "SPY",
    benchmarkB: "QQQ",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    topN: "15"
  }
}
```

This separation is important:

- `text` goes to Copilot runtime or any LLM runtime
- `slots` stay available for tool routing, validation, or analytics

## 6. Slash / At Command Design

## 6.1 Trigger detection

Trigger detection is intentionally simple:

- only check text before the caret
- only accept terminal token patterns:
  - `/xxx`
  - `@xxx`
- reject invalid path / URL style usage

Regex logic:

```ts
const token = textBeforeCaret.match(/(^|\s)([/@][^\s]*)$/)
```

Then:

- `trigger` is `/` or `@`
- `query` is the remaining string
- `from` marks where the replacement starts

## 6.2 Why filtering is not delegated to `cmdk`

`Command` is used as a UI primitive only.

Filtering is done in app logic because we need:

- slash templates separated from at templates
- exact control over keyword / label matching
- deterministic behavior independent of `cmdk` fuzzy heuristics

That is why `Command` uses:

```tsx
shouldFilter={false}
```

and the filtered list is supplied manually.

## 6.3 Replacement behavior

When a template is selected:

- prompt text before the trigger becomes `prefixText`
- prompt text after the caret becomes `suffixText`
- template slot defaults are initialized
- the draft textarea is cleared
- focus moves to the first slot

This mimics the practical behavior of AntDX slot insertion without depending on its implementation.

## 7. Important Implementation Decisions

## 7.1 Keep the outer shell close to AntDX

The shell styling is not generic shadcn default styling.

It intentionally does the following:

- merges input body and action row visually
- removes the feeling of a separate toolbar card
- keeps controls low-emphasis
- gives send button stronger emphasis

This produces AntDX-like sender behavior while the inside still uses our own primitives.

## 7.2 Keep internals on shadcn/ui

These are the actual primitives used:

- `Popover`
- `Command`
- `InputGroup`
- `Button`
- `DropdownMenu`

So the implementation remains portable inside a shadcn codebase.

## 7.3 Fix width collapse explicitly

One concrete bug in the implementation was width collapse caused by textarea content sizing.

The fix is:

```css
.ai-prompt__textarea {
  width: 100%;
  field-sizing: fixed;
}
```

Without this, the real editor width can collapse to the content width, which breaks:

- left alignment
- popup anchor placement
- visual shell balance

## 7.4 Use free text before and after template

Structured prompts should not force the whole prompt to become a rigid form.

That is why the editor keeps:

- `prefixText`
- template nodes
- `suffixText`

This is the closest useful equivalent to AntDX slot mode for a chat composer.

## 8. Integration Position

The composer is mounted inside the center column of the chat layout:

```tsx
<div className="ai-composer">
  <AiPromptInput
    attachedFiles={uploadedFiles}
    disabled={isRunning}
    model={model}
    onAttachFiles={(files) => setUploadedFiles((currentFiles) => [...currentFiles, ...files])}
    onSubmit={submitPrompt}
    runtime={lastRuntime}
  />
</div>
```

This placement is correct because:

- message history stays above
- artifacts remain in the stream / inspector system
- the composer remains visually anchored to the bottom like ChatGPT / Copilot / AntDX sender layouts

## 9. Source Appendix

## 9.1 `src/lib/structured-prompt.ts`

```ts
export type StructuredPromptSlotType = 'input' | 'number' | 'select' | 'date'

export type StructuredPromptNode =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'slot'
      key: string
      slotType: StructuredPromptSlotType
      placeholder: string
      options?: string[]
      defaultValue?: string
    }

export type StructuredPromptTemplate = {
  id: string
  trigger: '/' | '@'
  keyword: string
  label: string
  description: string
  nodes: StructuredPromptNode[]
}

export type StructuredPromptSubmission = {
  templateId: string
  text: string
  slots: Record<string, string>
}

export const structuredPromptTemplates: StructuredPromptTemplate[] = [
  {
    id: 'etf-overlap',
    trigger: '/',
    keyword: 'overlap',
    label: 'ETF overlap',
    description: 'Compare two ETFs across a date range and top holdings count.',
    nodes: [
      { type: 'text', text: 'Compare ' },
      { type: 'slot', key: 'benchmarkA', slotType: 'input', placeholder: 'ETF A' },
      { type: 'text', text: ' and ' },
      { type: 'slot', key: 'benchmarkB', slotType: 'input', placeholder: 'ETF B' },
      { type: 'text', text: ' between ' },
      { type: 'slot', key: 'startDate', slotType: 'date', placeholder: 'Start date' },
      { type: 'text', text: ' and ' },
      { type: 'slot', key: 'endDate', slotType: 'date', placeholder: 'End date' },
      { type: 'text', text: ' across the top ' },
      { type: 'slot', key: 'topN', slotType: 'number', placeholder: 'Top N', defaultValue: '10' },
      { type: 'text', text: ' holdings.' },
    ],
  },
  {
    id: 'holdings-drilldown',
    trigger: '/',
    keyword: 'holdings',
    label: 'Holdings drilldown',
    description: 'Inspect a single ETF or basket over a chosen date window.',
    nodes: [
      { type: 'text', text: 'Analyze the holdings changes for ' },
      { type: 'slot', key: 'benchmark', slotType: 'input', placeholder: 'Ticker or basket' },
      { type: 'text', text: ' from ' },
      { type: 'slot', key: 'startDate', slotType: 'date', placeholder: 'Start date' },
      { type: 'text', text: ' to ' },
      { type: 'slot', key: 'endDate', slotType: 'date', placeholder: 'End date' },
      { type: 'text', text: '.' },
    ],
  },
  {
    id: 'workspace-agent',
    trigger: '@',
    keyword: 'workspace',
    label: 'Workspace agent',
    description: 'Route the request to the current repo-aware agent.',
    nodes: [{ type: 'text', text: '@workspace ' }],
  },
]

export function createTemplateSlotValues(template: StructuredPromptTemplate): Record<string, string> {
  return template.nodes.reduce<Record<string, string>>((values, node) => {
    if (node.type === 'slot') {
      values[node.key] = node.defaultValue ?? ''
    }

    return values
  }, {})
}

export function renderStructuredPrompt(
  template: StructuredPromptTemplate,
  slotValues: Record<string, string>,
): string {
  return normalizePromptWhitespace(
    template.nodes
      .map((node) => {
        if (node.type === 'text') {
          return node.text
        }

        return slotValues[node.key] ?? ''
      })
      .join(''),
  )
}

export function buildStructuredPromptSubmission({
  template,
  slotValues,
  prefixText = '',
  suffixText = '',
}: {
  template: StructuredPromptTemplate
  slotValues: Record<string, string>
  prefixText?: string
  suffixText?: string
}): StructuredPromptSubmission {
  return {
    templateId: template.id,
    text: normalizePromptWhitespace([prefixText, renderStructuredPrompt(template, slotValues), suffixText].join(' ')),
    slots: { ...slotValues },
  }
}

export function matchTemplateTrigger(text: string, caretIndex: number) {
  const textBeforeCaret = text.slice(0, caretIndex)
  const token = textBeforeCaret.match(/(^|\\s)([/@][^\\s]*)$/)

  if (!token) {
    return null
  }

  const raw = token[2]
  const trigger = raw[0] as '/' | '@'
  const query = raw.slice(1)

  if (!/^[a-zA-Z0-9_-]*$/.test(query)) {
    return null
  }

  return {
    trigger,
    query,
    from: caretIndex - raw.length,
  }
}

export function filterStructuredPromptTemplates({
  query,
  trigger,
}: {
  query: string
  trigger: '/' | '@'
}) {
  const normalizedQuery = query.trim().toLowerCase()

  return structuredPromptTemplates.filter((template) => {
    if (template.trigger !== trigger) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    return (
      template.keyword.toLowerCase().includes(normalizedQuery) ||
      template.label.toLowerCase().includes(normalizedQuery)
    )
  })
}

function normalizePromptWhitespace(value: string) {
  return value.replace(/\\s+/g, ' ').trim()
}
```

## 9.2 `src/components/prompt/template-command-menu.tsx`

```tsx
import type { ReactNode } from 'react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import type { StructuredPromptTemplate } from '@/lib/structured-prompt'

type TemplateCommandMenuProps = {
  children: ReactNode
  onSelect: (template: StructuredPromptTemplate) => void
  open: boolean
  query: string
  templates: StructuredPromptTemplate[]
  trigger: '/' | '@'
}

export function TemplateCommandMenu({
  children,
  onSelect,
  open,
  query,
  templates,
  trigger,
}: TemplateCommandMenuProps) {
  return (
    <Popover open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="start"
        className="structured-editor__popover"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="top"
        sideOffset={12}
      >
        <Command
          className="structured-editor__command"
          loop
          shouldFilter={false}
        >
          <div className="structured-editor__command-meta">
            <p className="structured-editor__menu-label">
              {trigger === '/' ? 'Templates' : 'Agents'}
            </p>
            <span className="structured-editor__menu-token">
              {trigger}
              {query || '...'}
            </span>
          </div>
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {templates.map((template) => (
                <CommandItem
                  key={template.id}
                  className="structured-editor__menu-item"
                  keywords={[template.keyword, template.label, template.description]}
                  onSelect={() => onSelect(template)}
                  value={`${template.trigger}${template.keyword}`}
                >
                  <span className="structured-editor__menu-keyword">
                    {template.trigger}
                    {template.keyword}
                  </span>
                  <span className="structured-editor__menu-copy">
                    <span className="structured-editor__menu-title">{template.label}</span>
                    <span className="structured-editor__menu-description">{template.description}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

## 9.3 `src/components/prompt/structured-prompt-editor.tsx`

```tsx
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { TemplateCommandMenu } from '@/components/prompt/template-command-menu'
import { Button } from '@/components/ui/button'
import { InputGroupTextarea } from '@/components/ui/input-group'
import {
  buildStructuredPromptSubmission,
  createTemplateSlotValues,
  filterStructuredPromptTemplates,
  matchTemplateTrigger,
  type StructuredPromptSubmission,
  type StructuredPromptTemplate,
} from '@/lib/structured-prompt'
import { cn } from '@/lib/utils'
import './structured-prompt-editor.css'

export type StructuredPromptEditorValue = {
  hasContent: boolean
  structured: StructuredPromptSubmission | null
  text: string
}

type StructuredPromptEditorProps = {
  disabled?: boolean
  onSubmitShortcut: () => void
  onValueChange: (value: StructuredPromptEditorValue) => void
  placeholder: string
}

type TriggerState = {
  caretIndex: number
  from: number
  query: string
  trigger: '/' | '@'
}

export function StructuredPromptEditor({
  disabled = false,
  onSubmitShortcut,
  onValueChange,
  placeholder,
}: StructuredPromptEditorProps) {
  const [draftText, setDraftText] = useState('')
  const [activeTemplate, setActiveTemplate] = useState<StructuredPromptTemplate | null>(null)
  const [prefixText, setPrefixText] = useState('')
  const [suffixText, setSuffixText] = useState('')
  const [slotValues, setSlotValues] = useState<Record<string, string>>({})
  const [triggerState, setTriggerState] = useState<TriggerState | null>(null)
  const draftRef = useRef<HTMLTextAreaElement | null>(null)
  const firstSlotKeyRef = useRef<string | null>(null)
  const slotInputRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({})

  const filteredTemplates = useMemo(() => {
    if (!triggerState) {
      return []
    }

    return filterStructuredPromptTemplates({
      query: triggerState.query,
      trigger: triggerState.trigger,
    })
  }, [triggerState])

  useEffect(() => {
    if (!activeTemplate) {
      const trimmedText = draftText.trim()

      onValueChange({
        hasContent: trimmedText.length > 0,
        structured: null,
        text: trimmedText,
      })
      return
    }

    const submission = buildStructuredPromptSubmission({
      template: activeTemplate,
      slotValues,
      prefixText,
      suffixText,
    })

    onValueChange({
      hasContent: submission.text.length > 0,
      structured: submission,
      text: submission.text,
    })
  }, [activeTemplate, draftText, onValueChange, prefixText, slotValues, suffixText])

  useEffect(() => {
    if (!activeTemplate) {
      return
    }

    const firstSlotKey = firstSlotKeyRef.current

    if (!firstSlotKey) {
      return
    }

    const element = slotInputRefs.current[firstSlotKey]

    if (element) {
      element.focus()
      if (element instanceof HTMLInputElement) {
        element.select()
      }
    }
  }, [activeTemplate])

  function syncTriggerState(nextText: string, caretIndex: number) {
    const nextTrigger = matchTemplateTrigger(nextText, caretIndex)

    if (!nextTrigger) {
      setTriggerState(null)
      return
    }

    setTriggerState({
      ...nextTrigger,
      caretIndex,
    })
  }

  function applyTemplate(template: StructuredPromptTemplate) {
    if (!triggerState) {
      return
    }

    const before = draftText.slice(0, triggerState.from).trim()
    const after = draftText.slice(triggerState.caretIndex).trim()
    const defaults = createTemplateSlotValues(template)
    const firstSlot = template.nodes.find((node) => node.type === 'slot')

    firstSlotKeyRef.current = firstSlot?.type === 'slot' ? firstSlot.key : null

    setActiveTemplate(template)
    setPrefixText(before)
    setSuffixText(after)
    setSlotValues(defaults)
    setTriggerState(null)
    setDraftText('')
  }

  function clearTemplate() {
    if (!activeTemplate) {
      return
    }

    const mergedDraft = buildStructuredPromptSubmission({
      template: activeTemplate,
      slotValues,
      prefixText,
      suffixText,
    }).text

    setDraftText(mergedDraft)
    setActiveTemplate(null)
    setPrefixText('')
    setSuffixText('')
    setSlotValues({})
    setTriggerState(null)

    requestAnimationFrame(() => {
      const textarea = draftRef.current

      if (!textarea) {
        return
      }

      textarea.focus()
      textarea.setSelectionRange(mergedDraft.length, mergedDraft.length)
    })
  }

  function handleDraftShortcut(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSubmitShortcut()
      return
    }

    if (event.key === 'Escape') {
      setTriggerState(null)
      return
    }

    if (event.key === 'Tab' && filteredTemplates.length > 0 && triggerState) {
      event.preventDefault()
      applyTemplate(filteredTemplates[0])
    }
  }

  function handleStructuredShortcut(event: ReactKeyboardEvent<HTMLElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      onSubmitShortcut()
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  return (
    <div className="structured-editor">
      {!activeTemplate ? (
        <TemplateCommandMenu
          onSelect={applyTemplate}
          open={Boolean(triggerState)}
          query={triggerState?.query ?? ''}
          templates={filteredTemplates}
          trigger={triggerState?.trigger ?? '/'}
        >
          <div className="structured-editor__draft">
            <InputGroupTextarea
              ref={draftRef}
              aria-label="Prompt"
              className="ai-prompt__textarea"
              disabled={disabled}
              onChange={(event) => {
                const nextText = event.target.value
                const nextCaretIndex = event.target.selectionStart ?? nextText.length

                setDraftText(nextText)
                syncTriggerState(nextText, nextCaretIndex)
              }}
              onKeyDown={handleDraftShortcut}
              onKeyUp={(event) => {
                syncTriggerState(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)
              }}
              onSelect={(event) => {
                syncTriggerState(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)
              }}
              placeholder={placeholder}
              value={draftText}
            />

            <div className="structured-editor__hint">
              Type <code>/</code> for templates or <code>@</code> for agent tags.
            </div>
          </div>
        </TemplateCommandMenu>
      ) : (
        <div className="structured-editor__surface" data-slot="input-group-control">
          <div className="structured-editor__template-meta">
            <span className="structured-editor__template-chip">{activeTemplate.label}</span>
            <Button disabled={disabled} onClick={clearTemplate} size="icon-sm" type="button" variant="ghost">
              <X data-icon="inline-start" />
              <span className="sr-only">Remove template</span>
            </Button>
          </div>

          <div className="structured-editor__canvas">
            <EditableInlineText
              className="structured-editor__segment structured-editor__segment--prefix"
              data-slot="input-group-control"
              disabled={disabled}
              onChange={setPrefixText}
              onKeyDown={handleStructuredShortcut}
              placeholder="Add context before the template"
              value={prefixText}
            />

            {activeTemplate.nodes.map((node, index) => {
              if (node.type === 'text') {
                return (
                  <span key={`${activeTemplate.id}-text-${index}`} className="structured-editor__text">
                    {node.text}
                  </span>
                )
              }

              if (node.slotType === 'select') {
                return (
                  <label key={node.key} className="structured-editor__slot-shell">
                    <span className="sr-only">{node.placeholder}</span>
                    <select
                      ref={(element) => {
                        slotInputRefs.current[node.key] = element
                      }}
                      className={cn('structured-editor__slot', 'structured-editor__slot--select')}
                      data-slot="input-group-control"
                      disabled={disabled}
                      onChange={(event) =>
                        setSlotValues((currentValues) => ({
                          ...currentValues,
                          [node.key]: event.target.value,
                        }))
                      }
                      onKeyDown={handleStructuredShortcut}
                      value={slotValues[node.key] ?? ''}
                    >
                      <option value="">{node.placeholder}</option>
                      {node.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              }

              return (
                <label key={node.key} className="structured-editor__slot-shell">
                  <span className="sr-only">{node.placeholder}</span>
                  <input
                    ref={(element) => {
                      slotInputRefs.current[node.key] = element
                    }}
                    className={cn(
                      'structured-editor__slot',
                      node.slotType === 'date' && 'structured-editor__slot--date',
                    )}
                    data-slot="input-group-control"
                    disabled={disabled}
                    inputMode={node.slotType === 'number' ? 'numeric' : undefined}
                    onChange={(event) =>
                      setSlotValues((currentValues) => ({
                        ...currentValues,
                        [node.key]: event.target.value,
                      }))
                    }
                    onKeyDown={handleStructuredShortcut}
                    placeholder={node.placeholder}
                    type={node.slotType === 'number' ? 'number' : node.slotType === 'date' ? 'date' : 'text'}
                    value={slotValues[node.key] ?? ''}
                  />
                </label>
              )
            })}

            <EditableInlineText
              className="structured-editor__segment structured-editor__segment--suffix"
              data-slot="input-group-control"
              disabled={disabled}
              onChange={setSuffixText}
              onKeyDown={handleStructuredShortcut}
              placeholder="Add context after the template"
              value={suffixText}
            />
          </div>
        </div>
      )}
    </div>
  )
}

type EditableInlineTextProps = {
  className?: string
  disabled?: boolean
  onChange: (value: string) => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
  placeholder: string
  value: string
} & Omit<ComponentProps<'span'>, 'children' | 'onChange' | 'onKeyDown'>

function EditableInlineText({
  className,
  disabled = false,
  onChange,
  onKeyDown,
  placeholder,
  value,
  ...props
}: EditableInlineTextProps) {
  const elementRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const element = elementRef.current

    if (!element) {
      return
    }

    if (document.activeElement === element) {
      return
    }

    if ((element.textContent ?? '') !== value) {
      element.textContent = value
    }
  }, [value])

  return (
    <span
      {...props}
      ref={elementRef}
      aria-label={placeholder}
      className={cn(className, !(value || '').trim() && 'structured-editor__segment--empty')}
      contentEditable={!disabled}
      data-placeholder={placeholder}
      onInput={(event) => onChange(event.currentTarget.textContent ?? '')}
      onKeyDown={onKeyDown}
      role="textbox"
      suppressContentEditableWarning
      tabIndex={disabled ? -1 : 0}
    />
  )
}
```

## 9.4 `src/components/ai-prompt-input.tsx`

```tsx
import { useRef, useState } from 'react'
import { ChevronDown, Paperclip, SendHorizontal, SlidersHorizontal } from 'lucide-react'

import { StructuredPromptEditor, type StructuredPromptEditorValue } from '@/components/prompt/structured-prompt-editor'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText } from '@/components/ui/input-group'
import type { UploadedFile } from '@/data/workspace'
import type { StructuredPromptSubmission } from '@/lib/structured-prompt'
import { cn } from '@/lib/utils'
import './ai-prompt-input.css'

type PromptMode = 'Auto' | 'Agent' | 'Manual'

type AiPromptInputProps = {
  attachedFiles: UploadedFile[]
  disabled?: boolean
  model: string
  onAttachFiles: (files: UploadedFile[]) => void
  onSubmit: (prompt: string, mode: PromptMode, structured: StructuredPromptSubmission | null) => void
  runtime: 'sdk' | 'cli'
}

const promptModes: PromptMode[] = ['Auto', 'Agent', 'Manual']

async function readFiles(files: FileList): Promise<UploadedFile[]> {
  return Promise.all(
    Array.from(files).map(async (file) => ({
      id: `${file.name}-${file.lastModified}`,
      name: file.name,
      size: file.size,
      content: await file.text(),
    }))
  )
}

export function AiPromptInput({ attachedFiles, disabled = false, model, onAttachFiles, onSubmit, runtime }: AiPromptInputProps) {
  const [mode, setMode] = useState<PromptMode>('Auto')
  const [editorValue, setEditorValue] = useState<StructuredPromptEditorValue>({
    hasContent: false,
    structured: null,
    text: '',
  })
  const [editorInstanceKey, setEditorInstanceKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const usage = Math.min(
    100,
    Math.round(((editorValue.text.length + attachedFiles.reduce((total, file) => total + file.content.length, 0)) / 12000) * 100),
  )

  function submitPrompt() {
    const trimmedPrompt = editorValue.text.trim()

    if (!trimmedPrompt || disabled) {
      return
    }

    onSubmit(trimmedPrompt, mode, editorValue.structured)
    setEditorValue({
      hasContent: false,
      structured: null,
      text: '',
    })
    setEditorInstanceKey((currentValue) => currentValue + 1)
  }

  return (
    <div className="ai-prompt">
      {attachedFiles.length > 0 ? (
        <div className="ai-prompt__files">
          {attachedFiles.map((file) => (
            <span
              key={file.id}
              className="ai-prompt__file"
            >
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
      <InputGroup className="ai-prompt__group">
        <StructuredPromptEditor
          key={editorInstanceKey}
          disabled={disabled}
          onSubmitShortcut={submitPrompt}
          onValueChange={setEditorValue}
          placeholder="Message Copilot about this workspace..."
        />
        <InputGroupAddon align="block-end" className="ai-prompt__bar">
          <div className="ai-prompt__tools">
            <input
              ref={fileInputRef}
              className="sr-only"
              multiple
              onChange={async (event) => {
                if (event.target.files) {
                  onAttachFiles(await readFiles(event.target.files))
                }
              }}
              type="file"
            />
            <InputGroupButton aria-label="Attach files" onClick={() => fileInputRef.current?.click()} variant="outline">
              <Paperclip data-icon="inline-start" />
              Attach
            </InputGroupButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <InputGroupButton className="ai-prompt__mode-trigger" variant="outline">
                  <SlidersHorizontal data-icon="inline-start" />
                  {mode}
                  <ChevronDown data-icon="inline-end" />
                </InputGroupButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-[var(--ds-radius-md)]">
                <DropdownMenuLabel>Execution mode</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {promptModes.map((option) => (
                  <DropdownMenuItem key={option} onClick={() => setMode(option)}>
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {attachedFiles.length > 0 ? (
              <InputGroupText className="hidden sm:flex">{attachedFiles.length} file{attachedFiles.length === 1 ? '' : 's'}</InputGroupText>
            ) : null}
          </div>
          <div className="ai-prompt__actions">
            <InputGroupText className="hidden md:flex">{runtime === 'sdk' ? 'SDK' : 'CLI'} · {model}</InputGroupText>
            {editorValue.structured ? (
              <InputGroupText className="hidden md:flex">Template · {editorValue.structured.templateId}</InputGroupText>
            ) : null}
            <InputGroupText className={cn('ai-prompt__usage', usage > 70 && 'text-foreground')}>{usage}%</InputGroupText>
            <Button
              className="ai-prompt__send"
              disabled={disabled || !editorValue.hasContent}
              onClick={submitPrompt}
              size="icon"
              type="button"
            >
              <SendHorizontal data-icon="inline-start" />
              <span className="sr-only">Send prompt</span>
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
```

## 9.5 `src/components/ui/input-group.tsx`

```tsx
"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
        "inline-end":
          "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

const InputGroupTextarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        data-slot="input-group-control"
        className={cn(
          "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
          className
        )}
        {...props}
      />
    )
  }
)

InputGroupTextarea.displayName = "InputGroupTextarea"

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
}
```

## 9.6 `src/components/ui/command.tsx`

```tsx
import * as React from "react"
import { CheckIcon, SearchIcon } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn(
          "top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0",
          className
        )}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-8! rounded-lg! border-input/30 bg-input/30 shadow-none! *:data-[slot=input-group-addon]:pl-2!">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "w-full text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <SearchIcon className="size-4 shrink-0 opacity-50" />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none",
        className
      )}
      {...props}
    />
  )
}

function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center text-sm", className)}
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/command-item relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <CheckIcon className="ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
}
```

## 9.7 `src/components/ui/popover.tsx`

```tsx
import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      {...props}
    />
  )
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...props}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
```

## 9.8 `src/components/ai-prompt-input.css`

```css
.ai-prompt {
  display: flex;
  width: 100%;
  max-width: 52rem;
  flex-direction: column;
  gap: var(--space-s);
  margin-inline: auto;
}

.ai-prompt__files {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xxs-2);
  padding-inline: var(--space-xxs-2);
}

.ai-prompt__file {
  border: 1px solid rgba(0, 20, 63, 0.08);
  border-radius: 999px;
  padding: 0.35rem 0.72rem;
  background: rgba(248, 250, 253, 0.96);
  color: var(--ds-color-text-muted);
  font-size: var(--font-size-small);
}

.ai-prompt__group {
  min-height: 11.25rem;
  overflow: hidden;
  border-color: rgba(0, 20, 63, 0.08);
  border-radius: var(--ds-radius-md);
  background: rgba(255, 255, 255, 0.985);
  box-shadow:
    0 0.5rem 1.4rem rgba(0, 20, 63, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.72) inset;
}

.ai-prompt__group:focus-within {
  border-color: rgba(4, 97, 255, 0.16);
  box-shadow:
    0 0.75rem 1.8rem rgba(0, 20, 63, 0.06),
    0 0 0 3px rgba(4, 97, 255, 0.06);
}

.ai-prompt__textarea {
  display: block;
  width: 100%;
  min-height: 8.5rem;
  padding: var(--space-m) var(--space-m) var(--space-xs);
  color: var(--ds-color-text-primary);
  font-size: 1rem;
  text-align: left;
  line-height: 1.7;
  field-sizing: fixed;
}

.ai-prompt__textarea::placeholder {
  color: var(--ds-color-text-muted);
}

.ai-prompt__bar {
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-s);
  border-top: 0;
  padding: 0 var(--space-m) var(--space-s);
  background: transparent;
}

.ai-prompt__tools,
.ai-prompt__actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.ai-prompt__tools [data-size='xs'],
.ai-prompt__actions [data-size='xs'] {
  height: 1.9rem;
  border-radius: 999px;
}

.ai-prompt__tools [data-slot='button'] {
  border-color: rgba(0, 20, 63, 0.06);
  background: rgba(248, 250, 253, 0.88);
  color: var(--ds-color-text-muted);
}

.ai-prompt__tools [data-slot='button']:hover,
.ai-prompt__tools [data-slot='button'][data-state='open'] {
  background: rgba(244, 247, 252, 0.98);
  color: var(--ds-color-text-primary);
}

.ai-prompt__mode-trigger {
  min-width: 5.4rem;
  justify-content: space-between;
}

.ai-prompt__usage {
  min-width: auto;
  justify-content: center;
  color: var(--ds-color-text-subtle);
  font-size: 0.78rem;
}

.ai-prompt__send {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  color: var(--ds-color-text-inverse);
  background: var(--ds-color-ink);
  border-color: var(--ds-color-ink);
  box-shadow: none;
}

.ai-prompt__send:not(:disabled):hover {
  background: var(--ds-color-link-hover);
  border-color: var(--ds-color-link-hover);
}

@media (max-width: 599px) {
  .ai-prompt__group {
    min-height: 10rem;
  }

  .ai-prompt__textarea {
    min-height: 7rem;
    padding: var(--space-s);
  }

  .ai-prompt__bar {
    align-items: stretch;
    flex-direction: column;
    padding: 0 var(--space-s) var(--space-s);
  }

  .ai-prompt__actions {
    justify-content: space-between;
  }
}
```

## 9.9 `src/components/prompt/structured-prompt-editor.css`

```css
.structured-editor {
  position: relative;
  flex: 1 1 auto;
  align-self: stretch;
  width: 100%;
  min-width: 0;
}

.structured-editor__draft {
  position: relative;
  width: 100%;
  min-width: 0;
}

.structured-editor__popover {
  width: min(34rem, calc(100vw - 3rem));
  padding: 0.28rem;
  gap: 0;
  border-radius: var(--ds-radius-md);
  background: rgba(255, 255, 255, 0.985);
  box-shadow: 0 0.7rem 1.8rem rgba(0, 20, 63, 0.1);
}

.structured-editor__menu-label,
.structured-editor__hint {
  margin: 0;
  color: var(--ds-color-text-subtle);
  font-size: 0.74rem;
}

.structured-editor__hint {
  width: 100%;
  padding: 0 var(--space-m) var(--space-s);
  color: var(--ds-color-text-subtle);
}

.structured-editor__command {
  padding: 0;
  background: transparent;
}

.structured-editor__command-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-s);
  padding: 0.35rem 0.45rem 0.18rem;
}

.structured-editor__menu-token {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(0, 20, 63, 0.08);
  border-radius: 999px;
  padding: 0.18rem 0.52rem;
  background: rgba(246, 248, 251, 0.96);
  color: var(--ds-color-text-muted);
  font-size: 0.72rem;
  line-height: 1;
}

.structured-editor__hint code {
  padding: 0.08rem 0.32rem;
  border: 1px solid rgba(0, 20, 63, 0.08);
  border-radius: 999px;
  background: rgba(246, 248, 251, 0.96);
  color: var(--ds-color-text-muted);
  font-family: inherit;
}

.structured-editor__menu-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-s);
  min-height: 3rem;
  border-radius: calc(var(--ds-radius-md) - 2px) !important;
  padding: 0.62rem 0.72rem !important;
  white-space: normal !important;
  align-items: flex-start !important;
}

.structured-editor__menu-keyword {
  min-width: 5.8rem;
  color: var(--ds-color-link);
  font-size: 0.8rem;
  font-weight: var(--font-weight-bold);
}

.structured-editor__menu-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.12rem;
}

.structured-editor__menu-title {
  color: var(--ds-color-text-primary);
  font-size: 0.92rem;
  font-weight: var(--font-weight-bold);
}

.structured-editor__menu-description {
  color: var(--ds-color-text-muted);
  font-size: 0.8rem;
  line-height: 1.45;
}

.structured-editor__surface {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 8.25rem;
  flex-direction: column;
  gap: 0.7rem;
  padding: var(--space-m) var(--space-m) var(--space-xs);
}

.structured-editor__template-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.structured-editor__template-chip {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(4, 97, 255, 0.08);
  border-radius: 999px;
  padding: 0.26rem 0.62rem;
  background: rgba(4, 97, 255, 0.06);
  color: var(--ds-color-link);
  font-size: 0.74rem;
  font-weight: 600;
}

.structured-editor__canvas {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.32rem;
  color: var(--ds-color-text-primary);
  line-height: 1.7;
}

.structured-editor__text,
.structured-editor__segment {
  font-size: 1rem;
}

.structured-editor__segment {
  display: inline-block;
  min-width: 1.2ch;
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
}

.structured-editor__segment--prefix,
.structured-editor__segment--suffix {
  min-width: 3ch;
}

.structured-editor__segment--empty::before {
  content: attr(data-placeholder);
  color: var(--ds-color-text-muted);
}

.structured-editor__slot-shell {
  display: inline-flex;
  align-items: baseline;
}

.structured-editor__slot {
  min-width: 5.5rem;
  height: 1.8rem;
  border: 1px solid rgba(4, 97, 255, 0.08);
  border-radius: calc(var(--ds-radius-md) - 2px);
  padding: 0 0.52rem;
  background: rgba(4, 97, 255, 0.06);
  color: var(--ds-color-link);
  font: inherit;
  outline: none;
  box-shadow: none;
}

.structured-editor__slot:focus {
  border-color: rgba(4, 97, 255, 0.18);
  box-shadow: 0 0 0 2px rgba(4, 97, 255, 0.06);
}

.structured-editor__slot::placeholder {
  color: rgba(4, 97, 255, 0.38);
}

.structured-editor__slot--date {
  min-width: 8.4rem;
}

.structured-editor__slot--select {
  min-width: 7rem;
}

@media (max-width: 599px) {
  .structured-editor__popover {
    width: min(100vw - 2rem, 28rem);
  }

  .structured-editor__surface {
    min-height: 7rem;
    padding: var(--space-s);
  }

  .structured-editor__canvas {
    align-items: flex-start;
  }

  .structured-editor__slot,
  .structured-editor__slot--date,
  .structured-editor__slot--select {
    min-width: min(100%, 100%);
  }
}
```

## 9.10 `src/lib/structured-prompt.test.ts`

```ts
import { describe, expect, it } from 'vitest'

import {
  buildStructuredPromptSubmission,
  createTemplateSlotValues,
  filterStructuredPromptTemplates,
  matchTemplateTrigger,
  structuredPromptTemplates,
} from './structured-prompt'

describe('createTemplateSlotValues', () => {
  it('builds default slot values for the ETF overlap template', () => {
    const template = structuredPromptTemplates.find((item) => item.id === 'etf-overlap')

    expect(template).toBeDefined()
    expect(createTemplateSlotValues(template!)).toEqual({
      benchmarkA: '',
      benchmarkB: '',
      startDate: '',
      endDate: '',
      topN: '10',
    })
  })
})

describe('buildStructuredPromptSubmission', () => {
  it('renders text output and keeps structured slot data together', () => {
    const template = structuredPromptTemplates.find((item) => item.id === 'etf-overlap')

    const result = buildStructuredPromptSubmission({
      template: template!,
      slotValues: {
        benchmarkA: 'SPY',
        benchmarkB: 'QQQ',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        topN: '15',
      },
      prefixText: 'Please help.',
      suffixText: 'Focus on only overlapping names.',
    })

    expect(result).toEqual({
      templateId: 'etf-overlap',
      text:
        'Please help. Compare SPY and QQQ between 2026-01-01 and 2026-03-31 across the top 15 holdings. Focus on only overlapping names.',
      slots: {
        benchmarkA: 'SPY',
        benchmarkB: 'QQQ',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        topN: '15',
      },
    })
  })
})

describe('matchTemplateTrigger', () => {
  it('finds the active slash command at the caret', () => {
    expect(matchTemplateTrigger('Please run /ov', 'Please run /ov'.length)).toEqual({
      from: 11,
      query: 'ov',
      trigger: '/',
    })
  })

  it('ignores slash characters that are inside normal paths or URLs', () => {
    expect(matchTemplateTrigger('See /Users/demo/file.txt', 'See /Users/demo/file.txt'.length)).toBeNull()
    expect(matchTemplateTrigger('https://example.com/overlap', 'https://example.com/overlap'.length)).toBeNull()
  })
})

describe('filterStructuredPromptTemplates', () => {
  it('filters slash templates by query and trigger', () => {
    expect(
      filterStructuredPromptTemplates({
        query: 'ov',
        trigger: '/',
      }).map((template) => template.id),
    ).toEqual(['etf-overlap'])
  })

  it('keeps agent-style templates separate from slash templates', () => {
    expect(
      filterStructuredPromptTemplates({
        query: 'wo',
        trigger: '@',
      }).map((template) => template.id),
    ).toEqual(['workspace-agent'])
  })
})
```

## 9.11 `src/App.tsx` integration snippet

```tsx
<div className="ai-composer">
  <AiPromptInput
    attachedFiles={uploadedFiles}
    disabled={isRunning}
    model={model}
    onAttachFiles={(files) => setUploadedFiles((currentFiles) => [...currentFiles, ...files])}
    onSubmit={submitPrompt}
    runtime={lastRuntime}
  />
</div>
```

## 10. Recommended Next Steps

If this input is promoted into a reusable package or higher-level prompt system, the next clean improvements are:

1. extract templates into a dedicated registry file
2. add richer `@agent` templates
3. support grouped template sections in the command menu
4. support more slot types:
   - textarea
   - date range
   - multi-select
   - custom renderer
5. map `slots` directly into tool parameters for Copilot SDK runtime

The architectural direction should stay the same:

```text
AntDX-like shell outside
shadcn/ui primitives inside
structured payload emitted at submit time
```
