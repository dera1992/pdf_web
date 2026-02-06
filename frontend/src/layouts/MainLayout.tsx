import { Outlet } from 'react-router-dom'
import { SidebarNav } from '../components/SidebarNav'
import { TopBar } from '../components/TopBar'

export const MainLayout = () => (
  <div className="flex h-screen bg-surface-50 text-surface-900 dark:bg-surface-950">
    <aside className="hidden w-64 flex-col border-r border-surface-200 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 lg:flex">
      <div className="mb-6 text-lg font-semibold text-accent-600">CloudPDF Studio</div>
      <SidebarNav />
    </aside>
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar />
      <main className="flex-1 overflow-y-auto bg-surface-50 p-6 dark:bg-surface-950">
        <Outlet />
      </main>
    </div>
  </div>
)
