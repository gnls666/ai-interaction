#!/usr/bin/env node

import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const defaultTemplatePath = path.join(projectRoot, 'templates', 'ai-interaction.template.json')
const defaultUnpackTarget = path.join(process.env.TMPDIR || '/tmp', 'ai-interaction-template-rebuild')

const recursiveDirs = ['public', 'scripts', 'server', 'src']
const rootFiles = [
  '.gitignore',
  'README.md',
  'components.json',
  'eslint.config.js',
  'index.html',
  'package.json',
  'pnpm-lock.yaml',
  'tsconfig.app.json',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite.config.ts',
]

const binaryExtensions = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.png',
  '.ttf',
  '.webp',
  '.woff',
  '.woff2',
])

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join('/')
}

function isBinaryFile(filePath) {
  return binaryExtensions.has(path.extname(filePath).toLowerCase())
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function walkDirectory(relativeDir) {
  const absoluteDir = path.join(projectRoot, relativeDir)
  const dirents = await fs.readdir(absoluteDir, { withFileTypes: true })
  const paths = []

  for (const dirent of dirents.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativePath = path.join(relativeDir, dirent.name)

    if (dirent.isDirectory()) {
      paths.push(...(await walkDirectory(relativePath)))
      continue
    }

    if (dirent.isFile()) {
      paths.push(normalizeRelativePath(relativePath))
    }
  }

  return paths
}

async function collectTemplateFiles() {
  const files = []

  for (const relativePath of rootFiles) {
    const absolutePath = path.join(projectRoot, relativePath)

    if (await pathExists(absolutePath)) {
      files.push(relativePath)
    }
  }

  for (const relativeDir of recursiveDirs) {
    const absoluteDir = path.join(projectRoot, relativeDir)

    if (!(await pathExists(absoluteDir))) {
      continue
    }

    files.push(...(await walkDirectory(relativeDir)))
  }

  return files.sort((left, right) => left.localeCompare(right))
}

async function readTemplateEntry(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath)
  const buffer = await fs.readFile(absolutePath)
  const encoding = isBinaryFile(relativePath) ? 'base64' : 'utf8'

  return {
    path: normalizeRelativePath(relativePath),
    encoding,
    content: encoding === 'base64' ? buffer.toString('base64') : buffer.toString('utf8'),
  }
}

function ensureWithinTarget(targetRoot, relativePath) {
  const outputPath = path.resolve(targetRoot, relativePath)
  const relativeOutputPath = path.relative(targetRoot, outputPath)

  if (relativeOutputPath.startsWith('..') || path.isAbsolute(relativeOutputPath)) {
    throw new Error(`Refusing to write outside target directory: ${relativePath}`)
  }

  return outputPath
}

async function packTemplate(templatePath) {
  const files = await collectTemplateFiles()
  const payload = {
    format: 'aem-single-file-template/v1',
    project: 'ai-interaction',
    generatedAt: new Date().toISOString(),
    fileCount: files.length,
    files: await Promise.all(files.map(readTemplateEntry)),
  }

  await fs.mkdir(path.dirname(templatePath), { recursive: true })
  await fs.writeFile(templatePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  console.log(`Packed ${payload.fileCount} files into ${templatePath}`)
}

async function unpackTemplate(templatePath, targetPath, { force }) {
  const raw = await fs.readFile(templatePath, 'utf8')
  const payload = JSON.parse(raw)

  if (payload.format !== 'aem-single-file-template/v1' || !Array.isArray(payload.files)) {
    throw new Error(`Unsupported template format in ${templatePath}`)
  }

  await fs.mkdir(targetPath, { recursive: true })

  for (const entry of payload.files) {
    if (!entry || typeof entry.path !== 'string' || typeof entry.content !== 'string') {
      throw new Error('Template contains an invalid file entry')
    }

    const outputPath = ensureWithinTarget(targetPath, entry.path)
    const parentPath = path.dirname(outputPath)

    await fs.mkdir(parentPath, { recursive: true })

    if (!force && (await pathExists(outputPath))) {
      throw new Error(`Refusing to overwrite existing file without --force: ${outputPath}`)
    }

    if (entry.encoding === 'base64') {
      await fs.writeFile(outputPath, Buffer.from(entry.content, 'base64'))
      continue
    }

    if (entry.encoding !== 'utf8') {
      throw new Error(`Unsupported entry encoding for ${entry.path}: ${entry.encoding}`)
    }

    await fs.writeFile(outputPath, entry.content, 'utf8')
  }

  console.log(`Unpacked ${payload.files.length} files into ${targetPath}`)
}

function printUsage() {
  console.log(`Usage:
  node scripts/template-bundle.mjs pack [templatePath]
  node scripts/template-bundle.mjs unpack [templatePath] [targetPath] [--force]

Defaults:
  templatePath: ${normalizeRelativePath(path.relative(projectRoot, defaultTemplatePath))}
  targetPath: ${normalizeRelativePath(path.relative(projectRoot, defaultUnpackTarget))}`)
}

async function main() {
  const [, , command, ...rest] = process.argv

  if (!command || command === '--help' || command === '-h') {
    printUsage()
    return
  }

  if (command === 'pack') {
    const templatePath = rest[0] ? path.resolve(process.cwd(), rest[0]) : defaultTemplatePath

    await packTemplate(templatePath)
    return
  }

  if (command === 'unpack') {
    const force = rest.includes('--force')
    const positional = rest.filter((value) => value !== '--force')
    const templatePath = positional[0] ? path.resolve(process.cwd(), positional[0]) : defaultTemplatePath
    const targetPath = positional[1] ? path.resolve(process.cwd(), positional[1]) : defaultUnpackTarget

    await unpackTemplate(templatePath, targetPath, { force })
    return
  }

  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
