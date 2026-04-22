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
