import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ComponentProps, type KeyboardEvent as ReactKeyboardEvent } from 'react'

import { Button } from '@/components/ui/button'
import { InputGroupTextarea } from '@/components/ui/input-group'
import {
  buildStructuredPromptSubmission,
  createTemplateSlotValues,
  matchTemplateTrigger,
  structuredPromptTemplates,
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

    const normalizedQuery = triggerState.query.toLowerCase()

    return structuredPromptTemplates.filter((template) => {
      if (template.trigger !== triggerState.trigger) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        template.keyword.toLowerCase().includes(normalizedQuery) ||
        template.label.toLowerCase().includes(normalizedQuery) ||
        template.description.toLowerCase().includes(normalizedQuery)
      )
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

          {triggerState && filteredTemplates.length > 0 ? (
            <div className="structured-editor__menu" role="listbox">
              <p className="structured-editor__menu-label">
                {triggerState.trigger === '/' ? 'Templates' : 'Agents'}
              </p>
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  className="structured-editor__menu-item"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    applyTemplate(template)
                  }}
                  type="button"
                >
                  <span className="structured-editor__menu-keyword">
                    {template.trigger}
                    {template.keyword}
                  </span>
                  <span className="structured-editor__menu-copy">
                    <span className="structured-editor__menu-title">{template.label}</span>
                    <span className="structured-editor__menu-description">{template.description}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="structured-editor__hint">
            Type <code>/</code> for templates or <code>@</code> for agent tags.
          </div>
        </div>
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
