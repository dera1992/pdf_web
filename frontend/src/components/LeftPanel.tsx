import { useState } from 'react'
import { ThumbnailPanel } from './ThumbnailPanel'
import { SearchPanel } from './SearchPanel'
import { BookmarksPanel } from './BookmarksPanel'

export const LeftPanel = () => {
  const [tab, setTab] = useState<'thumbnails' | 'search' | 'bookmarks'>('thumbnails')

  return (
    <aside className="flex h-full w-64 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
      <div className="grid grid-cols-3 gap-1 p-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-surface-400">
        <button className={tab === 'thumbnails' ? 'text-accent-600' : ''} onClick={() => setTab('thumbnails')}>
          Pages
        </button>
        <button className={tab === 'search' ? 'text-accent-600' : ''} onClick={() => setTab('search')}>
          Search
        </button>
        <button className={tab === 'bookmarks' ? 'text-accent-600' : ''} onClick={() => setTab('bookmarks')}>
          TOC
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === 'thumbnails' && <ThumbnailPanel />}
        {tab === 'search' && (
          <div className="h-full overflow-y-auto p-4">
            <SearchPanel />
          </div>
        )}
        {tab === 'bookmarks' && (
          <div className="h-full overflow-y-auto p-4">
            <BookmarksPanel />
          </div>
        )}
      </div>
    </aside>
  )
}
