export type StructuredPromptSlotType = 'input' | 'number' | 'select' | 'date'

export type StructuredPromptNode =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'slot'
      key: string
      slotType: StructuredPromptSlotType
      placeholder: string
      options?: string[]
      defaultValue?: string
    }

export type StructuredPromptTemplate = {
  id: string
  trigger: '/' | '@'
  keyword: string
  label: string
  description: string
  nodes: StructuredPromptNode[]
}

export type StructuredPromptSubmission = {
  templateId: string
  text: string
  slots: Record<string, string>
}

export const structuredPromptTemplates: StructuredPromptTemplate[] = [
  {
    id: 'etf-overlap',
    trigger: '/',
    keyword: 'overlap',
    label: 'ETF overlap',
    description: 'Compare two ETFs across a date range and top holdings count.',
    nodes: [
      { type: 'text', text: 'Compare ' },
      { type: 'slot', key: 'benchmarkA', slotType: 'input', placeholder: 'ETF A' },
      { type: 'text', text: ' and ' },
      { type: 'slot', key: 'benchmarkB', slotType: 'input', placeholder: 'ETF B' },
      { type: 'text', text: ' between ' },
      { type: 'slot', key: 'startDate', slotType: 'date', placeholder: 'Start date' },
      { type: 'text', text: ' and ' },
      { type: 'slot', key: 'endDate', slotType: 'date', placeholder: 'End date' },
      { type: 'text', text: ' across the top ' },
      { type: 'slot', key: 'topN', slotType: 'number', placeholder: 'Top N', defaultValue: '10' },
      { type: 'text', text: ' holdings.' },
    ],
  },
  {
    id: 'holdings-drilldown',
    trigger: '/',
    keyword: 'holdings',
    label: 'Holdings drilldown',
    description: 'Inspect a single ETF or basket over a chosen date window.',
    nodes: [
      { type: 'text', text: 'Analyze the holdings changes for ' },
      { type: 'slot', key: 'benchmark', slotType: 'input', placeholder: 'Ticker or basket' },
      { type: 'text', text: ' from ' },
      { type: 'slot', key: 'startDate', slotType: 'date', placeholder: 'Start date' },
      { type: 'text', text: ' to ' },
      { type: 'slot', key: 'endDate', slotType: 'date', placeholder: 'End date' },
      { type: 'text', text: '.' },
    ],
  },
  {
    id: 'workspace-agent',
    trigger: '@',
    keyword: 'workspace',
    label: 'Workspace agent',
    description: 'Route the request to the current repo-aware agent.',
    nodes: [{ type: 'text', text: '@workspace ' }],
  },
]

export function createTemplateSlotValues(template: StructuredPromptTemplate): Record<string, string> {
  return template.nodes.reduce<Record<string, string>>((values, node) => {
    if (node.type === 'slot') {
      values[node.key] = node.defaultValue ?? ''
    }

    return values
  }, {})
}

export function renderStructuredPrompt(
  template: StructuredPromptTemplate,
  slotValues: Record<string, string>,
): string {
  return normalizePromptWhitespace(
    template.nodes
      .map((node) => {
        if (node.type === 'text') {
          return node.text
        }

        return slotValues[node.key] ?? ''
      })
      .join(''),
  )
}

export function buildStructuredPromptSubmission({
  template,
  slotValues,
  prefixText = '',
  suffixText = '',
}: {
  template: StructuredPromptTemplate
  slotValues: Record<string, string>
  prefixText?: string
  suffixText?: string
}): StructuredPromptSubmission {
  return {
    templateId: template.id,
    text: normalizePromptWhitespace([prefixText, renderStructuredPrompt(template, slotValues), suffixText].join(' ')),
    slots: { ...slotValues },
  }
}

export function matchTemplateTrigger(text: string, caretIndex: number) {
  const textBeforeCaret = text.slice(0, caretIndex)
  const token = textBeforeCaret.match(/(^|\s)([/@][^\s]*)$/)

  if (!token) {
    return null
  }

  const raw = token[2]
  const trigger = raw[0] as '/' | '@'
  const query = raw.slice(1)

  if (!/^[a-zA-Z0-9_-]*$/.test(query)) {
    return null
  }

  return {
    trigger,
    query,
    from: caretIndex - raw.length,
  }
}

function normalizePromptWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}
