import { useState } from 'react'
import { Input } from './ui/Input'
import { useDebounce } from '../hooks/useDebounce'

export const SearchPanel = () => {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 300)

  const results = debounced
    ? Array.from({ length: 4 }).map((_, index) => ({
        id: index,
        page: index + 2,
        snippet: `Result for "${debounced}" in paragraph ${index + 1}.`
      }))
    : []

  return (
    <div className="space-y-3">
      <Input placeholder="Search in document" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="space-y-2">
        {results.length === 0 ? (
          <div className="text-xs text-surface-500">Start typing to search within the PDF.</div>
        ) : (
          results.map((result) => (
            <div key={result.id} className="rounded-lg border border-surface-200 p-2 text-xs dark:border-surface-700">
              <div className="font-semibold text-surface-700 dark:text-surface-200">Page {result.page}</div>
              <div className="text-surface-500">{result.snippet}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
