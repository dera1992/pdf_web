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
  members?: number
  owner?: string
  created_at?: string
}

export type DocumentVersion = {
  id: string
  document?: string
  version_number?: number
  file?: string | null
  created_by?: string
  created_at?: string
  processing_state?: Record<string, string>
}

export type Document = {
  id: string
  workspace?: string | number
  title: string
  updatedAt?: string
  pageCount?: number
  status?: 'ready' | 'processing' | 'error' | 'queued' | 'running'
  current_version?: DocumentVersion | null
  updated_at?: string
  created_at?: string
  workspace_role?: 'viewer' | 'editor' | 'admin' | 'owner' | null
}

export type Annotation = {
  id: string
  documentId: string
  page: number
  type: 'highlight' | 'underline' | 'strike' | 'draw' | 'note' | 'shape' | 'stamp' | 'signature' | 'form'
  rects?: { x: number; y: number; width: number; height: number }[]
  points?: { x: number; y: number }[]
  style?: { color?: string; opacity?: number; thickness?: number; fontSize?: number; shapeKind?: 'rect' | 'arrow' }
  content?: string
  author?: { id: string; name: string }
  createdAt: string
  updatedAt?: string
  revision?: number
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
