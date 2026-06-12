import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Menu, X, Zap,
  BarChart2, Settings, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface NavItem {
  label:    string
  to:       string
  icon:     React.ReactNode
  disabled?: boolean
  badge?:   string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    to: '/',          icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Relatorios',   to: '/relatorios', icon: <FileText        className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
  { label: 'Analises',     to: '/analises',   icon: <BarChart2       className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
  { label: 'Configuracoes',to: '/config',     icon: <Settings        className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
]

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const location = useLocation()

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar border-r border-sidebar-border",
      mobile ? "w-64" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-foreground truncate">INVEST GD</p>
          <p className="text-[10px] text-muted-foreground truncate">Geracao Distribuida</p>
        </div>
        {mobile && (
          <button
            onClick={onClose}
            className="ml-auto text-muted-foreground hover:text-foreground p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
          Menu
        </p>
        <TooltipProvider delayDuration={200}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.disabled ? '#' : item.to}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                  >
                    <span className={cn(
                      "shrink-0 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {item.disabled && (
                  <TooltipContent side="right">Disponivel em breve</TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground truncate">INVEST GD v1.1</p>
            <p className="text-[10px] text-muted-foreground">Fase 1.1</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar mobile onClose={() => setMobileOpen(false)} />
      </div>

      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center h-16 px-4 sm:px-6 border-b border-border bg-card shrink-0 gap-3">
          <button
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div id="page-breadcrumb" className="flex-1" />
          <div id="page-actions" />
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
