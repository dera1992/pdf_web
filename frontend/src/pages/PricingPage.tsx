import { Link } from 'react-router-dom'

export const PricingPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-surface-900 dark:bg-surface-900 dark:text-white">
    <h1 className="text-3xl font-semibold">Pricing details</h1>
    <p className="mt-3 max-w-xl text-sm text-surface-600 dark:text-surface-300">
      Full pricing tables are coming soon. In the meantime, explore the preview on the homepage.
    </p>
    <Link
      to="/"
      className="mt-6 rounded-full border border-accent-500 bg-accent-500 px-4 py-2 text-sm font-semibold text-white"
    >
      Back to home
    </Link>
  </div>
)
