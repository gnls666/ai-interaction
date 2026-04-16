import { describe, expect, it, vi } from 'vitest'

import { buildSdkSessionConfig, mapSdkEventsToTimeline, runCopilotRuntime } from './copilot-runtime.mjs'

describe('buildSdkSessionConfig', () => {
  it('derives working directory, available tools, and permission gating from the request payload', async () => {
    const payload = {
      cwd: '/workspace/agent',
      files: ['/tmp/holdings.csv'],
      model: 'gpt-5.4',
      prompt: 'Find duplicated holdings logic.',
      tools: ['search', 'read', 'shell'],
    }

    const config = buildSdkSessionConfig(payload)

    expect(config.clientOptions).toMatchObject({
      cliArgs: ['--disable-builtin-mcps'],
      logLevel: 'error',
    })

    expect(config.sessionConfig.model).toBe('gpt-5.4')
    expect(config.sessionConfig.workingDirectory).toBe('/workspace/agent')
    expect(config.sessionConfig.availableTools).toEqual(['search', 'read', 'shell'])
    expect(config.sessionConfig.streaming).toBe(true)
    expect(config.messageOptions).toEqual({
      attachments: [{ path: '/tmp/holdings.csv', type: 'file' }],
      mode: 'immediate',
      prompt: 'Find duplicated holdings logic.',
    })

    await expect(
      config.sessionConfig.onPermissionRequest({ kind: 'read' }, { sessionId: 'session-1' })
    ).resolves.toEqual({ kind: 'approved' })

    await expect(
      config.sessionConfig.onPermissionRequest({ kind: 'write' }, { sessionId: 'session-1' })
    ).resolves.toEqual({ kind: 'denied-by-rules' })

    await expect(
      config.sessionConfig.onPermissionRequest({ kind: 'mcp' }, { sessionId: 'session-1' })
    ).resolves.toEqual({ kind: 'denied-by-rules' })
  })
})

describe('mapSdkEventsToTimeline', () => {
  it('maps assistant reasoning onto the final assistant message and preserves a short thinking summary', () => {
    const timeline = mapSdkEventsToTimeline([
      {
        id: 'evt-tool-start',
        parentId: null,
        timestamp: '2026-04-16T12:00:00.000Z',
        type: 'tool.execution_start',
        data: {
          arguments: { path: 'src/parser.ts' },
          toolCallId: 'tool-1',
          toolName: 'read',
        },
      },
      {
        id: 'evt-tool-complete',
        parentId: 'evt-tool-start',
        timestamp: '2026-04-16T12:00:02.000Z',
        type: 'tool.execution_complete',
        data: {
          result: {
            content: 'Read src/parser.ts',
            contents: [
              {
                cwd: '/workspace/agent',
                exitCode: 0,
                text: 'src/parser.ts:12 duplicate scoring branch',
                type: 'terminal',
              },
            ],
            detailedContent: 'Read src/parser.ts successfully',
          },
          success: true,
          toolCallId: 'tool-1',
        },
      },
      {
        id: 'evt-reasoning',
        parentId: 'evt-tool-complete',
        timestamp: '2026-04-16T12:00:02.500Z',
        type: 'assistant.reasoning',
        data: {
          content: '- Gathered parser context\n- Compared duplicated scoring branches\n- Drafted a minimal response',
        },
      },
      {
        id: 'evt-assistant',
        parentId: 'evt-tool-complete',
        timestamp: '2026-04-16T12:00:03.000Z',
        type: 'assistant.message',
        data: {
          content: 'I found one duplicated branch in the parser.',
          messageId: 'msg-1',
        },
      },
    ])

    expect(timeline).toEqual([
      {
        content: 'Running `read` with `{"path":"src/parser.ts"}`',
        id: 'tool-1:start',
        kind: 'tool',
        status: 'running',
        title: 'read',
        toolName: 'read',
      },
      {
        content: 'Read src/parser.ts successfully',
        id: 'tool-1:complete',
        kind: 'tool',
        status: 'complete',
        title: 'read',
        toolName: 'read',
      },
      {
        artifactType: 'terminal',
        content: 'src/parser.ts:12 duplicate scoring branch',
        id: 'tool-1:artifact:0',
        kind: 'artifact',
        title: 'read output',
      },
      {
        content: 'I found one duplicated branch in the parser.',
        id: 'msg-1',
        kind: 'message',
        role: 'assistant',
        thinkingContent: '- Gathered parser context\n- Compared duplicated scoring branches\n- Drafted a minimal response',
        thinkingSummary: ['Gathered parser context', 'Compared duplicated scoring branches'],
        title: 'Copilot response',
      },
    ])
  })

  it('falls back to recent tool activity when no explicit reasoning event is available', () => {
    const timeline = mapSdkEventsToTimeline([
      {
        id: 'evt-tool-start-search',
        parentId: null,
        timestamp: '2026-04-16T12:00:00.000Z',
        type: 'tool.execution_start',
        data: {
          arguments: { query: 'parseHoldings' },
          toolCallId: 'tool-search',
          toolName: 'search',
        },
      },
      {
        id: 'evt-tool-complete-search',
        parentId: 'evt-tool-start-search',
        timestamp: '2026-04-16T12:00:01.000Z',
        type: 'tool.execution_complete',
        data: {
          result: {
            content: 'Located parser references',
          },
          success: true,
          toolCallId: 'tool-search',
        },
      },
      {
        id: 'evt-tool-start-read',
        parentId: null,
        timestamp: '2026-04-16T12:00:02.000Z',
        type: 'tool.execution_start',
        data: {
          arguments: { path: 'src/parser.ts' },
          toolCallId: 'tool-read',
          toolName: 'read',
        },
      },
      {
        id: 'evt-tool-complete-read',
        parentId: 'evt-tool-start-read',
        timestamp: '2026-04-16T12:00:03.000Z',
        type: 'tool.execution_complete',
        data: {
          result: {
            content: 'Opened src/parser.ts',
          },
          success: true,
          toolCallId: 'tool-read',
        },
      },
      {
        id: 'evt-assistant',
        parentId: 'evt-tool-complete-read',
        timestamp: '2026-04-16T12:00:04.000Z',
        type: 'assistant.message',
        data: {
          content: 'I found the duplicated scoring branch near the parser tail.',
          messageId: 'msg-2',
        },
      },
    ])

    expect(timeline.at(-1)).toMatchObject({
      id: 'msg-2',
      kind: 'message',
      thinkingSummary: ['Used search and read before responding.'],
    })
  })
})

describe('runCopilotRuntime', () => {
  it('falls back to the CLI runner when the SDK path fails', async () => {
    const payload = {
      cwd: '/workspace/agent',
      files: [],
      model: 'gpt-5.4',
      prompt: 'Patch the parser.',
      tools: ['search', 'read', 'write'],
    }
    const sdkRunner = vi.fn().mockRejectedValue(new Error('sdk init failed'))
    const cliRunner = vi.fn().mockResolvedValue({
      events: [
        {
          content: 'copilot --model gpt-5.4',
          id: 'cli-tool',
          kind: 'tool',
          status: 'complete',
          title: 'Copilot CLI run',
          toolName: 'copilot',
        },
      ],
    })

    const result = await runCopilotRuntime(payload, { cliRunner, sdkRunner })

    expect(sdkRunner).toHaveBeenCalledWith(payload)
    expect(cliRunner).toHaveBeenCalledWith(payload)
    expect(result.runtime).toBe('cli')
    expect(result.events[0]).toMatchObject({
      kind: 'tool',
      status: 'failed',
      title: 'Copilot SDK unavailable',
      toolName: 'copilot-sdk',
    })
    expect(result.events[1]).toEqual({
      content: 'copilot --model gpt-5.4',
      id: 'cli-tool',
      kind: 'tool',
      status: 'complete',
      title: 'Copilot CLI run',
      toolName: 'copilot',
    })
  })
})
