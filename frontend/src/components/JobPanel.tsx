import { useEffect } from 'react'
import { useJobStore } from '../store/jobStore'

const seedJobs = [
  { id: 'ocr-1', type: 'ocr', status: 'running', progress: 68 },
  { id: 'export-1', type: 'export', status: 'queued', progress: 12 },
  { id: 'op-1', type: 'operation', status: 'done', progress: 100 }
] as const

export const JobPanel = () => {
  const jobs = useJobStore((state) => state.jobs)
  const setJobs = useJobStore((state) => state.setJobs)

  useEffect(() => {
    if (jobs.length === 0) {
      setJobs(seedJobs.map((job) => ({ ...job })))
    }
  }, [jobs.length, setJobs])

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="capitalize">{job.type} job</span>
            <span className="text-xs text-surface-500">{job.status}</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-surface-200 dark:bg-surface-800">
            <div
              className="h-2 rounded-full bg-accent-600"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
