import { lazy, Suspense } from 'react'
import { Bot, CheckCircle2, Code2, FileText, Hammer, UserRound } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimelineEvent } from '@/lib/timeline'
import { cn } from '@/lib/utils'

const MarkdownBlockInner = lazy(() =>
  import('@/components/markdown-block').then((module) => ({ default: module.MarkdownBlockInner }))
)

type TimelineRendererProps = {
  events: TimelineEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TimelineRenderer({ events, selectedId, onSelect }: TimelineRendererProps) {
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
  const isInspectable = event.kind === 'artifact' || event.kind === 'tool'
  const isMessage = event.kind === 'message'

  return (
    <article
      className={cn(
        'group grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-[var(--space-s)] rounded-[var(--ds-radius-md)] transition-colors',
        isMessage
          ? 'px-0 py-[var(--space-xs)]'
          : 'border border-[color:rgba(0,20,63,0.06)] bg-white/72 px-[var(--space-s)] py-[var(--space-s)] shadow-[0_18px_44px_rgba(0,20,63,0.045)] backdrop-blur-sm',
        isInspectable && 'cursor-pointer hover:border-[color:rgba(0,20,63,0.12)] hover:bg-white/88',
        isSelected && 'border-[color:var(--ds-color-ink)] bg-white'
      )}
      onClick={isInspectable ? onSelect : undefined}
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--ds-radius-md)] border border-[color:rgba(0,20,63,0.06)] bg-white/78 text-[color:var(--ds-color-ink)] shadow-[0_10px_18px_rgba(0,20,63,0.03)]">
        {event.kind === 'message' && event.role === 'user' ? <UserRound /> : null}
        {event.kind === 'message' && event.role !== 'user' ? <Bot /> : null}
        {event.kind === 'tool' ? <Hammer /> : null}
        {event.kind === 'artifact' && event.artifactType === 'diff' ? <Code2 /> : null}
        {event.kind === 'artifact' && event.artifactType !== 'diff' ? <FileText /> : null}
      </div>
      <div className="min-w-0">
        <div className="mb-[var(--space-xs)] flex flex-wrap items-center justify-between gap-[var(--space-xs)]">
          <div className="flex min-w-0 items-center gap-[var(--space-xs)]">
            <h3 className="truncate text-[var(--font-size-base)] font-[var(--font-weight-bold)]">{event.title}</h3>
            <EventBadge event={event} />
          </div>
          {isInspectable ? (
            <Button className="opacity-0 transition-opacity group-hover:opacity-100" size="xs" variant="outline">
              Expand
            </Button>
          ) : null}
        </div>
        <EventBody event={event} />
      </div>
    </article>
  )
}

function EventBadge({ event }: { event: TimelineEvent }) {
  if (event.kind === 'message') {
    return <Badge variant="outline">{event.role}</Badge>
  }

  if (event.kind === 'tool') {
    return (
      <Badge variant={event.status === 'complete' ? 'secondary' : 'outline'}>
        <CheckCircle2 />
        {event.toolName}
      </Badge>
    )
  }

  return <Badge variant="outline">{event.artifactType}</Badge>
}

function EventBody({ event }: { event: TimelineEvent }) {
  if (event.kind === 'artifact' && event.artifactType === 'markdown') {
    return <MarkdownBlock content={event.content} />
  }

  if (event.kind === 'artifact' && event.artifactType === 'diff') {
    return <DiffBlock content={event.content} compact />
  }

  if (event.kind === 'artifact' && event.artifactType === 'terminal') {
    return <TerminalBlock content={event.content} />
  }

  return <p className="text-[0.98rem] leading-7 text-[color:var(--ds-color-text-primary)]">{event.content}</p>
}

export function MarkdownBlock({ content }: { content: string }) {
  return (
    <Suspense fallback={<p className="text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">Loading artifact renderer...</p>}>
      <MarkdownBlockInner content={content} />
    </Suspense>
  )
}

export function DiffBlock({ compact = false, content }: { compact?: boolean; content: string }) {
  const lines = content.split('\n')

  return (
    <pre
      className={cn(
        'overflow-auto rounded-[var(--ds-radius-md)] border border-[color:var(--ds-color-border-subtle)] bg-white text-[0.78rem] leading-5',
        compact ? 'max-h-48' : 'max-h-[60vh]'
      )}
    >
      {lines.map((line, index) => (
        <code
          key={`${line}-${index}`}
          className={cn(
            'block px-[var(--space-xs)]',
            line.startsWith('+') && 'bg-[color:var(--ds-color-surface-accent)]',
            line.startsWith('-') && 'bg-[color:var(--ds-color-surface-alert)]',
            line.startsWith('@@') && 'bg-[color:var(--ds-color-surface-muted)] font-bold'
          )}
        >
          {line || ' '}
        </code>
      ))}
    </pre>
  )
}

export function TerminalBlock({ content }: { content: string }) {
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-[var(--ds-radius-md)] bg-[color:var(--ds-color-ink)] p-[var(--space-s)] text-[0.78rem] leading-5 text-white">
      <code>{content}</code>
    </pre>
  )
}
