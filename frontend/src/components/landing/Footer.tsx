import { Link } from 'react-router-dom'

const footerLinks = {
  Product: ['Overview', 'Security', 'Pricing', 'Roadmap'],
  Tools: ['Viewer', 'Annotations', 'Editor', 'AI OCR'],
  Company: ['About', 'Careers', 'Contact', 'Blog'],
  Legal: ['Privacy', 'Terms', 'DPA', 'Cookies']
}

const SocialIcon = ({ path, label }: { path: string; label: string }) => (
  <a
    href="#"
    className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 text-surface-500 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-300"
    aria-label={label}
  >
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  </a>
)

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
          <div className="mt-6 flex items-center gap-3">
            <SocialIcon
              label="Twitter"
              path="M19.633 7.997c.013.175.013.349.013.524 0 5.33-4.059 11.475-11.475 11.475-2.282 0-4.402-.666-6.183-1.82.324.038.636.05.973.05a8.11 8.11 0 0 0 5.026-1.73 4.055 4.055 0 0 1-3.785-2.812c.25.038.499.063.761.063.361 0 .724-.05 1.06-.138a4.05 4.05 0 0 1-3.247-3.975v-.05c.537.3 1.16.487 1.82.512a4.05 4.05 0 0 1-1.808-3.374c0-.75.2-1.437.55-2.037a11.51 11.51 0 0 0 8.357 4.24 4.569 4.569 0 0 1-.1-.924 4.05 4.05 0 0 1 7.01-2.77 7.96 7.96 0 0 0 2.57-.974 4.05 4.05 0 0 1-1.78 2.236 8.1 8.1 0 0 0 2.332-.624 8.74 8.74 0 0 1-2.025 2.112z"
            />
            <SocialIcon
              label="LinkedIn"
              path="M20.452 20.452h-3.554v-5.569c0-1.328-.028-3.037-1.852-3.037-1.852 0-2.135 1.446-2.135 2.94v5.666H9.356V9h3.414v1.561h.049c.476-.9 1.637-1.852 3.37-1.852 3.6 0 4.268 2.37 4.268 5.455v6.288zM5.337 7.433a2.063 2.063 0 1 1 0-4.126 2.063 2.063 0 0 1 0 4.126zM7.115 20.452H3.559V9h3.556v11.452z"
            />
            <SocialIcon
              label="GitHub"
              path="M12 2.248c-5.523 0-10 4.477-10 10 0 4.41 2.865 8.149 6.839 9.474.5.091.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.455-1.156-1.11-1.465-1.11-1.465-.908-.62.069-.608.069-.608 1.004.071 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.833.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.112-4.555-4.944 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025a9.56 9.56 0 0 1 2.503-.336 9.56 9.56 0 0 1 2.503.336c1.909-1.294 2.748-1.025 2.748-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.338 4.687-4.566 4.935.359.308.678.92.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.579.688.481C19.138 20.395 22 16.657 22 12.248c0-5.523-4.477-10-10-10z"
            />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{group}</p>
              <ul className="mt-4 space-y-2 text-sm text-surface-600 dark:text-surface-300">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-accent-600">
                      {link}
                    </a>
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
