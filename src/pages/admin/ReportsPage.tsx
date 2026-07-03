import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reportsApi, mineralsApi, geographyApi } from '../../api'
import { useDisplayName } from '../../i18n/useDisplayName'

export default function ReportsPage() {
  const qc = useQueryClient()
  const displayName = useDisplayName()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    mineral: '',
    region: '',
    description: '',
    price: '25000',
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => reportsApi.adminList().then((r) => r.data),
  })

  const { data: minerals } = useQuery({
    queryKey: ['minerals'],
    queryFn: () => mineralsApi.list().then((r) => r.data),
  })

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => geographyApi.regions().then((r) => r.data),
  })

  const createReport = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('mineral', form.mineral)
      if (form.region) fd.append('region', form.region)
      fd.append('description', form.description)
      fd.append('price', form.price)
      if (pdfFile) fd.append('pdf_file', pdfFile)
      return reportsApi.create(fd)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-reports'] })
      setShowForm(false)
      setForm({ title: '', mineral: '', region: '', description: '', price: '25000' })
      setPdfFile(null)
    },
  })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : 'Upload Report'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-8">
          <h2 className="font-bold mb-4">New Report</h2>
          <div className="grid gap-4">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
            <select
              value={form.mineral}
              onChange={(e) => setForm({ ...form, mineral: e.target.value })}
              className="input"
            >
              <option value="">Select Mineral</option>
              {minerals?.results.map((m) => (
                <option key={m.id} value={m.id}>{displayName(m)}</option>
              ))}
            </select>
            <select
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="input"
            >
              <option value="">Select Region (optional)</option>
              {regions?.results.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input"
              rows={3}
            />
            <input
              type="number"
              placeholder="Price (TZS)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input"
            />
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
            <button
              onClick={() => createReport.mutate()}
              disabled={!form.title || !form.mineral || createReport.isPending}
              className="btn-primary"
            >
              Create Report
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {reports?.results.map((r) => (
          <div key={r.id} className="card">
            <h3 className="font-bold">{r.title}</h3>
            <p className="text-sm text-gray-500">{r.mineral_name} · {Number(r.price).toLocaleString()} {r.currency}</p>
            {r.ai_summary && (
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{r.ai_summary.summary}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
