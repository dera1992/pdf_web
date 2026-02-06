import { ChevronDown } from 'lucide-react'

const bookmarks = [
  {
    id: '1',
    title: 'Executive Summary',
    children: [{ id: '1-1', title: 'Highlights' }, { id: '1-2', title: 'Recommendations' }]
  },
  {
    id: '2',
    title: 'Financials',
    children: [{ id: '2-1', title: 'Revenue' }, { id: '2-2', title: 'Expenses' }]
  }
]

export const BookmarksPanel = () => (
  <div className="space-y-3">
    {bookmarks.map((bookmark) => (
      <div key={bookmark.id} className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-surface-700 dark:text-surface-200">
          <ChevronDown className="h-4 w-4" />
          {bookmark.title}
        </div>
        <div className="space-y-1 pl-6 text-xs text-surface-500">
          {bookmark.children.map((child) => (
            <div key={child.id} className="cursor-pointer hover:text-accent-600">
              {child.title}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)
