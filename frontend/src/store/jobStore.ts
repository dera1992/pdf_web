import { create } from 'zustand'
import type { JobStatus } from '../types/api'

type JobState = {
  jobs: JobStatus[]
  setJobs: (jobs: JobStatus[]) => void
  updateJob: (job: JobStatus) => void
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  setJobs: (jobs) => set({ jobs }),
  updateJob: (job) =>
    set((state) => ({
      jobs: state.jobs.map((existing) => (existing.id === job.id ? job : existing))
    }))
}))
