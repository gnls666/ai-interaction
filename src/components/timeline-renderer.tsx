import { lazy, Suspense } from 'react'
import { Bot, FileText, Hammer, LoaderCircle, PanelRightOpen, UserRound } from 'lucide-react'

import type { MessageEvent, TimelineEvent } from '@/lib/timeline'
import { cn } from '@/lib/utils'

const MarkdownBlockInner = lazy(() =>
  import('@/components/markdown-block').then((module) => ({ default: module.MarkdownBlockInner }))
)

type PendingState = {
  summary: string[]
}

type TimelineRendererProps = {
  events: TimelineEvent[]
  pendingState?: PendingState | null
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TimelineRenderer({ events, pendingState = null, selectedId, onSelect }: TimelineRendererProps) {
  return (
    <div className="flex flex-col gap-[var(--space-l)]">
      {events.map((event) => (
        <TimelineEventView
          key={event.id}
          event={event}
          isSelected={event.id === selectedId}
          onSelect={() => onSelect(event.id)}
        />
      ))}

      {pendingState ? <PendingAssistantTurn summary={pendingState.summary} /> : null}
    </div>
  )
}

function TimelineEventView({
  event,
  isSelected,
  onSelect,
}: {
  event: TimelineEvent
  isSelected: boolean
  onSelect: () => void
}) {
  if (event.kind === 'message') {
    return <MessageTurn event={event} />
  }

  return <OperationalTurn event={event} isSelected={isSelected} onSelect={onSelect} />
}

function MessageTurn({ event }: { event: MessageEvent }) {
  const isUser = event.role === 'user'

  return (
    <article className={cn('flex gap-[var(--space-s)]', isUser && 'sm:justify-end')}>
      {!isUser ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:rgba(0,20,63,0.08)] bg-[color:rgba(248,250,253,0.96)] text-[color:var(--ds-color-text-primary)]">
          <Bot size={16} />
        </div>
      ) : null}

      <div className={cn('min-w-0', isUser ? 'max-w-full sm:max-w-[80%] lg:max-w-[76%]' : 'w-full')}>
        <p className="mb-[var(--space-xxs-2)] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[color:var(--ds-color-text-subtle)]">
          {isUser ? 'You' : 'Copilot'}
        </p>

        <div
          className={cn(
            'text-[0.99rem] leading-7 text-[color:var(--ds-color-text-primary)]',
            isUser &&
              'rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.08)] bg-[color:rgba(246,248,252,0.96)] px-[var(--space-s)] py-[var(--space-xs)]'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{event.content}</p>
        </div>

        {!isUser && event.thinkingSummary?.length ? <ThinkingBlock event={event} /> : null}
      </div>

      {isUser ? (
        <div className="hidden size-8 shrink-0 items-center justify-center rounded-full border border-[color:rgba(0,20,63,0.08)] bg-[color:rgba(248,250,253,0.96)] text-[color:var(--ds-color-text-primary)] sm:flex">
          <UserRound size={16} />
        </div>
      ) : null}
    </article>
  )
}

function ThinkingBlock({ event }: { event: MessageEvent }) {
  return (
    <div className="mt-[var(--space-s)] rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.07)] bg-[color:rgba(248,250,253,0.88)] px-[var(--space-s)] py-[var(--space-s)]">
      <p className="mb-[var(--space-xs)] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[color:var(--ds-color-text-subtle)]">
        Thinking
      </p>

      <ul className="flex list-none flex-col gap-[var(--space-xxs-2)] p-0 text-[0.9rem] leading-6 text-[color:var(--ds-color-text-muted)]">
        {event.thinkingSummary?.map((item) => (
          <li key={item} className="flex gap-[var(--space-xs)]">
            <span className="mt-[0.58rem] size-1 shrink-0 rounded-full bg-[color:var(--ds-color-link)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {event.thinkingContent ? (
        <details className="mt-[var(--space-s)] rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.08)] bg-white">
          <summary className="cursor-pointer list-none px-[var(--space-s)] py-[0.75rem] text-[0.85rem] font-medium text-[color:var(--ds-color-text-primary)] marker:hidden">
            View full thinking
          </summary>
          <pre className="overflow-auto border-t border-[color:rgba(0,20,63,0.06)] px-[var(--space-s)] py-[var(--space-s)] text-[0.8rem] leading-6 text-[color:var(--ds-color-text-muted)] whitespace-pre-wrap">
            {event.thinkingContent}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

function OperationalTurn({
  event,
  isSelected,
  onSelect,
}: {
  event: Exclude<TimelineEvent, MessageEvent>
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div className="pl-0 sm:pl-12">
      <button
        className={cn(
          'group flex w-full items-start justify-between gap-[var(--space-s)] rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.06)] bg-[color:rgba(250,251,253,0.88)] px-[var(--space-s)] py-[var(--space-s)] text-left transition-colors',
          'hover:border-[color:rgba(0,20,63,0.12)] hover:bg-white',
          isSelected && 'border-[color:rgba(4,97,255,0.18)] bg-white'
        )}
        onClick={onSelect}
        type="button"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-[var(--space-xs)] flex flex-wrap items-center gap-[var(--space-xs)] text-[0.76rem] uppercase tracking-[0.08em] text-[color:var(--ds-color-text-subtle)]">
            <span className="flex items-center gap-[0.4rem] text-[color:var(--ds-color-text-muted)]">
              {event.kind === 'tool' ? <Hammer size={14} /> : <FileText size={14} />}
              {event.title}
            </span>
            <span className="rounded-full border border-[color:rgba(0,20,63,0.08)] px-[0.45rem] py-[0.18rem]">
              {event.kind === 'tool' ? event.status : event.artifactType}
            </span>
          </div>

          <EventBody event={event} />
        </div>

        <div className="mt-[0.15rem] flex items-center gap-[0.35rem] text-[0.78rem] text-[color:var(--ds-color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
          <span>Open</span>
          <PanelRightOpen size={14} />
        </div>
      </button>
    </div>
  )
}

function PendingAssistantTurn({ summary }: PendingState) {
  return (
    <article className="flex gap-[var(--space-s)]">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[color:rgba(0,20,63,0.08)] bg-[color:rgba(248,250,253,0.96)] text-[color:var(--ds-color-text-primary)]">
        <LoaderCircle className="animate-spin" size={16} />
      </div>

      <div className="w-full">
        <p className="mb-[var(--space-xxs-2)] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[color:var(--ds-color-text-subtle)]">
          Copilot
        </p>
        <div className="rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.07)] bg-[color:rgba(248,250,253,0.88)] px-[var(--space-s)] py-[var(--space-s)]">
          <p className="mb-[var(--space-xs)] text-[0.85rem] font-medium text-[color:var(--ds-color-text-primary)]">Thinking</p>
          <ul className="flex list-none flex-col gap-[var(--space-xxs-2)] p-0 text-[0.9rem] leading-6 text-[color:var(--ds-color-text-muted)]">
            {summary.map((item) => (
              <li key={item} className="flex gap-[var(--space-xs)]">
                <span className="mt-[0.58rem] size-1 shrink-0 rounded-full bg-[color:var(--ds-color-link)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}

function EventBody({ event }: { event: Exclude<TimelineEvent, MessageEvent> }) {
  if (event.kind === 'artifact' && event.artifactType === 'markdown') {
    return <MarkdownBlock content={event.content} />
  }

  if (event.kind === 'artifact' && event.artifactType === 'diff') {
    return <DiffBlock compact content={event.content} />
  }

  if (event.kind === 'artifact' && event.artifactType === 'terminal') {
    return <TerminalBlock compact content={event.content} />
  }

  return <p className="line-clamp-4 whitespace-pre-wrap break-words text-[0.92rem] leading-6 text-[color:var(--ds-color-text-muted)]">{event.content}</p>
}

export function MarkdownBlock({ content }: { content: string }) {
  return (
    <Suspense
      fallback={<p className="text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">Loading artifact renderer...</p>}
    >
      <div className="max-h-48 overflow-auto rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.06)] bg-white px-[var(--space-s)] py-[var(--space-s)]">
        <MarkdownBlockInner content={content} />
      </div>
    </Suspense>
  )
}

export function DiffBlock({ compact = false, content }: { compact?: boolean; content: string }) {
  const lines = content.split('\n')

  return (
    <pre
      className={cn(
        'overflow-auto rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.06)] bg-white text-[0.78rem] leading-5',
        compact ? 'max-h-40' : 'max-h-[60vh]'
      )}
    >
      {lines.map((line, index) => (
        <code
          key={`${line}-${index}`}
          className={cn(
            'block px-[var(--space-xs)] py-[0.12rem]',
            line.startsWith('+') && 'bg-[color:rgba(30,255,143,0.08)]',
            line.startsWith('-') && 'bg-[color:rgba(255,84,89,0.08)]',
            line.startsWith('@@') && 'bg-[color:rgba(0,20,63,0.05)] font-bold'
          )}
        >
          {line || ' '}
        </code>
      ))}
    </pre>
  )
}

export function TerminalBlock({ compact = false, content }: { compact?: boolean; content: string }) {
  return (
    <pre
      className={cn(
        'overflow-auto rounded-[var(--ds-radius-md)] bg-[color:var(--ds-color-ink)] px-[var(--space-s)] py-[var(--space-s)] text-[0.78rem] leading-5 text-white',
        compact ? 'max-h-40' : 'max-h-[60vh]'
      )}
    >
      <code>{content}</code>
    </pre>
  )
}
