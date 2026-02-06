const trustItems = [
  { title: 'Encryption at rest & in transit', description: 'TLS 1.3 + AES-256 for every file.' },
  { title: 'Audit trail', description: 'Track access, edits, and exports.' },
  { title: 'Role-based access', description: 'Granular permissions for teams.' },
  { title: 'Data retention controls', description: 'Customize lifecycle policies.' }
]

export const Trust = () => (
  <section id="security" className="bg-white py-20 dark:bg-surface-900">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Trust & Compliance</p>
          <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">Security built for regulated teams</h2>
          <p className="mt-2 text-surface-600 dark:text-surface-300">
            Enterprise-grade controls with compliance-ready tooling.
          </p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
          GDPR-ready · SOC 2-ready · HIPAA-ready
        </div>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((item) => (
          <div key={item.title} className="rounded-3xl border border-surface-200 bg-surface-50 p-5 dark:border-surface-700 dark:bg-surface-800">
            <p className="text-sm font-semibold text-surface-900 dark:text-white">{item.title}</p>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{item.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-surface-500 dark:text-surface-400">
        Enterprise compliance options available.
      </p>
    </div>
  </section>
)
