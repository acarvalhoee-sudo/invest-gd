import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?:  string
  prefix?: string
  suffix?: string
}

/** Calcula padding-right em px baseado no comprimento do suffix */
function suffixPx(s: string): number {
  return s.length * 8 + 24   // ~8px/char + 24px margem
}

/** Calcula padding-left em px baseado no comprimento do prefix */
function prefixPx(s: string): number {
  return s.length * 8 + 20
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, prefix, suffix, style, ...props }, ref) => {
    const hasFix = prefix || suffix

    const dynamicStyle: React.CSSProperties = {
      ...(prefix ? { paddingLeft:  prefixPx(prefix)  } : {}),
      ...(suffix ? { paddingRight: suffixPx(suffix)  } : {}),
      ...style,
    }

    const base = cn(
      "flex h-9 w-full rounded-md border border-input bg-background text-sm shadow-sm",
      "transition-colors placeholder:text-muted-foreground",
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      error && "border-destructive focus-visible:ring-destructive",
      !hasFix && "px-3 py-1.5",
      hasFix  && "py-1.5",
      className
    )

    if (hasFix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-muted-foreground select-none pointer-events-none whitespace-nowrap">
              {prefix}
            </span>
          )}
          <input
            type={type}
            className={base}
            style={dynamicStyle}
            ref={ref}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-sm text-muted-foreground select-none pointer-events-none whitespace-nowrap">
              {suffix}
            </span>
          )}
        </div>
      )
    }

    return (
      <input
        type={type}
        className={base}
        style={style}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
