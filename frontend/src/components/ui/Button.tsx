import { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) => {
  const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-accent-600 text-white hover:bg-accent-700',
    secondary: 'bg-surface-200 text-surface-900 hover:bg-surface-300 dark:bg-surface-700 dark:text-surface-50',
    ghost: 'bg-transparent text-surface-700 hover:bg-surface-200 dark:text-surface-200 dark:hover:bg-surface-700',
    outline: 'border border-surface-300 text-surface-800 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-200'
  }

  const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-2.5 py-1.5 text-sm',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4.5 py-2.5 text-base'
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}
