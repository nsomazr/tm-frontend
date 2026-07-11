import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adsApi } from '../../../api'
import FileUploadField from '../../../components/ui/FileUploadField'
import ListPagination from '../../../components/ui/ListPagination'
import { toast } from '../../../components/ui/toast'
import { AD_AUDIENCES, AD_PLACEMENTS } from '../../../constants/adPlacements'
import { usePagination } from '../../../hooks/usePagination'
import type { AdCampaign, AdPlacement, AdAudience } from '../../../types'
import { adStatusBadgeClass } from './adAdminUtils'

type ViewMode = 'list' | 'form'

const EMPTY_FORM = {
  title: '',
  company_name: '',
  headline: '',
  body_text: '',
  cta_label: 'Learn more',
  link_url: '',
  open_in_new_tab: true,
  placements: [] as AdPlacement[],
  priority: 0,
  is_active: true,
  is_hidden: false,
  audience: 'all' as AdAudience,
  country_codes: '',
  starts_at: '',
  ends_at: '',
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromLocalInputValue(value: string): string | null {
  if (!value.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function formatSaveError(err: unknown): string {
  if (err instanceof Error && err.message && !('response' in err)) {
    return err.message
  }
  const axiosErr = err as { response?: { data?: unknown } }
  const data = axiosErr.response?.data
  if (!data) {
    return err instanceof Error ? err.message : 'Request failed'
  }
  if (typeof data === 'string') return data
  if (typeof data === 'object' && data !== null) {
    const record = data as Record<string, unknown>
    if (typeof record.detail === 'string') return record.detail
    const parts: string[] = []
    for (const [key, value] of Object.entries(record)) {
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.map(String).join(', ')}`)
      } else if (value != null) {
        parts.push(`${key}: ${String(value)}`)
      }
    }
    if (parts.length) return parts.join(' · ')
  }
  return 'Request failed'
}

export default function AdsCampaignsPage() {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [editing, setEditing] = useState<AdCampaign | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)

  const { data: campaigns = [], isLoading, isError } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: () => adsApi.adminList(),
  })

  const openNewCampaign = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setViewMode('form')
  }

  const openEditCampaign = (campaign: AdCampaign) => {
    setEditing(campaign)
    setImageFile(null)
    setForm({
      title: campaign.title,
      company_name: campaign.company_name,
      headline: campaign.headline,
      body_text: campaign.body_text,
      cta_label: campaign.cta_label,
      link_url: campaign.link_url,
      open_in_new_tab: campaign.open_in_new_tab,
      placements: campaign.placements,
      priority: campaign.priority,
      is_active: campaign.is_active,
      is_hidden: campaign.is_hidden,
      audience: campaign.audience,
      country_codes: (campaign.country_codes || []).join(', '),
      starts_at: toLocalInputValue(campaign.starts_at),
      ends_at: toLocalInputValue(campaign.ends_at),
    })
    setViewMode('form')
  }

  const backToList = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setViewMode('list')
  }

  const buildFormData = () => {
    const fd = new FormData()
    fd.append('title', form.title.trim())
    fd.append('company_name', form.company_name.trim())
    fd.append('headline', form.headline.trim())
    fd.append('body_text', form.body_text.trim())
    fd.append('cta_label', form.cta_label.trim() || 'Learn more')
    fd.append('link_url', form.link_url.trim())
    fd.append('open_in_new_tab', form.open_in_new_tab ? 'true' : 'false')
    fd.append('placements', JSON.stringify(form.placements))
    fd.append('priority', String(form.priority))
    fd.append('is_active', form.is_active ? 'true' : 'false')
    fd.append('is_hidden', form.is_hidden ? 'true' : 'false')
    fd.append('audience', form.audience)
    const codes = form.country_codes
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean)
    fd.append('country_codes', JSON.stringify(codes))
    const startsAt = fromLocalInputValue(form.starts_at)
    const endsAt = fromLocalInputValue(form.ends_at)
    if (startsAt) fd.append('starts_at', startsAt)
    if (endsAt) fd.append('ends_at', endsAt)
    if (imageFile) fd.append('image', imageFile)
    return fd
  }

  const saveAd = useMutation({
    mutationFn: async () => {
      if (!form.title.trim() || !form.company_name.trim() || !form.link_url.trim()) {
        throw new Error('Title, company, and link URL are required.')
      }
      if (form.placements.length === 0) {
        throw new Error('Select at least one placement.')
      }
      const fd = buildFormData()
      if (editing) return adsApi.adminUpdate(editing.id, fd)
      return adsApi.adminCreate(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ads'] })
      qc.invalidateQueries({ queryKey: ['admin-ads-stats'] })
      qc.invalidateQueries({ queryKey: ['ads'] })
      toast.success(editing ? 'Campaign updated' : 'Campaign created')
      backToList()
    },
    onError: (err: unknown) => {
      toast.error('Could not save campaign', { description: formatSaveError(err) })
    },
  })

  const deleteAd = useMutation({
    mutationFn: (id: number) => adsApi.adminDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ads'] })
      qc.invalidateQueries({ queryKey: ['admin-ads-stats'] })
      qc.invalidateQueries({ queryKey: ['ads'] })
      toast.success('Campaign deleted')
      if (editing) backToList()
    },
    onError: (err: Error) => {
      toast.error('Could not delete campaign', { description: err.message })
    },
  })

  const toggleHidden = useMutation({
    mutationFn: async (campaign: AdCampaign) => {
      const fd = new FormData()
      fd.append('is_hidden', campaign.is_hidden ? 'false' : 'true')
      return adsApi.adminUpdate(campaign.id, fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ads'] })
      qc.invalidateQueries({ queryKey: ['ads'] })
    },
  })

  const sortedCampaigns = useMemo(
    () => [...campaigns].sort((a, b) => b.priority - a.priority || b.id - a.id),
    [campaigns],
  )
  const campaignPagination = usePagination(sortedCampaigns)

  const togglePlacement = (placement: AdPlacement) => {
    setForm((prev) => ({
      ...prev,
      placements: prev.placements.includes(placement)
        ? prev.placements.filter((code) => code !== placement)
        : [...prev.placements, placement],
    }))
  }

  const formTitle = editing ? 'Edit campaign' : 'New campaign'

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-app-text">Campaigns</h1>
        <p className="text-sm text-app-text-muted mt-1">
          Sponsored messages from exploration companies and partners.
        </p>
      </div>

      <div className="card-flat !p-0 overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b app-divider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="segmented w-full sm:w-auto" role="tablist" aria-label="Campaign views">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                viewMode === 'list' ? 'segmented-btn-active' : ''
              }`}
            >
              All campaigns
              {campaigns.length > 0 && (
                <span className="ml-1.5 tabular-nums text-app-text-muted">({campaigns.length})</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'form'}
              onClick={() => {
                if (viewMode !== 'form') openNewCampaign()
              }}
              className={`segmented-btn flex-1 sm:flex-none px-4 py-2 text-sm ${
                viewMode === 'form' ? 'segmented-btn-active' : ''
              }`}
            >
              {editing ? 'Edit campaign' : 'New campaign'}
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div>
            {isLoading ? (
              <p className="px-5 py-12 text-center text-sm text-app-text-muted">Loading campaigns…</p>
            ) : isError ? (
              <p className="px-5 py-12 text-center text-sm text-red-600">
                Could not load campaigns. Refresh the page to try again.
              </p>
            ) : sortedCampaigns.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-app-text-muted">No campaigns yet.</p>
                <button type="button" onClick={openNewCampaign} className="btn-primary text-sm mt-4">
                  Create first campaign
                </button>
              </div>
            ) : (
              <>
              <ul className="divide-y app-divider">
                {campaignPagination.pageItems.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-app-text">{campaign.title}</p>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${adStatusBadgeClass(campaign.status_label)}`}
                        >
                          {campaign.status_label}
                        </span>
                      </div>
                      <p className="text-xs text-app-text-muted mt-0.5">{campaign.company_name}</p>
                      <p className="text-[11px] text-app-text-muted mt-1">
                        {campaign.placement_labels.join(' · ')}
                      </p>
                      <p className="text-[11px] text-app-text-muted mt-1 tabular-nums">
                        {campaign.impression_count.toLocaleString()} impressions ·{' '}
                        {campaign.click_count.toLocaleString()} clicks · {campaign.click_through_rate}% CTR
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCampaign(campaign)}
                        className="btn-secondary text-xs !py-1.5 !px-3"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHidden.mutate(campaign)}
                        className="btn-secondary text-xs !py-1.5 !px-3"
                      >
                        {campaign.is_hidden ? 'Show' : 'Hide'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.confirm(`Delete "${campaign.title}"?`, {
                            description: 'This campaign will be removed permanently.',
                            confirmLabel: 'Delete',
                            destructive: true,
                            onConfirm: () => deleteAd.mutate(campaign.id),
                          })
                        }}
                        className="text-xs text-red-600 hover:underline px-2 py-1.5"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {campaignPagination.hasMultiplePages && (
                <div className="px-4 sm:px-5 py-3 border-t app-divider bg-app-subtle/20">
                  <ListPagination
                    page={campaignPagination.page}
                    pageCount={campaignPagination.pageCount}
                    total={campaignPagination.total}
                    pageSize={campaignPagination.pageSize}
                    onPageChange={campaignPagination.setPage}
                  />
                </div>
              )}
              </>
            )}
          </div>
        ) : (
          <div className="px-4 sm:px-5 py-5 space-y-5">
            <p className="text-sm font-medium text-app-text">{formTitle}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-app-text">Title</span>
                <input
                  className="input mt-1.5 w-full"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Lithium exploration services"
                  autoFocus
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Company</span>
                <input
                  className="input mt-1.5 w-full"
                  value={form.company_name}
                  onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))}
                  placeholder="Acme Geoservices Ltd"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Link URL</span>
                <input
                  type="url"
                  className="input mt-1.5 w-full"
                  value={form.link_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-app-text">Headline</span>
                <input
                  className="input mt-1.5 w-full"
                  value={form.headline}
                  onChange={(e) => setForm((prev) => ({ ...prev, headline: e.target.value }))}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-app-text">Body</span>
                <textarea
                  className="input mt-1.5 w-full min-h-[4rem]"
                  value={form.body_text}
                  onChange={(e) => setForm((prev) => ({ ...prev, body_text: e.target.value }))}
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-app-text">CTA label</span>
                <input
                  className="input mt-1.5 w-full"
                  value={form.cta_label}
                  onChange={(e) => setForm((prev) => ({ ...prev, cta_label: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Priority</span>
                <input
                  type="number"
                  className="input mt-1.5 w-full"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, priority: Number(e.target.value) || 0 }))
                  }
                />
              </label>
            </div>

            <div>
              <span className="text-sm font-medium text-app-text">Placements</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {AD_PLACEMENTS.map((placement) => {
                  const selected = form.placements.includes(placement.value)
                  return (
                    <button
                      key={placement.value}
                      type="button"
                      onClick={() => togglePlacement(placement.value)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-terra-500 bg-terra-500/10 text-terra-800 dark:text-terra-200'
                          : 'border-app-border text-app-text-muted hover:bg-app-subtle'
                      }`}
                    >
                      {placement.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-app-text">Audience</span>
                <select
                  className="input mt-1.5 w-full"
                  value={form.audience}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      audience: e.target.value as typeof form.audience,
                    }))
                  }
                >
                  {AD_AUDIENCES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Countries</span>
                <input
                  className="input mt-1.5 w-full"
                  value={form.country_codes}
                  onChange={(e) => setForm((prev) => ({ ...prev, country_codes: e.target.value }))}
                  placeholder="TZ, KE (empty = all)"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Starts</span>
                <input
                  type="datetime-local"
                  className="input mt-1.5 w-full"
                  value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-app-text">Ends</span>
                <input
                  type="datetime-local"
                  className="input mt-1.5 w-full"
                  value={form.ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))}
                />
              </label>
            </div>

            <FileUploadField
              label="Banner image"
              accept="image/*"
              value={imageFile}
              onChange={setImageFile}
              placeholder={editing?.image_url ? 'Replace image' : 'Upload image'}
              hint="Optional. PNG or JPG recommended."
            />

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t app-divider pt-4">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                />
                <span>Active</span>
              </label>
              <label className="checkbox-label checkbox-label--muted">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.is_hidden}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_hidden: e.target.checked }))}
                />
                <span>Hidden</span>
              </label>
              <label className="checkbox-label checkbox-label--muted">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.open_in_new_tab}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, open_in_new_tab: e.target.checked }))
                  }
                />
                <span>Open in new tab</span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button type="button" onClick={backToList} className="btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAd.mutate()}
                disabled={saveAd.isPending}
                className="btn-primary"
              >
                {saveAd.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create campaign'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
