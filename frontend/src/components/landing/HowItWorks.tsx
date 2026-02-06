const steps = [
  {
    title: 'Upload PDF',
    description: 'Drag, drop, or connect cloud storage to start.'
  },
  {
    title: 'Edit, Annotate, Automate',
    description: 'Use AI and markup tools to complete workflows fast.'
  },
  {
    title: 'Export & Share securely',
    description: 'Control permissions and ship final documents.'
  }
]

export const HowItWorks = () => (
  <section id="how-it-works" className="bg-surface-50 py-20 dark:bg-surface-800">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">How it works</p>
        <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">
          From upload to delivery in three steps
        </h2>
        <p className="mt-2 text-surface-600 dark:text-surface-300">
          A streamlined flow that keeps teams in sync and PDFs moving.
        </p>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="relative rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900">
            <span className="absolute -top-4 left-6 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">
              Step {index + 1}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-surface-900 dark:text-white">{step.title}</h3>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
)
