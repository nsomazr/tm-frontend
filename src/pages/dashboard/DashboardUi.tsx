import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-app-text tracking-tight">{title}</h1>
      {description && <p className="text-app-muted mt-1 text-sm">{description}</p>}
    </div>
  )
}

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-app-border bg-app-surface px-6 py-10 text-center transition-colors duration-300">
      <p className="text-sm text-app-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl bg-app-surface p-5 transition-all duration-300 ease-in-out hover:shadow-soft dark:hover:shadow-soft-dark">
      <p className="text-xs font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <p className="text-xl font-semibold text-app-text mt-1">{value}</p>
      {hint && <p className="text-xs text-app-muted mt-1">{hint}</p>}
    </div>
  )
}
