export type User = {
  id: number
  name?: string
  email: string
}

export type AuthResponse = {
  access?: string
  refresh?: string
  access_token?: string
  refresh_token?: string
  user?: User
}

export type Profile = {
  email: string
  full_name: string
  phone_number: string
  avatar: string | null
  created_at: string
  updated_at: string
}

export type Workspace = {
  id: string
  name: string
  members: number
}

export type Document = {
  id: string
  title: string
  updatedAt: string
  pageCount: number
  status: 'ready' | 'processing' | 'error'
}

export type Annotation = {
  id: string
  documentId: string
  authorId: string
  type: string
  page: number
  payload: Record<string, unknown>
  createdAt: string
}

export type JobStatus = {
  id: string
  type: 'ocr' | 'export' | 'operation'
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
}

export type AuditEvent = {
  id: string
  actor: string
  action: string
  createdAt: string
  meta?: Record<string, string>
}
