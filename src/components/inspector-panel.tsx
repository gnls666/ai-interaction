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
      <aside className="flex h-full items-center justify-center p-[var(--space-m)] text-center text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">
        <div className="max-w-[18rem]">
          <p className="mb-[var(--space-xxs-2)] font-[var(--font-weight-bold)] text-[color:var(--ds-color-text-primary)]">
            Artifacts open here
          </p>
          <p>Select any tool run or artifact in the center column to inspect it in a larger view.</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-[var(--space-s)] border-b border-[color:var(--ds-color-border-subtle)] p-[var(--space-s)]">
        <div className="min-w-0">
          <div className="mb-[var(--space-xxs-2)] flex items-center gap-[var(--space-xxs-2)]">
            <Badge variant="outline">{item.kind}</Badge>
            {item.kind === 'artifact' ? <Badge variant="secondary">{item.artifactType}</Badge> : null}
            {item.kind === 'tool' ? <Badge variant="secondary">{item.status}</Badge> : null}
          </div>
          <h2 className="truncate text-[var(--font-size-h3)] font-[var(--font-weight-bold)]">{item.title}</h2>
        </div>
        {onClose ? (
          <Button aria-label="Close inspector" onClick={onClose} size="icon-sm" type="button" variant="ghost">
            <X data-icon="inline-start" />
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-[var(--space-s)]">
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
