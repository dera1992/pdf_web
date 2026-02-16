import { Link } from 'react-router-dom'
import { PDF_TOOLS } from '../../data/pdfTools'

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
            Open any tool page to run that function directly.
          </p>
        </div>
        <Link to="/tools" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          Browse all tools
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {PDF_TOOLS.map((tool) => (
          <Link
            key={tool.id}
            to={tool.route}
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
