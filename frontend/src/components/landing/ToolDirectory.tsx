import { Link } from 'react-router-dom'

type ToolLink = {
  name: string
  description: string
  href: string
}

const tools: ToolLink[] = [
  { name: 'PDF Viewer', description: 'Open, zoom, and search pages instantly.', href: '/docs' },
  { name: 'Annotations', description: 'Highlight, comment, and collaborate.', href: '/docs' },
  { name: 'Editor', description: 'Reorder, rotate, and edit content.', href: '/docs' },
  { name: 'Convert', description: 'Export to DOCX, PNG, or CSV.', href: '/docs' },
  { name: 'OCR', description: 'Turn scans into searchable text.', href: '/docs' },
  { name: 'AI Assistant', description: 'Summaries, chat, and redaction.', href: '/docs' },
  { name: 'Security', description: 'Permissions, watermarking, audit logs.', href: '/docs' },
  { name: 'Signatures', description: 'Collect approvals securely.', href: '/docs' },
  { name: 'Automation', description: 'Batch workflows and templates.', href: '/docs' }
]

export const ToolDirectory = () => (
  <section id="tools" className="bg-white py-20 dark:bg-surface-900">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Tool directory</p>
          <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">
            Every tool you need, one workspace
          </h2>
          <p className="mt-2 text-surface-600 dark:text-surface-300">
            Click any tool to jump into the workflow and learn how it works.
          </p>
        </div>
        <Link to="/docs" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          Explore documentation
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            to={tool.href}
            className="rounded-2xl border border-surface-200 bg-surface-50 p-5 transition hover:border-accent-200 hover:bg-white dark:border-surface-800 dark:bg-surface-800 dark:hover:border-accent-600/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{tool.name}</p>
              <span className="text-xs font-semibold text-accent-600">Open →</span>
            </div>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  </section>
)
