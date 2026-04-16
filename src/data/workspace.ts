import type { CopilotToolId } from '@/lib/copilot-adapter'
import type { TimelineEvent } from '@/lib/timeline'

export type Thread = {
  id: string
  title: string
  description: string
  updatedAt: string
  status: 'active' | 'queued' | 'archived'
}

export type UploadedFile = {
  id: string
  name: string
  size: number
  content: string
}

export type ToolSelection = Record<CopilotToolId, boolean>

export const threads: Thread[] = [
  {
    id: 'thread-market-scan',
    title: 'Market scan',
    description: 'Screen ETF exposure shifts by holdings overlap.',
    updatedAt: '2m ago',
    status: 'active',
  },
  {
    id: 'thread-parser',
    title: 'Holdings parser',
    description: 'Normalize uploaded CSV and XLSX columns before ranking.',
    updatedAt: '18m ago',
    status: 'queued',
  },
  {
    id: 'thread-rebalance',
    title: 'Rebalance notes',
    description: 'Draft an artifact from tool output and source notes.',
    updatedAt: 'Yesterday',
    status: 'archived',
  },
]

export const initialTimeline: TimelineEvent[] = [
  {
    id: 'm-1',
    kind: 'message',
    role: 'user',
    title: 'Research request',
    content:
      'Find ETF candidates whose top holdings overlap with NVDA and produce an implementation plan for parser improvements.',
  },
  {
    id: 'tool-1',
    kind: 'tool',
    title: 'Search local data',
    status: 'complete',
    toolName: 'search',
    content: 'Matched `overview-nvda.json`, `search-nvda.json`, and `ssga.ts` in the current workspace.',
  },
  {
    id: 'artifact-plan',
    kind: 'artifact',
    title: 'Parser plan',
    artifactType: 'markdown',
    content:
      '## Parser plan\n\n- Normalize issuer aliases before scoring.\n- Preserve uploaded file metadata as source evidence.\n- Render holdings overlap as an artifact instead of plain chat text.\n\n| Step | Owner | Status |\n| --- | --- | --- |\n| Extract columns | Copilot CLI | Ready |\n| Compare holdings | Search tool | Ready |\n| Patch UI | Write tool | Gated |',
  },
  {
    id: 'artifact-diff',
    kind: 'artifact',
    title: 'Patch preview',
    artifactType: 'diff',
    content:
      '--- a/src/parser.ts\n+++ b/src/parser.ts\n@@ -14,7 +14,7 @@\n-const score = holdings.length\n+const score = normalizeHoldings(holdings).length',
  },
  {
    id: 'm-2',
    kind: 'message',
    role: 'assistant',
    title: 'Copilot response',
    content:
      'I can run the parser search first, then produce a patch artifact. Writing files is disabled until you turn on the write tool.',
  },
]
