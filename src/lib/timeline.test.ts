import { describe, expect, it } from 'vitest'

import { getInspectorItem, getTimelineSummary } from './timeline'
import type { TimelineEvent } from './timeline'

const events: TimelineEvent[] = [
  {
    id: 'm-1',
    kind: 'message',
    role: 'assistant',
    title: 'Copilot response',
    content: 'I found two parser branches.',
  },
  {
    id: 'tool-1',
    kind: 'tool',
    title: 'Search holdings parser',
    status: 'complete',
    toolName: 'search',
    content: 'src/parser.ts:42 parseHoldings',
  },
  {
    id: 'artifact-1',
    kind: 'artifact',
    title: 'Patch preview',
    artifactType: 'diff',
    content: '--- a/src/parser.ts\n+++ b/src/parser.ts\n@@ -1 +1 @@\n-old\n+new',
  },
]

describe('getInspectorItem', () => {
  it('returns the selected artifact or tool result for the right-side inspector', () => {
    expect(getInspectorItem(events, 'artifact-1')).toMatchObject({
      id: 'artifact-1',
      title: 'Patch preview',
      kind: 'artifact',
    })
  })

  it('falls back to the newest inspectable event when nothing is selected', () => {
    expect(getInspectorItem(events, null)).toMatchObject({
      id: 'artifact-1',
      kind: 'artifact',
    })
  })
})

describe('getTimelineSummary', () => {
  it('counts messages, tools, and artifacts separately for workspace chrome', () => {
    expect(getTimelineSummary(events)).toEqual({
      messages: 1,
      tools: 1,
      artifacts: 1,
    })
  })
})
