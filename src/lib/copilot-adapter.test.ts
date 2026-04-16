import { describe, expect, it } from 'vitest'

import { buildCopilotArgs, getDefaultCopilotTools, getFallbackCopilotCapabilities } from './copilot-adapter'

describe('buildCopilotArgs', () => {
  it('builds a non-interactive Copilot CLI command with model, prompt, cwd, files, and selected tools', () => {
    const args = buildCopilotArgs({
      prompt: 'Find duplicated ETF holdings parsing logic.',
      model: 'gpt-5.4',
      cwd: '/workspace/etf-agent',
      files: ['uploads/holdings.csv', 'notes/constraints.md'],
      tools: ['shell', 'read', 'write', 'search', 'url'],
    })

    expect(args).toEqual([
      '--model',
      'gpt-5.4',
      '--prompt',
      'Find duplicated ETF holdings parsing logic.\n\nAttached files:\n- uploads/holdings.csv\n- notes/constraints.md',
      '--add-dir',
      '/workspace/etf-agent',
      '--allow-tool',
      'shell(*)',
      '--allow-tool',
      'read',
      '--allow-tool',
      'write',
      '--allow-tool',
      'search',
      '--allow-tool',
      'url',
      '--output-format',
      'json',
      '--stream',
      'off',
    ])
  })
})

describe('getDefaultCopilotTools', () => {
  it('keeps high-value Copilot tools available while making risky actions opt-in', () => {
    expect(getDefaultCopilotTools()).toEqual([
      { id: 'search', label: 'Search', enabled: true },
      { id: 'read', label: 'Read files', enabled: true },
      { id: 'shell', label: 'Shell', enabled: true },
      { id: 'url', label: 'Fetch URLs', enabled: true },
      { id: 'write', label: 'Write files', enabled: false },
      { id: 'github', label: 'GitHub MCP', enabled: false },
    ])
  })
})

describe('getFallbackCopilotCapabilities', () => {
  it('exposes fallback models and tools for the UI when the backend is unavailable', () => {
    const capabilities = getFallbackCopilotCapabilities()

    expect(capabilities.models[0]).toEqual({
      description: 'Deep agentic coding and planning',
      id: 'gpt-5.4',
      label: 'gpt-5.4',
    })
    expect(capabilities.tools.some((tool) => tool.id === 'url')).toBe(true)
  })
})
