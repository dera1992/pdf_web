import { cn } from '../../utils/cn'

type SkeletonProps = {
  className?: string
}

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('animate-pulse rounded-md bg-surface-200 dark:bg-surface-800', className)} />
)
