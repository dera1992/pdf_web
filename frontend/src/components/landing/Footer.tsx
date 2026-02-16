import { Link } from 'react-router-dom'
import { PDF_TOOLS } from '../../data/pdfTools'

const footerLinks = {
  Product: [
    { label: 'Overview', to: '/' },
    { label: 'Security', to: '/security' },
    { label: 'Pricing', to: '/pricing' },
    { label: 'Docs', to: '/docs' }
  ],
  Tools: PDF_TOOLS.slice(0, 8).map((tool) => ({ label: tool.name, to: tool.route })),
  Company: [
    { label: 'About', to: '/docs' },
    { label: 'Contact', to: '/docs' },
    { label: 'Blog', to: '/docs' }
  ],
  Legal: [
    { label: 'Privacy', to: '/docs' },
    { label: 'Terms', to: '/docs' },
    { label: 'Cookies', to: '/docs' }
  ]
}

export const Footer = () => (
  <footer className="bg-white py-16 dark:bg-surface-900">
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.5fr_2fr]">
        <div>
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-white shadow">
              <span className="text-sm font-bold">PDF</span>
            </span>
            CodexPDF
          </Link>
          <p className="mt-4 text-sm text-surface-600 dark:text-surface-300">
            The premium PDF workspace for high-trust teams.
          </p>
          <Link to="/tools" className="mt-4 inline-block text-sm font-semibold text-accent-600 hover:text-accent-700">
            Browse all tools →
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{group}</p>
              <ul className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-300">
                {links.map((link) => (
                  <li key={`${group}-${link.label}`}>
                    <Link to={link.to} className="transition hover:text-accent-600">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-10 border-t border-surface-200 pt-6 text-xs text-surface-500 dark:border-surface-800 dark:text-surface-400">
        © {new Date().getFullYear()} CodexPDF. All rights reserved.
      </div>
    </div>
  </footer>
)
