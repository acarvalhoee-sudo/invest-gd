import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground",
        secondary:   "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline:     "border border-input text-foreground",
        success:     "bg-green-100 text-green-800",
        warning:     "bg-amber-100 text-amber-800",
        // Fontes de geração
        ufv:      "bg-amber-100 text-amber-800",
        solar:    "bg-amber-100 text-amber-800",   // legado
        cgh:      "bg-blue-100 text-blue-800",
        pch:      "bg-violet-100 text-violet-800",
        eolica:   "bg-emerald-100 text-emerald-800",
        biomassa: "bg-lime-100 text-lime-800",
        biogas:   "bg-teal-100 text-teal-800",
        outros:   "bg-slate-100 text-slate-700",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
