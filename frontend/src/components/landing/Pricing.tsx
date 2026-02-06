import { Link } from 'react-router-dom'

type Plan = {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    name: 'Free',
    price: '£0',
    description: 'For individuals getting started with PDFs.',
    features: ['Unlimited viewing', 'Basic annotations', 'Email support']
  },
  {
    name: 'Pro',
    price: '£12',
    description: 'For power users and small teams.',
    features: ['AI summaries + OCR', 'Advanced editing tools', 'Priority support', 'Secure sharing'],
    highlighted: true
  },
  {
    name: 'Business',
    price: '£29',
    description: 'For regulated teams and enterprises.',
    features: ['Compliance controls', 'SSO & role-based access', 'Audit trails', 'Dedicated success'],
    highlighted: false
  }
]

export const Pricing = () => (
  <section id="pricing" className="bg-white py-20 dark:bg-surface-900">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-600">Pricing</p>
          <h2 className="mt-2 text-3xl font-semibold text-surface-900 dark:text-white">Plans that scale with your work</h2>
          <p className="mt-2 text-surface-600 dark:text-surface-300">
            Upgrade when you need more AI, automation, and compliance.
          </p>
        </div>
        <Link to="/pricing" className="text-sm font-semibold text-accent-600 hover:text-accent-700">
          View full pricing
        </Link>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative rounded-3xl border p-6 shadow-sm transition ${
              plan.highlighted
                ? 'border-accent-500 bg-accent-50/40 shadow-card dark:border-accent-500 dark:bg-accent-600/10'
                : 'border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900'
            }`}
          >
            {plan.highlighted && (
              <span className="absolute -top-3 left-6 rounded-full bg-accent-500 px-3 py-1 text-xs font-semibold text-white">
                Most Popular
              </span>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white">{plan.name}</h3>
              <span className="text-2xl font-semibold text-surface-900 dark:text-white">{plan.price}</span>
            </div>
            <p className="mt-2 text-sm text-surface-600 dark:text-surface-300">{plan.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-surface-600 dark:text-surface-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`mt-6 w-full rounded-full border px-4 py-2 text-sm font-semibold transition ${
                plan.highlighted
                  ? 'border-accent-500 bg-accent-500 text-white hover:bg-accent-600'
                  : 'border-surface-200 text-surface-700 hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200'
              }`}
            >
              Start free trial
            </button>
          </div>
        ))}
      </div>
    </div>
  </section>
)
