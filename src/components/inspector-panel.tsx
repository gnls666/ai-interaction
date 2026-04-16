import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DiffBlock, MarkdownBlock, TerminalBlock } from '@/components/timeline-renderer'
import type { TimelineEvent } from '@/lib/timeline'

type InspectorPanelProps = {
  item: TimelineEvent | null
  onClose?: () => void
}

export function InspectorPanel({ item, onClose }: InspectorPanelProps) {
  if (!item) {
    return (
      <aside className="flex h-full items-center justify-center p-[var(--space-l)] text-center text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">
        <div className="max-w-[18rem]">
          <p className="mb-[var(--space-xxs-2)] text-[0.72rem] font-medium uppercase tracking-[0.08em] text-[color:var(--ds-color-text-subtle)]">
            Inspector
          </p>
          <p className="mb-[var(--space-xxs-2)] font-[var(--font-weight-bold)] text-[color:var(--ds-color-text-primary)]">
            Open artifacts here
          </p>
          <p>Select a tool run or artifact when you need a larger view.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-start justify-between gap-[var(--space-s)] border-b border-[color:rgba(0,20,63,0.06)] px-[var(--space-s)] py-[var(--space-s)]">
        <div className="min-w-0">
          <div className="mb-[var(--space-xxs-2)] flex items-center gap-[var(--space-xxs-2)]">
            <Badge variant="outline">{item.kind}</Badge>
            {item.kind === 'artifact' ? <Badge variant="secondary">{item.artifactType}</Badge> : null}
            {item.kind === 'tool' ? <Badge variant="secondary">{item.status}</Badge> : null}
          </div>
          <h2 className="truncate text-[1rem] font-[var(--font-weight-bold)] text-[color:var(--ds-color-text-primary)]">{item.title}</h2>
        </div>
        {onClose ? (
          <Button aria-label="Close inspector" onClick={onClose} size="icon-sm" type="button" variant="ghost">
            <X data-icon="inline-start" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-[var(--space-s)] py-[var(--space-m)]">
        {item.kind === 'artifact' && item.artifactType === 'markdown' ? <MarkdownBlock content={item.content} /> : null}
        {item.kind === 'artifact' && item.artifactType === 'diff' ? <DiffBlock content={item.content} /> : null}
        {item.kind === 'artifact' && item.artifactType === 'terminal' ? <TerminalBlock content={item.content} /> : null}
        {item.kind === 'artifact' && (item.artifactType === 'code' || item.artifactType === 'file') ? (
          <TerminalBlock content={item.content} />
        ) : null}
        {item.kind === 'tool' ? (
          <div className="flex flex-col gap-[var(--space-s)]">
            <div>
              <p className="text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">Tool</p>
              <p className="font-[var(--font-weight-bold)]">{item.toolName}</p>
            </div>
            <Separator />
            <TerminalBlock content={item.content} />
          </div>
        ) : null}
      </div>
    </aside>
  )
}
