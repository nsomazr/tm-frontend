import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { analyticsApi } from '../../api'
import { toast } from '../../components/ui/toast'

type AiProviderId = 'groq' | 'gemini' | 'ollama'

const PROVIDERS: { id: AiProviderId; label: string }[] = [
  { id: 'groq', label: 'Groq' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'ollama', label: 'Ollama' },
]

function statusLabel(provider: AiProviderId, row?: { configured: boolean; available: boolean }) {
  if (!row?.configured) return 'Not configured'
  if (!row.available) return provider === 'ollama' ? 'Offline' : 'Unavailable'
  return 'Available'
}

function statusClass(provider: AiProviderId, row?: { configured: boolean; available: boolean }) {
  if (!row?.configured) return 'bg-slate-100 text-slate-600'
  if (!row.available) return 'bg-amber-50 text-amber-800'
  return 'bg-emerald-50 text-emerald-700'
}

export default function AdminAssistantSettingsPage() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['assistant-platform-settings'],
    queryFn: () => analyticsApi.assistantSettings().then((r) => r.data),
  })

  const save = useMutation({
    mutationFn: (payload: { ai_provider: AiProviderId; ai_provider_fallback: AiProviderId[] }) =>
      analyticsApi.updateAssistantSettings(payload),
    onSuccess: (res) => {
      qc.setQueryData(['assistant-platform-settings'], res.data)
      toast.success('Assistant provider settings updated')
    },
    onError: () => toast.error('Could not save assistant settings'),
  })

  const primary = (data?.ai_provider ?? 'groq') as AiProviderId
  const fallbacks = (data?.ai_provider_fallback ?? []) as AiProviderId[]

  function setPrimary(next: AiProviderId) {
    if (next === primary || save.isPending) return
    save.mutate({
      ai_provider: next,
      ai_provider_fallback: fallbacks.filter((item) => item !== next),
    })
  }

  function toggleFallback(provider: AiProviderId) {
    if (provider === primary || save.isPending) return
    const next = fallbacks.includes(provider)
      ? fallbacks.filter((item) => item !== provider)
      : [...fallbacks, provider]
    save.mutate({ ai_provider: primary, ai_provider_fallback: next })
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted mb-1">Platform</p>
        <h1 className="text-2xl font-bold text-app-text">Assistant settings</h1>
        <p className="mt-2 text-sm text-app-muted max-w-xl">
          Choose which AI provider Terra uses first. If it fails, fallbacks are tried in order.
        </p>
      </div>

      <section className="rounded-xl border border-app-border bg-app-surface overflow-hidden">
        <div className="border-b app-divider px-5 py-4">
          <h2 className="font-semibold text-app-text">Primary provider</h2>
          <p className="text-sm text-app-muted mt-1">Used first for every assistant request.</p>
        </div>

        {isLoading ? (
          <p className="px-5 py-8 text-sm text-app-muted">Loading…</p>
        ) : (
          <ul className="divide-y divide-app-border/40">
            {PROVIDERS.map((provider) => {
              const row = data?.providers?.[provider.id]
              const selected = primary === provider.id
              return (
                <li key={provider.id}>
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => setPrimary(provider.id)}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left transition-colors ${
                      selected ? 'bg-terra-500/8' : 'hover:bg-app-subtle/80'
                    } disabled:opacity-60`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        selected
                          ? 'border-terra-600 bg-terra-600 text-white'
                          : 'border-app-border-strong bg-app-surface'
                      }`}
                      aria-hidden
                    >
                      {selected && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M2.5 6l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-app-text">{provider.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(provider.id, row)}`}
                        >
                          {statusLabel(provider.id, row)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="border-t app-divider px-5 py-4">
          <h3 className="font-semibold text-app-text text-sm">Fallback providers</h3>
          <p className="text-xs text-app-text-muted mt-1 mb-3">Used when the primary provider is unavailable.</p>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.filter((provider) => provider.id !== primary).map((provider) => {
              const active = fallbacks.includes(provider.id)
              const row = data?.providers?.[provider.id]
              const disabled = !row?.available
              return (
                <button
                  key={provider.id}
                  type="button"
                  disabled={save.isPending || disabled}
                  onClick={() => toggleFallback(provider.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-terra-600 bg-terra-500/10 text-terra-800'
                      : 'border-app-border bg-app-surface text-app-text-secondary hover:bg-app-subtle'
                  } disabled:opacity-50`}
                  title={disabled ? statusLabel(provider.id, row) : undefined}
                >
                  {provider.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
