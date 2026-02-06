import { Link } from 'react-router-dom'

const formats = ['PDF', 'DOCX', 'PPTX', 'XLSX', 'PNG', 'JPG', 'TIFF', 'TXT', 'CSV']

export const SupportedFormats = () => (
  <section className="bg-white py-16 dark:bg-surface-900">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="rounded-3xl border border-surface-200 bg-surface-50 p-8 dark:border-surface-800 dark:bg-surface-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Supported formats</p>
            <h2 className="mt-2 text-2xl font-semibold text-surface-900 dark:text-white">
              Work across your entire document stack
            </h2>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">
              Import, edit, and export documents without leaving your workflow.
            </p>
          </div>
          <Link to="/docs" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
            View API docs
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {formats.map((format) => (
            <span
              key={format}
              className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs font-semibold text-surface-600 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
            >
              {format}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
)
