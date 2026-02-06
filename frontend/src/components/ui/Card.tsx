import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

type CardProps = {
  children: ReactNode
  className?: string
}

export const Card = ({ children, className }: CardProps) => (
  <div className={cn('rounded-xl border border-surface-200 bg-white p-4 shadow-card dark:border-surface-800 dark:bg-surface-900', className)}>
    {children}
  </div>
)
