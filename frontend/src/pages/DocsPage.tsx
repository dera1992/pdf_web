import { Link } from 'react-router-dom'

export const DocsPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center text-surface-900 dark:bg-surface-900 dark:text-white">
    <h1 className="text-3xl font-semibold">Documentation</h1>
    <p className="mt-3 max-w-xl text-sm text-surface-600 dark:text-surface-300">
      Product documentation and API references are on the way. Need help sooner? Contact our team.
    </p>
    <Link
      to="/"
      className="mt-6 rounded-full border border-accent-500 bg-accent-500 px-4 py-2 text-sm font-semibold text-white"
    >
      Back to home
    </Link>
  </div>
)
