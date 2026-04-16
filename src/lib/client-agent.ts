import { getFallbackCopilotCapabilities, type CopilotCapabilities, type CopilotToolId } from '@/lib/copilot-adapter'
import type { UploadedFile } from '@/data/workspace'
import type { TimelineEvent } from '@/lib/timeline'

type RunCopilotInput = {
  prompt: string
  model: string
  cwd: string
  files: UploadedFile[]
  tools: CopilotToolId[]
}

type RunCopilotResponse = {
  events: TimelineEvent[]
  runtime?: 'sdk' | 'cli'
}

export async function runCopilot(input: RunCopilotInput): Promise<RunCopilotResponse> {
  try {
    const response = await fetch('/api/copilot', {
      body: JSON.stringify(input),
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Copilot server returned ${response.status}`)
    }

    return (await response.json()) as RunCopilotResponse
  } catch {
    return {
      events: [
        {
          id: crypto.randomUUID(),
          kind: 'tool',
          title: 'Local Copilot adapter',
          status: 'failed',
          toolName: 'copilot',
          content:
            'The local Copilot server is not running. Start it with `pnpm agent:server`, then send again. The prompt is still rendered locally so the UI can be tested without a backend.',
        },
        {
          id: crypto.randomUUID(),
          kind: 'artifact',
          title: 'Queued prompt',
          artifactType: 'markdown',
          content: `## Prompt queued\n\n${input.prompt}\n\n**Model:** ${input.model}\n\n**Tools:** ${input.tools.join(', ')}\n\n**Files:** ${
            input.files.length > 0 ? input.files.map((file) => file.name).join(', ') : 'none'
          }`,
        },
      ],
      runtime: 'cli',
    }
  }
}

export async function getCopilotCapabilities(): Promise<CopilotCapabilities> {
  try {
    const response = await fetch('/api/copilot/capabilities')

    if (!response.ok) {
      throw new Error(`Copilot server returned ${response.status}`)
    }

    return (await response.json()) as CopilotCapabilities
  } catch {
    return getFallbackCopilotCapabilities()
  }
}
