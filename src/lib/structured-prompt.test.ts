import { describe, expect, it } from 'vitest'

import {
  buildStructuredPromptSubmission,
  createTemplateSlotValues,
  matchTemplateTrigger,
  structuredPromptTemplates,
} from './structured-prompt'

describe('createTemplateSlotValues', () => {
  it('builds default slot values for the ETF overlap template', () => {
    const template = structuredPromptTemplates.find((item) => item.id === 'etf-overlap')

    expect(template).toBeDefined()
    expect(createTemplateSlotValues(template!)).toEqual({
      benchmarkA: '',
      benchmarkB: '',
      startDate: '',
      endDate: '',
      topN: '10',
    })
  })
})

describe('buildStructuredPromptSubmission', () => {
  it('renders text output and keeps structured slot data together', () => {
    const template = structuredPromptTemplates.find((item) => item.id === 'etf-overlap')

    const result = buildStructuredPromptSubmission({
      template: template!,
      slotValues: {
        benchmarkA: 'SPY',
        benchmarkB: 'QQQ',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        topN: '15',
      },
      prefixText: 'Please help.',
      suffixText: 'Focus on only overlapping names.',
    })

    expect(result).toEqual({
      templateId: 'etf-overlap',
      text:
        'Please help. Compare SPY and QQQ between 2026-01-01 and 2026-03-31 across the top 15 holdings. Focus on only overlapping names.',
      slots: {
        benchmarkA: 'SPY',
        benchmarkB: 'QQQ',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        topN: '15',
      },
    })
  })
})

describe('matchTemplateTrigger', () => {
  it('finds the active slash command at the caret', () => {
    expect(matchTemplateTrigger('Please run /ov', 'Please run /ov'.length)).toEqual({
      from: 11,
      query: 'ov',
      trigger: '/',
    })
  })

  it('ignores slash characters that are inside normal paths or URLs', () => {
    expect(matchTemplateTrigger('See /Users/demo/file.txt', 'See /Users/demo/file.txt'.length)).toBeNull()
    expect(matchTemplateTrigger('https://example.com/overlap', 'https://example.com/overlap'.length)).toBeNull()
  })
})
