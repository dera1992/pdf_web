import { useMemo, useState } from 'react'

type Feature = {
  name: string
  description: string
  pro?: boolean
}

type FeatureLevel = {
  label: string
  description: string
  features: Feature[]
}

const featureLevels: FeatureLevel[] = [
  {
    label: 'Level 1',
    description: 'Core Viewing & Navigation',
    features: [
      { name: 'Instant render', description: 'Open multi-page PDFs in seconds.' },
      { name: 'Smart search', description: 'Find keywords with context previews.' },
      { name: 'Reading modes', description: 'Single, dual, and continuous layouts.' },
      { name: 'Bookmarks & TOC', description: 'Jump to chapters instantly.' }
    ]
  },
  {
    label: 'Level 2',
    description: 'Annotation & Collaboration',
    features: [
      { name: 'Highlights', description: 'Color-coded highlights with labels.' },
      { name: 'Inline comments', description: 'Threaded notes with @mentions.' },
      { name: 'Shapes & stamps', description: 'Markups for reviews and QA.' },
      { name: 'Reusable form fields', description: 'Collect signatures and approvals.', pro: true }
    ]
  },
  {
    label: 'Level 3',
    description: 'Page & Content Manipulation',
    features: [
      { name: 'Split & merge', description: 'Break or combine files instantly.' },
      { name: 'Reorder & rotate', description: 'Drag-and-drop page management.' },
      { name: 'Text & image edit', description: 'Correct typos and swap assets.', pro: true },
      { name: 'Compress', description: 'Optimize PDFs without losing quality.' }
    ]
  },
  {
    label: 'Level 4',
    description: 'Advanced AI & Automation',
    features: [
      { name: 'AI chat', description: 'Ask questions across documents.', pro: true },
      { name: 'Auto summarize', description: 'Executive summaries in one click.', pro: true },
      { name: 'OCR extraction', description: 'Turn scans into searchable text.', pro: true },
      { name: 'Smart redaction', description: 'Detect and redact sensitive data.', pro: true }
    ]
  },
  {
    label: 'Level 5',
    description: 'Security & Compliance',
    features: [
      { name: 'Role-based access', description: 'Granular team permissions.' },
      { name: 'Audit trail', description: 'Track every change and export logs.' },
      { name: 'Watermarking', description: 'Apply dynamic viewer watermarks.' },
      { name: 'Retention policies', description: 'Automate lifecycle controls.', pro: true }
    ]
  }
]

export const Features = () => {
  const [activeIndex, setActiveIndex] = useState(0)

  const activeLevel = featureLevels[activeIndex]

  const tabs = useMemo(
    () =>
      featureLevels.map((level, index) => (
        <button
          key={level.label}
          type="button"
          onClick={() => setActiveIndex(index)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            index === activeIndex
              ? 'bg-accent-500 text-white shadow-sm'
              : 'border border-surface-200 text-surface-600 hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-300'
          }`}
          aria-pressed={index === activeIndex}
        >
          {level.label}
        </button>
      )),
    [activeIndex]
  )

  return (
    <section id="features" className="bg-white py-20 dark:bg-surface-900">
      <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Tools</p>
            <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">
              Everything you need to work with PDFs
            </h2>
            <p className="mt-2 text-surface-600 dark:text-surface-300">
              Level up from viewing to automation with modular tooling and enterprise-grade controls.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">{tabs}</div>
        </div>

        <div className="mt-10 rounded-3xl border border-surface-200 bg-surface-50 p-8 dark:border-surface-800 dark:bg-surface-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{activeLevel.description}</p>
              <p className="mt-1 text-sm text-surface-600 dark:text-surface-300">
                {activeLevel.features.length} tools available in this level.
              </p>
            </div>
            <a
              href="#pricing"
              className="text-sm font-semibold text-accent-600 hover:text-accent-700"
            >
              Compare plans
            </a>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeLevel.features.map((feature) => (
              <div key={feature.name} className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{feature.name}</p>
                  {feature.pro && (
                    <span className="rounded-full border border-accent-200 bg-accent-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-accent-600 dark:border-accent-600/40 dark:bg-accent-600/10">
                      Pro
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
