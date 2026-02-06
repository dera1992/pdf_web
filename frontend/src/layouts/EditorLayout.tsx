import { Outlet } from 'react-router-dom'
import { AnnotationToolbar } from '../components/AnnotationToolbar'
import { DocumentBreadcrumbs } from '../components/DocumentBreadcrumbs'
import { LeftPanel } from '../components/LeftPanel'
import { RightPanel } from '../components/RightPanel'
import { ViewerTopBar } from '../components/ViewerTopBar'

export const EditorLayout = () => (
  <div className="flex h-screen flex-col bg-surface-50 text-surface-900 dark:bg-surface-950">
    <div className="flex items-center justify-between border-b border-surface-200 bg-white px-6 py-3 dark:border-surface-800 dark:bg-surface-900">
      <DocumentBreadcrumbs />
      <div className="text-xs text-surface-500">Auto-saved 2 minutes ago</div>
    </div>
    <AnnotationToolbar />
    <ViewerTopBar />
    <div className="flex flex-1 overflow-hidden">
      <LeftPanel />
      <div className="relative flex flex-1 items-center justify-center overflow-auto bg-surface-100 p-6 dark:bg-surface-900">
        <Outlet />
      </div>
      <RightPanel />
    </div>
  </div>
)
