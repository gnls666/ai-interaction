import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const port = Number(process.env.PORT ?? 8787)
const uploadDir = join(process.cwd(), '.copilot-uploads')

const toolAllowList = {
  search: 'search',
  read: 'read',
  shell: 'shell(*)',
  write: 'write',
  github: 'github-mcp-server',
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-origin': '*',
    'content-type': 'application/json',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

function safeName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120)
}

async function persistAttachments(files = []) {
  await mkdir(uploadDir, { recursive: true })

  return Promise.all(
    files.map(async (file, index) => {
      const path = join(uploadDir, `${Date.now()}-${index}-${safeName(file.name)}`)
      await writeFile(path, file.content ?? '', 'utf8')
      return path
    })
  )
}

function buildCopilotArgs({ prompt, model, cwd, files, tools }) {
  const promptWithFiles =
    files.length > 0 ? `${prompt}\n\nAttached files:\n${files.map((file) => `- ${file}`).join('\n')}` : prompt
  const args = ['--model', model, '--prompt', promptWithFiles, '--add-dir', cwd]

  for (const tool of tools) {
    if (toolAllowList[tool]) {
      args.push('--allow-tool', toolAllowList[tool])
    }
  }

  args.push('--output-format', 'json', '--stream', 'off', '--no-color', '--silent')

  return args
}

function runCopilot(args) {
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
      resolve({ code, stdout, stderr })
    })
  })
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, {})
    return
  }

  if (request.method === 'GET' && request.url === '/api/copilot/capabilities') {
    sendJson(response, 200, {
      models: ['gpt-5.4', 'gpt-5.3-codex', 'gpt-5.2', 'claude-sonnet-4.6'],
      tools: Object.keys(toolAllowList),
    })
    return
  }

  if (request.method === 'POST' && request.url === '/api/copilot') {
    try {
      const payload = JSON.parse(await readBody(request))
      const filePaths = await persistAttachments(payload.files)
      const args = buildCopilotArgs({
        cwd: payload.cwd,
        files: filePaths,
        model: payload.model,
        prompt: payload.prompt,
        tools: payload.tools,
      })
      const result = await runCopilot(args)
      const content = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n\n')

      sendJson(response, 200, {
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
      })
    } catch (error) {
      sendJson(response, 500, {
        events: [
          {
            id: crypto.randomUUID(),
            kind: 'tool',
            title: 'Copilot adapter error',
            status: 'failed',
            toolName: 'copilot',
            content: error instanceof Error ? error.message : String(error),
          },
        ],
      })
    }
    return
  }

  sendJson(response, 404, { error: 'Not found' })
}).listen(port, '127.0.0.1', () => {
  console.log(`Copilot adapter listening at http://127.0.0.1:${port}`)
})
