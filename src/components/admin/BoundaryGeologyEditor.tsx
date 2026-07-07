import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { geographyApi } from '../../api'
import { toast } from '../ui/toast'
import { useTranslation } from '../../i18n/LocaleContext'
import { BOUNDARY_LEVEL_OPTIONS } from '../map/boundaryLevelOptions'
import type { AdminBoundaryGeology, BoundaryGeologyMetadata } from '../../types'

interface BoundaryGeologyEditorProps {
  country: string
}

const EMPTY_METADATA: BoundaryGeologyMetadata = {
  scope: 'local',
  formations: '',
  lithology: '',
  stratigraphy: '',
  tectonic_setting: '',
  age: '',
  data_sources: '',
}

export default function BoundaryGeologyEditor({ country }: BoundaryGeologyEditorProps) {
  const { m } = useTranslation()
  const qc = useQueryClient()
  const g = m.adminBoundaries.geology
  const [level, setLevel] = useState(1)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [summary, setSummary] = useState('')
  const [summarySw, setSummarySw] = useState('')
  const [metadata, setMetadata] = useState<BoundaryGeologyMetadata>(EMPTY_METADATA)
  const [docTitle, setDocTitle] = useState('')
  const [docScope, setDocScope] = useState<'local' | 'regional' | 'global'>('local')
  const [docFile, setDocFile] = useState<File | null>(null)

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['admin-boundary-items', country, level, search],
    queryFn: () =>
      geographyApi
        .adminBoundaryItems({ country, level, q: search || undefined })
        .then((r) => r.data),
  })

  const items = itemsData?.results ?? []

  const { data: geology, isLoading: geologyLoading } = useQuery({
    queryKey: ['admin-boundary-geology', selectedId],
    queryFn: () => geographyApi.adminBoundaryGeology(selectedId!).then((r) => r.data),
    enabled: selectedId != null,
  })

  useEffect(() => {
    if (!geology) return
    setSummary(geology.geological_summary || '')
    setSummarySw(geology.geological_summary_sw || '')
    setMetadata({ ...EMPTY_METADATA, ...(geology.geological_metadata || {}) })
  }, [geology])

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error('Select a boundary')
      const formations = metadata.formations
      const formationsValue = Array.isArray(formations)
        ? formations
        : String(formations || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
      return geographyApi.updateAdminBoundaryGeology(selectedId, {
        geological_summary: summary,
        geological_summary_sw: summarySw,
        geological_metadata: {
          ...metadata,
          formations: formationsValue.length ? formationsValue : undefined,
        },
      })
    },
    onSuccess: () => {
      toast.success(g.saveSuccess)
      void qc.invalidateQueries({ queryKey: ['admin-boundary-items', country] })
      void qc.invalidateQueries({ queryKey: ['admin-boundary-geology', selectedId] })
    },
    onError: (err: Error) => {
      toast.error(g.saveFailed, { description: err.message })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !docFile) throw new Error('Choose a file')
      const fd = new FormData()
      fd.append('file', docFile)
      fd.append('title', docTitle || docFile.name)
      fd.append('scope', docScope)
      return geographyApi.uploadBoundaryGeologyDocument(selectedId, fd)
    },
    onSuccess: () => {
      toast.success(g.uploadSuccess)
      setDocFile(null)
      setDocTitle('')
      void qc.invalidateQueries({ queryKey: ['admin-boundary-geology', selectedId] })
      void qc.invalidateQueries({ queryKey: ['admin-boundary-items', country] })
    },
    onError: (err: Error) => {
      toast.error(g.uploadFailed, { description: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => {
      if (!selectedId) throw new Error('Select a boundary')
      return geographyApi.deleteBoundaryGeologyDocument(selectedId, documentId)
    },
    onSuccess: () => {
      toast.success(g.deleteSuccess)
      void qc.invalidateQueries({ queryKey: ['admin-boundary-geology', selectedId] })
      void qc.invalidateQueries({ queryKey: ['admin-boundary-items', country] })
    },
    onError: (err: Error) => {
      toast.error(g.deleteFailed, { description: err.message })
    },
  })

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  )

  function updateMeta<K extends keyof BoundaryGeologyMetadata>(key: K, value: BoundaryGeologyMetadata[K]) {
    setMetadata((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-app-muted leading-relaxed">{g.intro}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-app-secondary">{g.boundaryLevel}</span>
          <select
            value={level}
            onChange={(e) => {
              setLevel(Number(e.target.value))
              setSelectedId(null)
            }}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm"
          >
            {BOUNDARY_LEVEL_OPTIONS.filter((opt) => opt.value > 0).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.boundaryLabel}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-app-secondary">{g.searchBoundary}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={g.searchPlaceholder}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-app-secondary">{g.selectBoundary}</span>
        {itemsLoading ? (
          <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
        ) : (
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm"
          >
            <option value="">{g.selectPlaceholder}</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.has_geology || item.document_count > 0 ? ` · ${g.hasGeology}` : ''}
              </option>
            ))}
          </select>
        )}
      </label>

      {selectedId && (
        <div className="rounded-xl border border-app-border bg-app-bg/60 p-4 space-y-4">
          {geologyLoading ? (
            <p className="text-sm text-app-muted">{m.adminBoundaries.loading}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-app-text">
                  {selectedItem?.name ?? geology?.name}
                </h3>
                <span className="text-xs text-app-muted">{g.assistantHint}</span>
              </div>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-app-secondary">{g.scope}</span>
                <select
                  value={metadata.scope || 'local'}
                  onChange={(e) =>
                    updateMeta('scope', e.target.value as BoundaryGeologyMetadata['scope'])
                  }
                  className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                >
                  <option value="local">{g.scopeLocal}</option>
                  <option value="regional">{g.scopeRegional}</option>
                  <option value="global">{g.scopeGlobal}</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-app-secondary">{g.summaryEn}</span>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={4}
                  placeholder={g.summaryEnPlaceholder}
                  className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm leading-relaxed"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-app-secondary">{g.summarySw}</span>
                <textarea
                  value={summarySw}
                  onChange={(e) => setSummarySw(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm leading-relaxed"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ['formations', g.formations],
                    ['lithology', g.lithology],
                    ['stratigraphy', g.stratigraphy],
                    ['tectonic_setting', g.tectonic],
                    ['age', g.age],
                    ['data_sources', g.sources],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-1">
                    <span className="text-xs font-medium text-app-muted">{label}</span>
                    <input
                      type="text"
                      value={String(metadata[key] ?? '')}
                      onChange={(e) => updateMeta(key, e.target.value)}
                      className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                    />
                  </label>
                ))}
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-lg bg-terra-600 px-4 py-2 text-sm font-medium text-white hover:bg-terra-700 disabled:opacity-60"
              >
                {saveMutation.isPending ? g.saving : g.save}
              </button>

              <div className="border-t border-app-border pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-app-text">{g.documentsTitle}</h4>
                <p className="text-xs text-app-muted">{g.documentsHint}</p>

                {(geology?.documents ?? []).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-text truncate">{doc.title}</p>
                      <p className="text-xs text-app-muted">
                        {doc.scope} · {doc.extracted_text ? g.textExtracted : g.noTextExtracted}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-600 hover:underline shrink-0"
                    >
                      {g.removeDoc}
                    </button>
                  </div>
                ))}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-app-muted">{g.docTitle}</span>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-app-muted">{g.docScope}</span>
                    <select
                      value={docScope}
                      onChange={(e) => setDocScope(e.target.value as typeof docScope)}
                      className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
                    >
                      <option value="local">{g.scopeLocal}</option>
                      <option value="regional">{g.scopeRegional}</option>
                      <option value="global">{g.scopeGlobal}</option>
                    </select>
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-app-muted">{g.docFile}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.csv"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-app-secondary"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => uploadMutation.mutate()}
                  disabled={!docFile || uploadMutation.isPending}
                  className="rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm font-medium hover:bg-app-subtle disabled:opacity-60"
                >
                  {uploadMutation.isPending ? g.uploading : g.uploadDoc}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
