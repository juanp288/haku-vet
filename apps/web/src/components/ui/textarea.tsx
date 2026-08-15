import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--radius-sm)] border border-input bg-card px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground hover:border-neutral-400 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
