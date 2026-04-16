import { useRef, useState } from 'react'
import { ChevronDown, Paperclip, Search, SendHorizontal, SlidersHorizontal, TerminalSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupTextarea } from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import type { UploadedFile } from '@/data/workspace'
import { cn } from '@/lib/utils'
import './ai-prompt-input.css'

type PromptMode = 'Auto' | 'Agent' | 'Manual'

type AiPromptInputProps = {
  attachedFiles: UploadedFile[]
  disabled?: boolean
  model: string
  onAttachFiles: (files: UploadedFile[]) => void
  onSubmit: (prompt: string, mode: PromptMode) => void
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
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState<PromptMode>('Auto')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const usage = Math.min(100, Math.round(((prompt.length + attachedFiles.reduce((total, file) => total + file.content.length, 0)) / 12000) * 100))

  function submitPrompt() {
    const trimmedPrompt = prompt.trim()

    if (!trimmedPrompt || disabled) {
      return
    }

    onSubmit(trimmedPrompt, mode)
    setPrompt('')
  }

  return (
    <div className="ai-prompt">
      <div className="ai-prompt__header">
        <div>
          <p className="ai-prompt__eyebrow">Prompt</p>
          <h3 className="ai-prompt__title">{runtime === 'sdk' ? 'Copilot SDK input' : 'Copilot fallback input'}</h3>
        </div>
        <div className="ai-prompt__meta">
          <span>{model}</span>
          <span>{usage}% used</span>
        </div>
      </div>
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
        <InputGroupTextarea
          aria-label="Prompt"
          className="ai-prompt__textarea"
          disabled={disabled}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              submitPrompt()
            }
          }}
          placeholder="Ask Copilot to search, inspect files, draft an artifact, or patch the workspace..."
          value={prompt}
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
                <InputGroupButton variant="outline">
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
            <InputGroupText className="hidden sm:flex">
              <Search />
              Tooling ready
            </InputGroupText>
            <InputGroupText className="hidden md:flex">
              <TerminalSquare />
              {runtime === 'sdk' ? 'Copilot SDK' : 'CLI fallback'}
            </InputGroupText>
          </div>
          <div className="ai-prompt__actions">
            <InputGroupText className={cn('ai-prompt__usage', usage > 70 && 'text-foreground')}>{usage}% used</InputGroupText>
            <Separator className="h-5" orientation="vertical" />
            <InputGroupText className="hidden md:flex">{model}</InputGroupText>
            <Button className="ai-prompt__send" disabled={disabled || !prompt.trim()} onClick={submitPrompt} size="icon" type="button">
              <SendHorizontal data-icon="inline-start" />
              <span className="sr-only">Send prompt</span>
            </Button>
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}
