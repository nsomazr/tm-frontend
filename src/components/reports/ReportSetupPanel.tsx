import type { ReactNode } from 'react'

interface ReportSetupPanelProps {
  layers: ReactNode
  locations: ReactNode
}

export default function ReportSetupPanel({ layers, locations }: ReportSetupPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-app-text">Layer & location</h2>
        <p className="text-sm text-app-text-secondary mt-1 max-w-2xl">
          Choose map layers for this report, then pick locations. The primary layer sets the commodity.
        </p>
      </div>
      <div className="rounded-xl border border-app-border overflow-hidden">
        <div className="grid lg:grid-cols-2 lg:divide-x divide-y lg:divide-y-0 divide-app-border">
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-app-text mb-3">Layers</h3>
            {layers}
          </div>
          <div className="p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-app-text mb-3">Locations</h3>
            {locations}
          </div>
        </div>
      </div>
    </section>
  )
}
