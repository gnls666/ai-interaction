import { spawn } from 'node:child_process'

const fallbackModels = [
  { id: 'gpt-5.4', label: 'gpt-5.4', description: 'Deep agentic coding and planning' },
  { id: 'gpt-5.3-codex', label: 'gpt-5.3-codex', description: 'Codex-optimized code editing' },
  { id: 'gpt-5.2', label: 'gpt-5.2', description: 'Long-running professional work' },
  { id: 'claude-sonnet-4.6', label: 'claude-sonnet-4.6', description: 'Copilot compatible fallback' },
]

const toolOptions = [
  { id: 'search', label: 'Search', enabled: true },
  { id: 'read', label: 'Read files', enabled: true },
  { id: 'shell', label: 'Shell', enabled: true },
  { id: 'url', label: 'Fetch URLs', enabled: true },
  { id: 'write', label: 'Write files', enabled: false },
  { id: 'github', label: 'GitHub MCP', enabled: false },
]

function describeModel(id) {
  if (id.startsWith('gpt-5.4')) {
    return 'Deep agentic coding and planning'
  }

  if (id.includes('codex')) {
    return 'Codex-optimized code editing'
  }

  if (id.startsWith('gpt-5.2')) {
    return 'Long-running professional work'
  }

  if (id.startsWith('claude')) {
    return 'Copilot compatible fallback'
  }

  if (id.startsWith('gemini')) {
    return 'Reasoning-focused alternative'
  }

  return 'Runtime-discovered Copilot model'
}

export function extractModelsFromHelp(helpText) {
  const matches = Array.from(helpText.matchAll(/"([^"]+)"/g), (match) => match[1])
  return [...new Set(matches.filter((model) => model.includes('-')))]
}

function runCopilotHelp() {
  return new Promise((resolve, reject) => {
    const child = spawn('copilot', ['--help'], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: '1' },
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
        return
      }

      reject(new Error(stderr || `copilot --help exited with code ${code}`))
    })
  })
}

export async function getCopilotCapabilities(deps = {}) {
  const helpRunner = deps.helpRunner ?? runCopilotHelp

  try {
    const helpText = await helpRunner()
    const models = extractModelsFromHelp(helpText).map((id) => ({
      id,
      label: id,
      description: describeModel(id),
    }))

    return {
      models: models.length > 0 ? models : fallbackModels,
      runtimes: ['sdk', 'cli-fallback'],
      tools: toolOptions,
    }
  } catch {
    return {
      models: fallbackModels,
      runtimes: ['sdk', 'cli-fallback'],
      tools: toolOptions,
    }
  }
}
