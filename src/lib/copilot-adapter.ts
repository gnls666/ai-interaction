export type CopilotToolId = 'search' | 'read' | 'shell' | 'write' | 'github'

export type CopilotToolOption = {
  id: CopilotToolId
  label: string
  enabled: boolean
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
  write: 'write',
  github: 'github-mcp-server',
}

export function getDefaultCopilotTools(): CopilotToolOption[] {
  return [
    { id: 'search', label: 'Search', enabled: true },
    { id: 'read', label: 'Read files', enabled: true },
    { id: 'shell', label: 'Shell', enabled: true },
    { id: 'write', label: 'Write files', enabled: false },
    { id: 'github', label: 'GitHub MCP', enabled: false },
  ]
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
