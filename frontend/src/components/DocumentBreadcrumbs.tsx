import { ChevronRight } from 'lucide-react'

export const DocumentBreadcrumbs = () => (
  <div className="flex items-center gap-2 text-sm text-surface-500">
    <span>Documents</span>
    <ChevronRight className="h-4 w-4" />
    <span className="font-medium text-surface-700 dark:text-surface-200">Q3 Financial Report</span>
    <ChevronRight className="h-4 w-4" />
    <span>Version 4</span>
  </div>
)
