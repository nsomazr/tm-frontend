import type { ReactNode } from 'react'

interface ReportSetupPanelProps {
  layers: ReactNode
  locations?: ReactNode
  hasLayersSelected?: boolean
}

export default function ReportSetupPanel({
  layers,
  locations,
  hasLayersSelected = false,
}: ReportSetupPanelProps) {
  return (
    <section className="report-setup">
      <header className="report-setup__header">
        <h2 className="report-setup__title">Build your report scope</h2>
        <p className="report-setup__lead">
          Choose the mineral layer your report is based on, then optionally narrow it to admin
          boundaries or a custom point/polygon (with buffer).
        </p>
      </header>

      <ol className="report-setup__steps">
        <li className="report-setup__step report-setup__step--done">
          <div className="report-setup__step-marker" aria-hidden>
            <span className="report-setup__step-num">1</span>
          </div>
          <div className="report-setup__step-panel">
            <div className="report-setup__step-head">
              <h3 className="report-setup__step-title">Map layer</h3>
              <p className="report-setup__step-desc">Required. Sets the commodity and mapped coverage.</p>
            </div>
            <div className="report-setup__step-body">{layers}</div>
          </div>
        </li>

        <li
          className={`report-setup__step ${hasLayersSelected ? 'report-setup__step--active' : 'report-setup__step--waiting'}`}
        >
          <div className="report-setup__step-marker" aria-hidden>
            <span className="report-setup__step-num">2</span>
          </div>
          <div className="report-setup__step-panel">
            <div className="report-setup__step-head">
              <div className="report-setup__step-title-row">
                <h3 className="report-setup__step-title">Locations</h3>
                <span className="report-setup__optional">Optional</span>
              </div>
              <p className="report-setup__step-desc">
                Filter by regions/districts, or set a point/polygon with an optional buffer (max 20
                km). Skip to use the full layer area.
              </p>
            </div>
            <div className="report-setup__step-body">
              {hasLayersSelected && locations ? (
                locations
              ) : (
                <div className="report-setup__waiting">
                  <span className="report-setup__waiting-icon" aria-hidden>
                    ◫
                  </span>
                  <p>Select a map layer above to choose locations.</p>
                </div>
              )}
            </div>
          </div>
        </li>
      </ol>
    </section>
  )
}
