import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { logoutUser } from '../../api/auth'
import { PDF_TOOLS, TOOL_CATEGORIES } from '../../data/pdfTools'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'

const menuItems = [
  { label: 'Tools', href: '/tools' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' }
]

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isToolsOpen, setIsToolsOpen] = useState(false)
  const navigate = useNavigate()
  const accessToken = useAuthStore((state) => state.accessToken)
  const refreshToken = useAuthStore((state) => state.refreshToken)
  const signOut = useAuthStore((state) => state.signOut)
  const pushToast = useToastStore((state) => state.push)

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isLoggedIn = Boolean(accessToken)

  const handleLogout = async () => {
    try {
      if (refreshToken) await logoutUser(refreshToken)
    } catch {
      pushToast({
        id: crypto.randomUUID(),
        title: 'Unable to sign out',
        description: 'Please try again.',
        tone: 'warning'
      })
    } finally {
      signOut()
      navigate('/login')
    }
  }

  const toolGrid = useMemo(
    () =>
      TOOL_CATEGORIES.map((category) => {
        const tools = PDF_TOOLS.filter((tool) => tool.category === category.id)
        return (
          <div key={category.id}>
            <p className="text-sm font-semibold text-surface-900 dark:text-white">{category.label}</p>
            <ul className="mt-3 space-y-2 text-sm text-surface-600 dark:text-surface-200">
              {tools.map((item) => (
                <li key={item.id}>
                  <Link to={item.route} className="hover:text-accent-600" onClick={() => setIsToolsOpen(false)}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )
      }),
    []
  )

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-all ${
        isScrolled
          ? 'border-surface-200/80 bg-white/80 shadow-sm backdrop-blur dark:border-surface-800 dark:bg-surface-900/80'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-surface-900 dark:text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500 text-white shadow">
            <span className="text-sm font-bold">PDF</span>
          </span>
          <span>
            Codex<span className="text-accent-500">PDF</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
          <div className="relative" onMouseLeave={() => setIsToolsOpen(false)}>
            <button
              type="button"
              onClick={() => setIsToolsOpen((prev) => !prev)}
              onMouseEnter={() => setIsToolsOpen(true)}
              className="flex items-center gap-1 text-sm font-medium text-surface-700 transition hover:text-accent-600 dark:text-surface-200"
              aria-haspopup="true"
              aria-expanded={isToolsOpen}
            >
              All tools
            </button>
            {isToolsOpen && (
              <div className="absolute left-1/2 top-full mt-4 w-[900px] -translate-x-1/2 rounded-3xl border border-surface-200 bg-white p-6 shadow-card dark:border-surface-800 dark:bg-surface-900">
                <div className="grid grid-cols-4 gap-6">{toolGrid}</div>
              </div>
            )}
          </div>

          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="text-sm font-medium text-surface-600 transition hover:text-accent-600 dark:text-surface-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isLoggedIn ? (
            <>
              <Link
                to="/dashboard"
                className="rounded-full border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded-full border border-accent-500 bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-600"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-200 text-surface-700 transition hover:border-accent-200 hover:text-accent-600 dark:border-surface-700 dark:text-surface-200 lg:hidden"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute right-0 top-0 flex h-full w-80 flex-col bg-white p-6 shadow-xl dark:bg-surface-900">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-surface-900 dark:text-white">Menu</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-full border border-surface-200 p-2 text-surface-600 dark:border-surface-700 dark:text-surface-200"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            <div className="mt-6 space-y-4 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-wide text-surface-400">Tools</p>
              {PDF_TOOLS.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.route}
                  onClick={() => setIsDrawerOpen(false)}
                  className="block text-sm font-medium text-surface-700 dark:text-surface-200"
                >
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
