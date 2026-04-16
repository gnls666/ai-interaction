import { describe, expect, it, vi } from 'vitest'

import { extractModelsFromHelp, getCopilotCapabilities } from './copilot-capabilities.mjs'

describe('extractModelsFromHelp', () => {
  it('parses model choices from copilot help output', () => {
    const models = extractModelsFromHelp(`
      --model <model>  Set the AI model to use (choices:
      "claude-sonnet-4.6", "claude-sonnet-4.5", "gpt-5.4", "gpt-5.3-codex", "gpt-5.2")
    `)

    expect(models).toEqual(['claude-sonnet-4.6', 'claude-sonnet-4.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2'])
  })
})

describe('getCopilotCapabilities', () => {
  it('returns parsed models and the full tool palette', async () => {
    const capabilities = await getCopilotCapabilities({
      helpRunner: vi.fn().mockResolvedValue(`
        --model <model>  Set the AI model to use (choices:
        "gpt-5.4", "gpt-5.3-codex", "gpt-5.2")
      `),
    })

    expect(capabilities.models.map((model) => model.id)).toEqual(['gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2'])
    expect(capabilities.tools).toEqual([
      { id: 'search', label: 'Search', enabled: true },
      { id: 'read', label: 'Read files', enabled: true },
      { id: 'shell', label: 'Shell', enabled: true },
      { id: 'url', label: 'Fetch URLs', enabled: true },
      { id: 'write', label: 'Write files', enabled: false },
      { id: 'github', label: 'GitHub MCP', enabled: false },
    ])
  })

  it('falls back to default models when the CLI help lookup fails', async () => {
    const capabilities = await getCopilotCapabilities({
      helpRunner: vi.fn().mockRejectedValue(new Error('copilot not installed')),
    })

    expect(capabilities.models[0].id).toBe('gpt-5.4')
    expect(capabilities.tools.some((tool) => tool.id === 'url')).toBe(true)
  })
})
