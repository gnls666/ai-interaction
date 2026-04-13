export type TimelineEventKind = 'message' | 'tool' | 'artifact'

export type TimelineEventBase = {
  id: string
  kind: TimelineEventKind
  title: string
  content: string
}

export type MessageEvent = TimelineEventBase & {
  kind: 'message'
  role: 'user' | 'assistant' | 'system'
}

export type ToolEvent = TimelineEventBase & {
  kind: 'tool'
  toolName: string
  status: 'queued' | 'running' | 'complete' | 'failed'
}

export type ArtifactEvent = TimelineEventBase & {
  kind: 'artifact'
  artifactType: 'markdown' | 'diff' | 'code' | 'terminal' | 'file'
}

export type TimelineEvent = MessageEvent | ToolEvent | ArtifactEvent

export type TimelineSummary = {
  messages: number
  tools: number
  artifacts: number
}

export function getInspectorItem(events: TimelineEvent[], selectedId: string | null): TimelineEvent | null {
  const inspectableEvents = events.filter((event) => event.kind === 'artifact' || event.kind === 'tool')

  if (selectedId) {
    const selected = inspectableEvents.find((event) => event.id === selectedId)

    if (selected) {
      return selected
    }
  }

  return inspectableEvents.at(-1) ?? null
}

export function getTimelineSummary(events: TimelineEvent[]): TimelineSummary {
  return events.reduce<TimelineSummary>(
    (summary, event) => {
      if (event.kind === 'message') {
        summary.messages += 1
      }

      if (event.kind === 'tool') {
        summary.tools += 1
      }

      if (event.kind === 'artifact') {
        summary.artifacts += 1
      }

      return summary
    },
    { messages: 0, tools: 0, artifacts: 0 }
  )
}
