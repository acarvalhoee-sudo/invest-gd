/**
 * MainLayout.tsx
 * Layout principal — sidebar escura + área de conteúdo
 * Inspirado em Stripe / Vercel Dashboard
 */

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Menu, X, Zap, ChevronRight,
  BarChart2, Settings, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Itens de navegação ───────────────────────────────────────

interface NavItem {
  label:    string
  to:       string
  icon:     React.ReactNode
  disabled?: boolean
  badge?:   string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  to: '/',          icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Relatórios', to: '/relatorios', icon: <FileText       className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
  { label: 'Análises',   to: '/analises',   icon: <BarChart2      className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
  { label: 'Configurações', to: '/config', icon: <Settings        className="w-4 h-4" />, disabled: true, badge: 'Em breve' },
]

// ─── Sidebar ─────────────────────────────────────────────────

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const location = useLocation()

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar text-sidebar-foreground",
      mobile ? "w-64" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-white truncate">INVEST GD</p>
          <p className="text-[10px] text-sidebar-foreground/50 truncate">Geração Distribuída</p>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-sidebar-foreground/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-2">
          Menu
        </p>
        <TooltipProvider delayDuration={200}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.disabled ? '#' : item.to}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all",
                      "group relative",
                      isActive
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className={cn("shrink-0", isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-white")}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-sidebar-foreground/10 text-sidebar-foreground/50 px-1.5 py-0.5 rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3 h-3 text-white/60" />}
                  </Link>
                </TooltipTrigger>
                {item.disabled && (
                  <TooltipContent side="right">Disponível em breve</TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center">
            <Zap className="w-3 h-3 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground/80 truncate">INVEST GD v1.0</p>
            <p className="text-[10px] text-sidebar-foreground/40">Fase 1 — CRUD</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Layout Principal ─────────────────────────────────────────

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <Sidebar mobile onClose={() => setMobileOpen(false)} />
      </div>

      {/* Sidebar desktop (fixed) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center h-16 px-4 sm:px-6 border-b border-border bg-card shrink-0 gap-3">
          <button
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb placeholder — cada página define o seu */}
          <div id="page-breadcrumb" className="flex-1" />

          {/* Right slot */}
          <div id="page-actions" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
