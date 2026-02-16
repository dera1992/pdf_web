export type ToolCategory = 'view-edit' | 'convert-from-pdf' | 'convert-to-pdf' | 'ocr'

export type ToolDefinition = {
  id: string
  name: string
  category: ToolCategory
  description: string
  route: string
  endpoint: string
  method: 'GET' | 'POST'
  needsVersionId?: boolean
  needsWorkspaceId?: boolean
  needsFileUpload?: boolean
  payloadHint?: string
}

export const TOOL_CATEGORIES: Array<{ id: ToolCategory; label: string }> = [
  { id: 'view-edit', label: 'View & Edit' },
  { id: 'convert-from-pdf', label: 'Convert FROM PDF' },
  { id: 'convert-to-pdf', label: 'Convert TO PDF' },
  { id: 'ocr', label: 'OCR' }
]

export const PDF_TOOLS: ToolDefinition[] = [
  {
    id: 'edit-text',
    name: 'Edit PDF Text',
    category: 'view-edit',
    description: 'Update layout JSON text blocks and save as a new version.',
    route: '/tools/edit-text',
    endpoint: '/versions/{versionId}/edit-text/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"text_content":"Updated text","layout_json":{"1":[{"text":"Updated"}]}}'
  },
  {
    id: 'annotations',
    name: 'PDF Annotator',
    category: 'view-edit',
    description: 'Create annotations such as highlight, underline, strike-through, notes, and shapes.',
    route: '/tools/annotations',
    endpoint: '/versions/{versionId}/annotations/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"page_number":1,"type":"highlight","payload":{"text":"Important"}}'
  },
  {
    id: 'reader-render-page',
    name: 'PDF Reader: Render Page',
    category: 'view-edit',
    description: 'Render a specific page preview for the reader.',
    route: '/tools/reader-render-page',
    endpoint: '/versions/{versionId}/render-page/?page=1',
    method: 'GET',
    needsVersionId: true
  },
  {
    id: 'reader-search',
    name: 'PDF Reader: Search',
    category: 'view-edit',
    description: 'Search text inside the current document version.',
    route: '/tools/reader-search',
    endpoint: '/versions/{versionId}/search/?q=term',
    method: 'GET',
    needsVersionId: true
  },
  {
    id: 'number-pages',
    name: 'Number Pages',
    category: 'view-edit',
    description: 'Add page numbers with positioning and style options.',
    route: '/tools/number-pages',
    endpoint: '/versions/{versionId}/number-pages/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"position":"bottom-right","size":12,"start_number":1}'
  },
  {
    id: 'crop',
    name: 'Crop PDF',
    category: 'view-edit',
    description: 'Crop selected pages using coordinates.',
    route: '/tools/crop',
    endpoint: '/versions/{versionId}/crop/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"page_range":"1-2","coordinates":{"x":10,"y":10,"w":500,"h":700}}'
  },
  {
    id: 'redact',
    name: 'Redact PDF',
    category: 'view-edit',
    description: 'Apply manual or AI-guided redaction.',
    route: '/tools/redact',
    endpoint: '/versions/{versionId}/redact/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"mode":"manual","areas":[{"page":1,"x":10,"y":10,"w":200,"h":30}]}'
  },
  {
    id: 'watermark',
    name: 'Watermark PDF',
    category: 'view-edit',
    description: 'Apply text/image watermark to all pages.',
    route: '/tools/watermark',
    endpoint: '/versions/{versionId}/watermark/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"text":"CONFIDENTIAL","opacity":0.4,"rotation":45}'
  },
  {
    id: 'fill-form',
    name: 'PDF Form Filler',
    category: 'view-edit',
    description: 'Fill AcroForm fields and flatten output.',
    route: '/tools/fill-form',
    endpoint: '/versions/{versionId}/fill-form/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"fields":{"full_name":"Jane Doe","company":"Acme"}}'
  },
  {
    id: 'share',
    name: 'Share PDF',
    category: 'view-edit',
    description: 'Generate secure share links with expiry and optional password.',
    route: '/tools/share',
    endpoint: '/versions/{versionId}/share/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"expires_in_hours":24,"password":"secret"}'
  },
  {
    id: 'convert-word',
    name: 'PDF to Word',
    category: 'convert-from-pdf',
    description: 'Convert PDF versions to Word asynchronously.',
    route: '/tools/convert-word',
    endpoint: '/convert/pdf-to-word/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'convert-excel',
    name: 'PDF to Excel',
    category: 'convert-from-pdf',
    description: 'Convert PDF versions to Excel asynchronously.',
    route: '/tools/convert-excel',
    endpoint: '/convert/pdf-to-excel/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'convert-ppt',
    name: 'PDF to PPT',
    category: 'convert-from-pdf',
    description: 'Convert PDF versions to PowerPoint asynchronously.',
    route: '/tools/convert-ppt',
    endpoint: '/convert/pdf-to-ppt/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'convert-jpg',
    name: 'PDF to JPG',
    category: 'convert-from-pdf',
    description: 'Convert PDF versions to images asynchronously.',
    route: '/tools/convert-jpg',
    endpoint: '/convert/pdf-to-jpg/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    category: 'convert-to-pdf',
    description: 'Upload a Word file and convert it to PDF.',
    route: '/tools/word-to-pdf',
    endpoint: '/convert/word-to-pdf/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    category: 'convert-to-pdf',
    description: 'Upload an Excel file and convert it to PDF.',
    route: '/tools/excel-to-pdf',
    endpoint: '/convert/excel-to-pdf/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'ppt-to-pdf',
    name: 'PPT to PDF',
    category: 'convert-to-pdf',
    description: 'Upload a presentation file and convert it to PDF.',
    route: '/tools/ppt-to-pdf',
    endpoint: '/convert/ppt-to-pdf/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    category: 'convert-to-pdf',
    description: 'Upload images and convert them to PDF.',
    route: '/tools/jpg-to-pdf',
    endpoint: '/convert/jpg-to-pdf/',
    method: 'POST',
    needsFileUpload: true
  },
  {
    id: 'ocr',
    name: 'PDF OCR',
    category: 'ocr',
    description: 'Run OCR with language selection and queue processing.',
    route: '/tools/ocr',
    endpoint: '/versions/{versionId}/ocr/',
    method: 'POST',
    needsVersionId: true,
    payloadHint: '{"language":"eng"}'
  }
]

export const getToolById = (id: string) => PDF_TOOLS.find((tool) => tool.id === id)
