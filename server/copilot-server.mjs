import { createServer } from 'node:http'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { getCopilotCapabilities } from './copilot-capabilities.mjs'
import { runCopilotRuntime } from './copilot-runtime.mjs'

const port = Number(process.env.PORT ?? 8787)
const uploadDir = join(process.cwd(), '.copilot-uploads')

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

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 200, {})
    return
  }

  if (request.method === 'GET' && request.url === '/api/copilot/capabilities') {
    sendJson(response, 200, await getCopilotCapabilities())
    return
  }

  if (request.method === 'POST' && request.url === '/api/copilot') {
    try {
      const payload = JSON.parse(await readBody(request))
      const filePaths = await persistAttachments(payload.files)
      const result = await runCopilotRuntime({
        cwd: payload.cwd,
        files: filePaths,
        model: payload.model,
        prompt: payload.prompt,
        tools: payload.tools,
      })

      sendJson(response, 200, result)
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
