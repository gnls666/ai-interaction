import { useEffect, useMemo, useState } from 'react'
import { Archive, CircleDot, GitBranch, PanelRightOpen, Plus, Search } from 'lucide-react'

import { AiPromptInput } from '@/components/ai-prompt-input'
import { InspectorPanel } from '@/components/inspector-panel'
import { TimelineRenderer } from '@/components/timeline-renderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { initialTimeline, threads, type ToolSelection, type UploadedFile } from '@/data/workspace'
import { getFallbackCopilotCapabilities, type CopilotToolId } from '@/lib/copilot-adapter'
import { getCopilotCapabilities, runCopilot } from '@/lib/client-agent'
import { getInspectorItem, getTimelineSummary, type TimelineEvent } from '@/lib/timeline'
import { cn } from '@/lib/utils'
import heroStack from '@/assets/hero.png'
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
  const summary = useMemo(() => getTimelineSummary(timelineEvents), [timelineEvents])
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
    setIsRunning(true)

    const result = await runCopilot({
      cwd: '/Users/baizijun/projects/aem agent',
      files: uploadedFiles,
      model,
      prompt,
      tools: enabledTools,
    })

    setTimelineEvents((events) => [...events, ...result.events])
    setLastRuntime(result.runtime ?? 'cli')
    setSelectedInspectorId(result.events.find((event) => event.kind === 'artifact')?.id ?? null)
    setIsRunning(false)
  }

  return (
    <TooltipProvider>
      <main className={cn('ai-shell', inspectorItem && 'ai-shell--inspecting')}>
        <aside className="ai-sidebar">
          <div className="flex items-center justify-between gap-[var(--space-s)]">
            <div>
              <p className="text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">Workspace</p>
              <h1 className="text-[var(--font-size-h3)] font-[var(--font-weight-bold)]">AI interaction</h1>
            </div>
            <Button aria-label="New thread" size="icon-sm" variant="outline">
              <Plus data-icon="inline-start" />
            </Button>
          </div>
          <div className="flex items-center gap-[var(--space-xs)] rounded-[var(--ds-radius-md)] border border-[color:var(--ds-color-border-subtle)] bg-white px-[var(--space-xs)] py-[var(--space-xxs-2)]">
            <Search />
            <span className="text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">Search threads</span>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <nav className="flex flex-col gap-[var(--space-xs)] pr-[var(--space-xs)]">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  className={cn('thread-button', thread.id === selectedThreadId && 'thread-button--active')}
                  onClick={() => setSelectedThreadId(thread.id)}
                  type="button"
                >
                  <span className="flex items-center justify-between gap-[var(--space-xs)]">
                    <span className="truncate font-[var(--font-weight-bold)]">{thread.title}</span>
                    <ThreadIcon status={thread.status} />
                  </span>
                  <span className="line-clamp-2 text-left text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">
                    {thread.description}
                  </span>
                  <span className="text-left text-[var(--font-size-small)] text-[color:var(--ds-color-text-muted)]">{thread.updatedAt}</span>
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <section className="ai-center">
          <header className="ai-toolbar">
            <div className="ai-toolbar__frame">
              <div className="ai-toolbar__hero-row">
                <div className="ai-toolbar__meta">
                  <Badge variant="secondary">{lastRuntime === 'sdk' ? 'Copilot SDK live' : 'Copilot CLI fallback'}</Badge>
                  <Badge variant="outline">{summary.tools} tools</Badge>
                  <Badge variant="outline">{summary.artifacts} artifacts</Badge>
                </div>
                <div className="ai-toolbar__actions">
                  <Select onValueChange={setModel} value={model}>
                    <SelectTrigger className="max-w-48" size="sm">
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
                        <Button className="xl:hidden" size="icon-sm" variant="outline">
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

              <div className="ai-toolbar__hero">
                <div className="ai-toolbar__content">
                  <p className="ai-toolbar__eyebrow ai-soft-reveal">AI workspace</p>
                  <h2 className="ai-toolbar__title ai-soft-reveal ai-soft-reveal--delay-1">{activeThread.title}</h2>
                  <p className="ai-toolbar__description ai-soft-reveal ai-soft-reveal--delay-2">
                    {activeThread.description}{' '}
                    <span className="ai-highlight-ink">Keep the thread light while the tooling works underneath.</span>
                  </p>
                </div>

                <div aria-hidden="true" className="ai-toolbar__art">
                  <div className="ai-toolbar__art-shell">
                    <img alt="" className="ai-toolbar__art-image" src={heroStack} />
                  </div>
                </div>
              </div>

              <div className="tool-strip">
                <div className="tool-strip__inner">
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
                      variant={toolSelection[tool.id] ? 'outline' : 'ghost'}
                    >
                      {tool.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <ScrollArea className="min-h-0 flex-1">
            <div className="ai-timeline-frame">
              {timelineEvents.length === 0 ? (
                <section className="ai-stage-intro">
                  <p className="ai-stage-intro__eyebrow">Quietly orchestrated</p>
                  <h3 className="ai-stage-intro__title">
                    <span className="ai-highlight-ink">Keep the conversation open.</span> Let the tools unfold behind it.
                  </h3>
                  <p className="ai-stage-intro__description">
                    Search, inspect, and turn working notes into artifacts without crowding the page.
                  </p>
                </section>
              ) : null}
              <TimelineRenderer events={timelineEvents} onSelect={setSelectedInspectorId} selectedId={selectedInspectorId} />
              {isRunning ? (
                <div className="ai-runner-status">
                  Copilot is working. Tool and artifact events will land in the timeline.
                </div>
              ) : null}
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
    </TooltipProvider>
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

export default App
