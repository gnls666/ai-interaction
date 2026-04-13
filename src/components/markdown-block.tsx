import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

export function MarkdownBlockInner({ content }: { content: string }) {
  return (
    <div className="max-w-none text-[color:var(--ds-color-text-primary)] [&_code]:rounded-[var(--ds-radius-sm)] [&_code]:bg-[color:var(--ds-color-surface-muted)] [&_code]:px-1 [&_h2]:mb-[var(--space-xs)] [&_h2]:text-[var(--font-size-h3)] [&_li]:my-[var(--space-xxs)] [&_pre]:overflow-auto [&_pre]:rounded-[var(--ds-radius-md)] [&_pre]:bg-[color:var(--ds-color-ink)] [&_pre]:p-[var(--space-s)] [&_pre]:text-white [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[color:var(--ds-color-border-subtle)] [&_td]:p-[var(--space-xxs-2)] [&_th]:border [&_th]:border-[color:var(--ds-color-border-subtle)] [&_th]:p-[var(--space-xxs-2)]">
      <ReactMarkdown rehypePlugins={[rehypeHighlight]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
