import { spawn, spawnSync } from 'node:child_process'

const sdkBuiltinTools = new Set(['search', 'read', 'shell', 'write'])

const cliToolAllowList = {
  search: 'search',
  read: 'read',
  shell: 'shell(*)',
  url: 'url',
  write: 'write',
  github: 'github-mcp-server',
}

function deny() {
  return { kind: 'denied-by-rules' }
}

function approve() {
  return { kind: 'approved' }
}

function resolveCopilotCliPath() {
  if (process.env.COPILOT_CLI_PATH) {
    return process.env.COPILOT_CLI_PATH
  }

  const locator =
    process.platform === 'win32'
      ? spawnSync('where', ['copilot'], { encoding: 'utf8' })
      : spawnSync('sh', ['-lc', 'command -v copilot'], { encoding: 'utf8' })

  if (locator.status !== 0) {
    return undefined
  }

  const path = locator.stdout.split(/\r?\n/).map((value) => value.trim()).find(Boolean)

  return path || undefined
}

export function buildSdkSessionConfig(payload) {
  const enabledTools = new Set(payload.tools)
  const availableTools = payload.tools.filter((tool) => sdkBuiltinTools.has(tool))
  const clientOptions = {
    cliArgs: enabledTools.has('github') ? ['--enable-all-github-mcp-tools'] : ['--disable-builtin-mcps'],
    logLevel: 'error',
  }
  const cliPath = resolveCopilotCliPath()

  if (cliPath) {
    clientOptions.cliPath = cliPath
  }

  return {
    clientOptions,
    messageOptions: {
      attachments: payload.files.map((path) => ({ path, type: 'file' })),
      mode: 'immediate',
      prompt: payload.prompt,
    },
    sessionConfig: {
      availableTools,
      infiniteSessions: { enabled: false },
      model: payload.model,
      onPermissionRequest: async (request) => {
        if (request.kind === 'read') {
          return enabledTools.has('read') ? approve() : deny()
        }

        if (request.kind === 'write') {
          return enabledTools.has('write') ? approve() : deny()
        }

        if (request.kind === 'shell') {
          return enabledTools.has('shell') ? approve() : deny()
        }

        if (request.kind === 'url') {
          return enabledTools.has('url') ? approve() : deny()
        }

        if (request.kind === 'mcp') {
          return enabledTools.has('github') ? approve() : deny()
        }

        return deny()
      },
      streaming: true,
      workingDirectory: payload.cwd,
    },
  }
}

function stringifyArgs(args) {
  if (!args || Object.keys(args).length === 0) {
    return ''
  }

  return ` with \`${JSON.stringify(args)}\``
}

function getToolCompletionContent(event) {
  if (event.data.result?.detailedContent) {
    return event.data.result.detailedContent
  }

  if (event.data.result?.content) {
    return event.data.result.content
  }

  if (event.data.error?.message) {
    return event.data.error.message
  }

  return event.data.success ? 'Tool completed without output.' : 'Tool failed without output.'
}

function normalizeThinkingLine(line) {
  return line.trim().replace(/^([-*•]|\d+[.)])\s+/, '')
}

function extractThinkingSummary(content) {
  const lines = content
    .split('\n')
    .map(normalizeThinkingLine)
    .filter(Boolean)

  if (lines.length > 0) {
    return lines.slice(0, 2)
  }

  const sentence = content.trim()

  return sentence ? [sentence] : []
}

function formatToolList(toolNames) {
  if (toolNames.length === 0) {
    return ''
  }

  if (toolNames.length === 1) {
    return toolNames[0]
  }

  if (toolNames.length === 2) {
    return `${toolNames[0]} and ${toolNames[1]}`
  }

  return `${toolNames.slice(0, -1).join(', ')}, and ${toolNames.at(-1)}`
}

function buildToolThinkingSummary(toolNames) {
  const names = [...new Set(toolNames)].slice(-3)

  if (names.length === 0) {
    return []
  }

  return [`Used ${formatToolList(names)} before responding.`]
}

function attachThinking(message, reasoningContent, toolNames) {
  const content = reasoningContent?.trim() ?? ''
  const summary = content ? extractThinkingSummary(content) : buildToolThinkingSummary(toolNames)

  if (content) {
    message.thinkingContent = content
  }

  if (summary.length > 0) {
    message.thinkingSummary = summary
  }
}

function mapToolContentBlock(toolCallId, toolName, block, index) {
  if (block.type === 'terminal') {
    return {
      artifactType: 'terminal',
      content: block.text,
      id: `${toolCallId}:artifact:${index}`,
      kind: 'artifact',
      title: `${toolName} output`,
    }
  }

  if (block.type === 'resource') {
    if ('text' in block.resource) {
      return {
        artifactType: 'file',
        content: block.resource.text,
        id: `${toolCallId}:artifact:${index}`,
        kind: 'artifact',
        title: block.resource.uri,
      }
    }

    return {
      artifactType: 'file',
      content: block.resource.uri,
      id: `${toolCallId}:artifact:${index}`,
      kind: 'artifact',
      title: block.resource.uri,
    }
  }

  if (block.type === 'resource_link') {
    return {
      artifactType: 'file',
      content: block.uri,
      id: `${toolCallId}:artifact:${index}`,
      kind: 'artifact',
      title: block.title ?? block.name,
    }
  }

  return null
}

export function mapSdkEventsToTimeline(events) {
  const timeline = []
  const toolNames = new Map()
  const recentToolNames = []
  let pendingReasoning = null

  for (const event of events) {
    if (event.type === 'tool.execution_start') {
      toolNames.set(event.data.toolCallId, event.data.toolName)
      timeline.push({
        content: `Running \`${event.data.toolName}\`${stringifyArgs(event.data.arguments)}`,
        id: `${event.data.toolCallId}:start`,
        kind: 'tool',
        status: 'running',
        title: event.data.toolName,
        toolName: event.data.toolName,
      })
    }

    if (event.type === 'tool.execution_complete') {
      const toolName = toolNames.get(event.data.toolCallId) ?? 'tool'
      timeline.push({
        content: getToolCompletionContent(event),
        id: `${event.data.toolCallId}:complete`,
        kind: 'tool',
        status: event.data.success ? 'complete' : 'failed',
        title: toolName,
        toolName,
      })
      recentToolNames.push(toolName)

      for (const [index, block] of (event.data.result?.contents ?? []).entries()) {
        const artifact = mapToolContentBlock(event.data.toolCallId, toolName, block, index)

        if (artifact) {
          timeline.push(artifact)
        }
      }
    }

    if (event.type === 'assistant.reasoning') {
      const reasoningContent = event.data.content?.trim() ?? ''
      const lastTimelineEvent = timeline.at(-1)

      if (reasoningContent && lastTimelineEvent?.kind === 'message' && lastTimelineEvent.role === 'assistant') {
        attachThinking(lastTimelineEvent, reasoningContent, recentToolNames)
        recentToolNames.length = 0
        pendingReasoning = null
      } else {
        pendingReasoning = reasoningContent
      }
    }

    if (event.type === 'assistant.message') {
      const message = {
        content: event.data.content,
        id: event.data.messageId,
        kind: 'message',
        role: 'assistant',
        title: 'Copilot response',
      }

      attachThinking(message, pendingReasoning, recentToolNames)
      timeline.push(message)
      recentToolNames.length = 0
      pendingReasoning = null
    }
  }

  return timeline
}

export function buildCliArgs({ prompt, model, cwd, files, tools }) {
  const promptWithFiles =
    files.length > 0 ? `${prompt}\n\nAttached files:\n${files.map((file) => `- ${file}`).join('\n')}` : prompt
  const args = ['--model', model, '--prompt', promptWithFiles, '--add-dir', cwd]

  for (const tool of tools) {
    if (cliToolAllowList[tool]) {
      args.push('--allow-tool', cliToolAllowList[tool])
    }
  }

  args.push('--output-format', 'json', '--stream', 'off', '--no-color', '--silent')

  return args
}

export function runCliCommand(args) {
  return new Promise((resolve) => {
    const child = spawn('copilot', args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NO_COLOR: '1',
      },
    })
    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      stderr += '\nCopilot CLI timed out after 90 seconds.'
    }, 90000)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({ code, stderr, stdout })
    })
  })
}

export async function runWithCli(payload) {
  const args = buildCliArgs(payload)
  const result = await runCliCommand(args)
  const content = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n\n')

  return {
    events: [
      {
        id: crypto.randomUUID(),
        kind: 'tool',
        title: 'Copilot CLI run',
        status: result.code === 0 ? 'complete' : 'failed',
        toolName: 'copilot',
        content: `copilot ${args.map((arg) => (arg.includes(' ') ? JSON.stringify(arg) : arg)).join(' ')}\n\n${content}`,
      },
      {
        id: crypto.randomUUID(),
        kind: 'artifact',
        title: result.code === 0 ? 'Copilot response' : 'Copilot diagnostics',
        artifactType: 'terminal',
        content: content || 'Copilot completed without output.',
      },
    ],
    runtime: 'cli',
  }
}

export async function runWithSdk(payload) {
  const sdk = await import('@github/copilot-sdk')
  const { clientOptions, messageOptions, sessionConfig } = buildSdkSessionConfig(payload)
  const client = new sdk.CopilotClient(clientOptions)
  const events = []

  await client.start()

  try {
    const session = await client.createSession({
      ...sessionConfig,
      onEvent: (event) => {
        events.push(event)
      },
    })

    try {
      await session.sendAndWait(messageOptions, 90000)
    } finally {
      await session.disconnect()
    }
  } finally {
    await client.stop()
  }

  return {
    events: mapSdkEventsToTimeline(events),
    runtime: 'sdk',
  }
}

export async function runCopilotRuntime(payload, deps = {}) {
  const sdkRunner = deps.sdkRunner ?? runWithSdk
  const cliRunner = deps.cliRunner ?? runWithCli

  try {
    return await sdkRunner(payload)
  } catch (error) {
    const fallback = await cliRunner(payload)

    return {
      events: [
        {
          content: error instanceof Error ? error.message : String(error),
          id: crypto.randomUUID(),
          kind: 'tool',
          status: 'failed',
          title: 'Copilot SDK unavailable',
          toolName: 'copilot-sdk',
        },
        ...fallback.events,
      ],
      runtime: 'cli',
    }
  }
}
