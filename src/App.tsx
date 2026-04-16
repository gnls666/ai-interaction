import { useEffect, useMemo, useState } from 'react'
import { Archive, CircleDot, GitBranch, PanelRightOpen, Plus, Search } from 'lucide-react'

import { AiPromptInput } from '@/components/ai-prompt-input'
import { InspectorPanel } from '@/components/inspector-panel'
import { TimelineRenderer } from '@/components/timeline-renderer'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { initialTimeline, threads, type ToolSelection, type UploadedFile } from '@/data/workspace'
import { getFallbackCopilotCapabilities, type CopilotToolId } from '@/lib/copilot-adapter'
import { getCopilotCapabilities, runCopilot } from '@/lib/client-agent'
import { getInspectorItem, type TimelineEvent } from '@/lib/timeline'
import { cn } from '@/lib/utils'
import './App.css'

const fallbackCapabilities = getFallbackCopilotCapabilities()

const defaultToolSelection = fallbackCapabilities.tools.reduce<ToolSelection>((selection, tool) => {
  selection[tool.id] = tool.enabled

  return selection
}, {} as ToolSelection)

function App() {
  const [capabilities, setCapabilities] = useState(fallbackCapabilities)
  const [selectedThreadId, setSelectedThreadId] = useState(threads[0].id)
  const [selectedInspectorId, setSelectedInspectorId] = useState<string | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(initialTimeline)
  const [model, setModel] = useState(fallbackCapabilities.models[0].id)
  const [toolSelection, setToolSelection] = useState<ToolSelection>(defaultToolSelection)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [lastRuntime, setLastRuntime] = useState<'sdk' | 'cli'>('sdk')
  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0],
    [selectedThreadId]
  )
  const inspectorItem = useMemo(
    () => (selectedInspectorId ? getInspectorItem(timelineEvents, selectedInspectorId) : null),
    [selectedInspectorId, timelineEvents]
  )
  const enabledTools = useMemo(
    () =>
      Object.entries(toolSelection)
        .filter(([, enabled]) => enabled)
        .map(([tool]) => tool as CopilotToolId),
    [toolSelection]
  )
  const liveThinkingSummary = useMemo(
    () => (isRunning ? buildLiveThinkingSummary(enabledTools, uploadedFiles.length) : []),
    [enabledTools, isRunning, uploadedFiles.length]
  )

  useEffect(() => {
    let cancelled = false

    async function loadCapabilities() {
      const nextCapabilities = await getCopilotCapabilities()

      if (cancelled) {
        return
      }

      setCapabilities(nextCapabilities)
      setToolSelection((currentSelection) =>
        nextCapabilities.tools.reduce<ToolSelection>((selection, tool) => {
          selection[tool.id] = currentSelection[tool.id] ?? tool.enabled

          return selection
        }, {} as ToolSelection)
      )
      setModel((currentModel) =>
        nextCapabilities.models.some((option) => option.id === currentModel)
          ? currentModel
          : (nextCapabilities.models[0]?.id ?? currentModel)
      )
    }

    void loadCapabilities()

    return () => {
      cancelled = true
    }
  }, [])

  async function submitPrompt(prompt: string, modeLabel: string) {
    const userEvent: TimelineEvent = {
      id: crypto.randomUUID(),
      kind: 'message',
      role: 'user',
      title: `${modeLabel} request`,
      content: prompt,
    }

    setTimelineEvents((events) => [...events, userEvent])
    setSelectedInspectorId(null)
    setIsRunning(true)

    try {
      const result = await runCopilot({
        cwd: '/Users/baizijun/projects/aem agent',
        files: uploadedFiles,
        model,
        prompt,
        tools: enabledTools,
      })

      setTimelineEvents((events) => [...events, ...result.events])
      setLastRuntime(result.runtime ?? 'cli')
    } catch (error) {
      setTimelineEvents((events) => [
        ...events,
        {
          id: crypto.randomUUID(),
          kind: 'message',
          role: 'assistant',
          title: 'Run failed',
          content: error instanceof Error ? error.message : String(error),
          thinkingSummary: ['The request failed before the runtime returned a response.'],
        },
      ])
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className={cn('ai-shell', inspectorItem && 'ai-shell--inspecting')}>
      <aside className="ai-sidebar">
        <div className="ai-sidebar__header">
          <div>
            <p className="ai-sidebar__eyebrow">Workspace</p>
            <h1 className="ai-sidebar__title">AI interaction</h1>
          </div>
          <Button aria-label="New thread" size="icon-sm" type="button" variant="ghost">
            <Plus data-icon="inline-start" />
          </Button>
        </div>

        <label className="ai-sidebar__search">
          <Search />
          <input aria-label="Search threads" defaultValue="" placeholder="Search threads" type="search" />
        </label>

        <ScrollArea className="min-h-0 flex-1">
          <nav className="ai-thread-list">
            {threads.map((thread) => (
              <button
                key={thread.id}
                className={cn('thread-button', thread.id === selectedThreadId && 'thread-button--active')}
                onClick={() => setSelectedThreadId(thread.id)}
                type="button"
              >
                <span className="thread-button__row">
                  <span className="truncate font-[var(--font-weight-bold)]">{thread.title}</span>
                  <ThreadIcon status={thread.status} />
                </span>
                <span className="line-clamp-2 text-left text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">
                  {thread.description}
                </span>
                <span className="text-left text-[var(--font-size-small)] text-[color:var(--ds-color-text-subtle)]">{thread.updatedAt}</span>
              </button>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      <section className="ai-center">
        <header className="ai-topbar">
          <div className="ai-topbar__copy">
            <p className="ai-topbar__eyebrow">Current thread</p>
            <h2 className="ai-topbar__title">{activeThread.title}</h2>
            <p className="ai-topbar__description">{activeThread.description}</p>
          </div>

          <div className="ai-topbar__actions">
            <div className="ai-runtime-meta">
              <span>{lastRuntime === 'sdk' ? 'Copilot SDK' : 'CLI fallback'}</span>
              <span>{enabledTools.length} tools on</span>
              {uploadedFiles.length > 0 ? <span>{uploadedFiles.length} files</span> : null}
            </div>

            <div className="ai-topbar__controls">
              <Select onValueChange={setModel} value={model}>
                <SelectTrigger className="w-[11rem]" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {capabilities.models.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {inspectorItem ? (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button className="xl:hidden" size="icon-sm" type="button" variant="outline">
                      <PanelRightOpen data-icon="inline-start" />
                      <span className="sr-only">Open inspector</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[min(92vw,36rem)] p-0">
                    <SheetTitle className="sr-only">Artifact inspector</SheetTitle>
                    <InspectorPanel item={inspectorItem} onClose={() => setSelectedInspectorId(null)} />
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          </div>
        </header>

        <div className="ai-tool-row">
          {capabilities.tools.map((tool) => (
            <Button
              key={tool.id}
              className={cn('tool-toggle', toolSelection[tool.id] && 'tool-toggle--active')}
              onClick={() =>
                setToolSelection((selection) => ({
                  ...selection,
                  [tool.id]: !selection[tool.id],
                }))
              }
              size="sm"
              type="button"
              variant="ghost"
            >
              {tool.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="ai-stream-shell">
            {timelineEvents.length === 0 ? (
              <section className="ai-empty-state">
                <p className="ai-empty-state__eyebrow">Ask anything</p>
                <h3 className="ai-empty-state__title">Keep the center quiet. Let tools and artifacts stay secondary.</h3>
                <p className="ai-empty-state__description">
                  Start with a message, then open tool output only when you need detail.
                </p>
              </section>
            ) : null}

            <TimelineRenderer
              events={timelineEvents}
              onSelect={setSelectedInspectorId}
              pendingState={isRunning ? { summary: liveThinkingSummary } : null}
              selectedId={selectedInspectorId}
            />
          </div>
        </ScrollArea>

        <div className="ai-composer">
          <AiPromptInput
            attachedFiles={uploadedFiles}
            disabled={isRunning}
            model={model}
            onAttachFiles={(files) => setUploadedFiles((currentFiles) => [...currentFiles, ...files])}
            onSubmit={submitPrompt}
            runtime={lastRuntime}
          />
        </div>
      </section>

      {inspectorItem ? (
        <section className="ai-inspector hidden xl:block">
          <InspectorPanel item={inspectorItem} onClose={() => setSelectedInspectorId(null)} />
        </section>
      ) : null}
    </main>
  )
}

function ThreadIcon({ status }: { status: 'active' | 'queued' | 'archived' }) {
  if (status === 'active') {
    return <CircleDot className="text-[color:var(--ds-color-link)]" />
  }

  if (status === 'archived') {
    return <Archive />
  }

  return <GitBranch />
}

function buildLiveThinkingSummary(enabledTools: CopilotToolId[], fileCount: number) {
  const summary = []

  if (fileCount > 0) {
    summary.push(`Reviewing ${fileCount} attached ${fileCount === 1 ? 'file' : 'files'}.`)
  }

  if (enabledTools.length > 0) {
    summary.push(`Preparing ${formatList(enabledTools.slice(0, 3))} tools.`)
  }

  summary.push('Drafting the next response.')

  return summary
}

function formatList(items: string[]) {
  if (items.length === 0) {
    return 'runtime'
  }

  if (items.length === 1) {
    return items[0]
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

export default App
