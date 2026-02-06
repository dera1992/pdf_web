import { NavLink } from 'react-router-dom'
import { LayoutGrid, FileText, Settings, Shield, History, MessageSquare, LogOut } from 'lucide-react'
import { cn } from '../utils/cn'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/workspace/alpha', label: 'Workspace', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/security', label: 'Security', icon: Shield },
  { to: '/audit-log', label: 'Audit Log', icon: History },
  { to: '/chat', label: 'Chat', icon: MessageSquare }
]

export const SidebarNav = () => (
  <nav className="flex h-full flex-col justify-between gap-4">
    <div className="space-y-2">
      <div className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">Workspace</div>
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-surface-500 transition hover:bg-surface-200 hover:text-surface-900 dark:hover:bg-surface-800',
                isActive && 'bg-surface-200 text-surface-900 dark:bg-surface-800 dark:text-surface-50'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        )
      })}
    </div>
    <button className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-surface-500 hover:bg-surface-200 hover:text-surface-900 dark:hover:bg-surface-800">
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  </nav>
)
