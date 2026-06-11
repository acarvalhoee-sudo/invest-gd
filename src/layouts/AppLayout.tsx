/**
 * AppLayout.tsx
 * Layout principal com sidebar de navegação
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, X, Zap, User, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface NavItem { label: string; to: string; icon: React.ReactNode }

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout }         = useAuth()
  const location                  = useLocation()
  const navigate                  = useNavigate()
  const [sidebarOpen, setSidebar] = useState(false)
  const [userMenu, setUserMenu]   = useState(false)

  async function handleLogout() {
    await logout()
    toast.success('Você saiu do sistema.')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-primary-900 shadow-xl
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-primary-800">
          <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">INVEST GD</p>
            <p className="text-primary-400 text-xs">Geração Distribuída</p>
          </div>
          <button className="ml-auto lg:hidden text-primary-300 hover:text-white" onClick={() => setSidebar(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.to)
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                  }`}
                onClick={() => setSidebar(false)}>
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.displayName || 'Usuário'}</p>
              <p className="text-primary-400 text-xs truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-primary-400 hover:text-white transition-colors" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setSidebar(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* User menu (desktop) */}
          <div className="relative">
            <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium"
              onClick={() => setUserMenu(!userMenu)}>
              <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <span className="hidden sm:block">{user?.displayName || 'Usuário'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {userMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-700 truncate">{user?.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
