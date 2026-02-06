import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type BadgeProps = {
  children: ReactNode
  tone?: 'neutral' | 'accent'
  className?: string
}

export const Badge = ({ children, tone = 'neutral', className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
      tone === 'accent'
        ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200'
        : 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-200',
      className
    )}
  >
    {children}
  </span>
)
