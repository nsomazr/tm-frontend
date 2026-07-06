import { useState } from 'react'

interface ReportFindingsEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function ReportFindingsEditor({ value, onChange, disabled = false }: ReportFindingsEditorProps) {
  const [editing, setEditing] = useState(false)
  const lines = value
    .split('\n')
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean)

  if (!editing && lines.length > 0) {
    return (
      <div className="report-findings-panel">
        <ul className="report-findings-panel__list">
          {lines.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
        <button
          type="button"
          className="report-findings-panel__edit-btn"
          onClick={() => setEditing(true)}
          disabled={disabled}
        >
          Edit findings
        </button>
      </div>
    )
  }

  return (
    <div className="report-findings-panel report-findings-panel--editing">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        autoFocus={editing}
        disabled={disabled}
        placeholder={
          'High prospectivity in the eastern belt\nFavourable geology for alluvial cobalt deposits\nRecommended follow-up geophysical survey'
        }
        className="report-findings-panel__textarea"
        rows={Math.max(4, lines.length + 1)}
        spellCheck
      />
      <p className="report-findings-panel__hint">One finding per line</p>
    </div>
  )
}
