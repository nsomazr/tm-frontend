export function adStatusBadgeClass(status: string): string {
  switch (status) {
    case 'live':
      return 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
    case 'scheduled':
      return 'bg-sky-500/12 text-sky-800 dark:text-sky-300'
    case 'expired':
      return 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
    case 'hidden':
      return 'bg-slate-500/12 text-slate-700 dark:text-slate-300'
    default:
      return 'bg-app-subtle text-app-text-muted'
  }
}
