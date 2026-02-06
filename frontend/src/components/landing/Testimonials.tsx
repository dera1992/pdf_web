const testimonials = [
  {
    name: 'Riley Chen',
    role: 'Operations Lead',
    company: 'Northwind Logistics',
    quote: 'We replaced three tools with CodexPDF. Reviews are faster and the audit trail is gold.'
  },
  {
    name: 'Amira Khan',
    role: 'Legal Counsel',
    company: 'Summit Legal',
    quote: 'The AI summaries and redaction suggestions cut hours out of contract review.'
  },
  {
    name: 'Diego Alvarez',
    role: 'Product Manager',
    company: 'Atlas Fintech',
    quote: 'Our teams annotate in real time without worrying about version drift.'
  }
]

const StarRow = () => (
  <div className="flex items-center gap-1" aria-label="5 star rating">
    {Array.from({ length: 5 }).map((_, index) => (
      <svg key={index} className="h-4 w-4 text-accent-500" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.802-2.034a1 1 0 00-1.175 0l-2.802 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.46 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
)

export const Testimonials = () => (
  <section className="bg-surface-50 py-20 dark:bg-surface-800">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Testimonials</p>
        <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">
          Teams move faster with CodexPDF
        </h2>
        <p className="mt-2 text-surface-600 dark:text-surface-300">
          Trusted by teams managing sensitive documents every day.
        </p>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div key={testimonial.name} className="rounded-3xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-900">
            <StarRow />
            <p className="mt-4 text-sm text-surface-600 dark:text-surface-300">“{testimonial.quote}”</p>
            <div className="mt-6 text-sm font-semibold text-surface-900 dark:text-white">
              {testimonial.name}
            </div>
            <div className="text-xs text-surface-500 dark:text-surface-400">
              {testimonial.role} · {testimonial.company}
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
)
