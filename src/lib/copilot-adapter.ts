export type CopilotToolId = 'search' | 'read' | 'shell' | 'url' | 'write' | 'github'

export type CopilotToolOption = {
  id: CopilotToolId
  label: string
  enabled: boolean
}

export type CopilotModelOption = {
  id: string
  label: string
  description: string
}

export type CopilotCapabilities = {
  models: CopilotModelOption[]
  runtimes: string[]
  tools: CopilotToolOption[]
}

export type BuildCopilotArgsInput = {
  prompt: string
  model: string
  cwd: string
  files: string[]
  tools: CopilotToolId[]
}

const toolAllowList: Record<CopilotToolId, string> = {
  search: 'search',
  read: 'read',
  shell: 'shell(*)',
  url: 'url',
  write: 'write',
  github: 'github-mcp-server',
}

export function getDefaultCopilotTools(): CopilotToolOption[] {
  return [
    { id: 'search', label: 'Search', enabled: true },
    { id: 'read', label: 'Read files', enabled: true },
    { id: 'shell', label: 'Shell', enabled: true },
    { id: 'url', label: 'Fetch URLs', enabled: true },
    { id: 'write', label: 'Write files', enabled: false },
    { id: 'github', label: 'GitHub MCP', enabled: false },
  ]
}

export function getFallbackCopilotCapabilities(): CopilotCapabilities {
  return {
    models: [
      { id: 'gpt-5.4', label: 'gpt-5.4', description: 'Deep agentic coding and planning' },
      { id: 'gpt-5.3-codex', label: 'gpt-5.3-codex', description: 'Codex-optimized code editing' },
      { id: 'gpt-5.2', label: 'gpt-5.2', description: 'Long-running professional work' },
      { id: 'claude-sonnet-4.6', label: 'claude-sonnet-4.6', description: 'Copilot compatible fallback' },
    ],
    runtimes: ['sdk', 'cli-fallback'],
    tools: getDefaultCopilotTools(),
  }
}

export function buildCopilotArgs({ prompt, model, cwd, files, tools }: BuildCopilotArgsInput): string[] {
  const promptWithFiles =
    files.length > 0 ? `${prompt}\n\nAttached files:\n${files.map((file) => `- ${file}`).join('\n')}` : prompt

  const args = ['--model', model, '--prompt', promptWithFiles, '--add-dir', cwd]

  for (const tool of tools) {
    args.push('--allow-tool', toolAllowList[tool])
  }

  args.push('--output-format', 'json', '--stream', 'off')

  return args
}
