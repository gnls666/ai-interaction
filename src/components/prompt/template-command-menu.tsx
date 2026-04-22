import type { ReactNode } from 'react'

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover'
import type { StructuredPromptTemplate } from '@/lib/structured-prompt'

type TemplateCommandMenuProps = {
  children: ReactNode
  onSelect: (template: StructuredPromptTemplate) => void
  open: boolean
  query: string
  templates: StructuredPromptTemplate[]
  trigger: '/' | '@'
}

export function TemplateCommandMenu({
  children,
  onSelect,
  open,
  query,
  templates,
  trigger,
}: TemplateCommandMenuProps) {
  return (
    <Popover open={open}>
      <PopoverAnchor asChild>{children}</PopoverAnchor>
      <PopoverContent
        align="start"
        className="structured-editor__popover"
        onCloseAutoFocus={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => event.preventDefault()}
        side="top"
        sideOffset={12}
      >
        <Command
          className="structured-editor__command"
          loop
          shouldFilter={false}
        >
          <div className="structured-editor__command-meta">
            <p className="structured-editor__menu-label">
              {trigger === '/' ? 'Templates' : 'Agents'}
            </p>
            <span className="structured-editor__menu-token">
              {trigger}
              {query || '...'}
            </span>
          </div>
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              {templates.map((template) => (
                <CommandItem
                  key={template.id}
                  className="structured-editor__menu-item"
                  keywords={[template.keyword, template.label, template.description]}
                  onSelect={() => onSelect(template)}
                  value={`${template.trigger}${template.keyword}`}
                >
                  <span className="structured-editor__menu-keyword">
                    {template.trigger}
                    {template.keyword}
                  </span>
                  <span className="structured-editor__menu-copy">
                    <span className="structured-editor__menu-title">{template.label}</span>
                    <span className="structured-editor__menu-description">{template.description}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
