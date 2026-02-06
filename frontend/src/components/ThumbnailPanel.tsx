import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useViewerStore } from '../store/viewerStore'

export const ThumbnailPanel = () => {
  const pageCount = 42
  const parentRef = useRef<HTMLDivElement | null>(null)
  const { page, setPage } = useViewerStore()

  const rowVirtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120
  })

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-surface-400">Pages</div>
      <div ref={parentRef} className="scrollbar-thin h-full overflow-auto px-3">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const pageNumber = virtualRow.index + 1
            return (
              <button
                key={virtualRow.key}
                onClick={() => setPage(pageNumber)}
                className={`absolute left-0 top-0 w-full rounded-lg border px-2 py-3 text-left text-xs transition ${
                  page === pageNumber
                    ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/30'
                    : 'border-surface-200 bg-white text-surface-600 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-900'
                }`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <div className="mb-2 h-20 rounded-md bg-surface-100 dark:bg-surface-800" />
                Page {pageNumber}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
