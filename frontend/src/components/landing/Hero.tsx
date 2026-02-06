import { Link } from 'react-router-dom'

const metrics = [
  {
    title: 'Fast rendering',
    description: 'Optimized viewing even for large documents.'
  },
  {
    title: 'Secure by design',
    description: 'End-to-end encryption and audit trails.'
  },
  {
    title: 'Built for teams',
    description: 'Comment, assign, and share with control.'
  }
]

export const Hero = () => (
  <section className="bg-gradient-to-b from-white via-white to-surface-50 pb-20 pt-10 dark:from-surface-900 dark:via-surface-900 dark:to-surface-800">
    <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 lg:grid-cols-2 lg:px-6">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-accent-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-700 dark:border-accent-600/40 dark:bg-accent-600/10 dark:text-accent-200">
          <span className="h-2 w-2 rounded-full bg-accent-500" aria-hidden="true" />
          All-in-one PDF workspace
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-surface-900 dark:text-white sm:text-5xl">
          All-in-one PDF workspace for viewing, editing, signing, and AI automation.
        </h1>
        <p className="mt-4 text-lg text-surface-600 dark:text-surface-200">
          Move from upload to insight in seconds. CodexPDF keeps your documents fast, secure, and
          collaborative with AI-powered automation built in.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            to="/signup"
            className="rounded-full border border-accent-500 bg-accent-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
          >
            Upload a PDF
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-surface-200 px-6 py-3 text-sm font-semibold text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200"
          >
            See how it works
          </a>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.title} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-800 dark:bg-surface-900">
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{metric.title}</p>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="relative">
        <div className="absolute -right-6 top-10 hidden h-72 w-72 rounded-full bg-accent-100/50 blur-3xl dark:bg-accent-600/20 lg:block" />
        <div className="relative rounded-3xl border border-surface-200 bg-white p-6 shadow-card dark:border-surface-800 dark:bg-surface-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-accent-500" />
              <span className="h-3 w-3 rounded-full bg-surface-200 dark:bg-surface-700" />
              <span className="h-3 w-3 rounded-full bg-surface-200 dark:bg-surface-700" />
            </div>
            <span className="text-xs font-medium text-surface-500 dark:text-surface-300">PDF Viewer</span>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[120px_1fr]">
            <div className="space-y-3">
              {['Cover', 'Section 1', 'Section 2', 'Appendix'].map((item, index) => (
                <div
                  key={item}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                    index === 1
                      ? 'border-accent-200 bg-accent-50 text-accent-700 dark:border-accent-600/50 dark:bg-accent-600/10'
                      : 'border-surface-200 bg-surface-50 text-surface-600 dark:border-surface-800 dark:bg-surface-800 dark:text-surface-300'
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-surface-500 dark:text-surface-300">
                  <span className="rounded-full bg-white px-2 py-1 shadow-sm dark:bg-surface-900">Page 4</span>
                  <span>Zoom 125%</span>
                </div>
                <div className="flex items-center gap-2">
                  {['Annotate', 'Comment', 'Sign'].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-surface-200 bg-white px-2 py-1 text-[10px] text-surface-500 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className="h-2 w-4/5 rounded-full bg-surface-200 dark:bg-surface-700" />
                <div className="h-2 w-3/5 rounded-full bg-surface-200 dark:bg-surface-700" />
                <div className="h-2 w-2/3 rounded-full bg-surface-200 dark:bg-surface-700" />
                <div className="flex items-center gap-2">
                  <div className="h-12 w-12 rounded-xl bg-accent-100 dark:bg-accent-600/20" />
                  <div className="space-y-2">
                    <div className="h-2 w-32 rounded-full bg-surface-200 dark:bg-surface-700" />
                    <div className="h-2 w-24 rounded-full bg-surface-200 dark:bg-surface-700" />
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-accent-200 bg-white p-3 text-xs text-surface-600 shadow-sm dark:border-accent-600/40 dark:bg-surface-900 dark:text-surface-300">
                AI highlight: key clause detected · 98% confidence
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
)
