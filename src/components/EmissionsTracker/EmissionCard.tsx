import { memo } from 'react'
import type { Emission } from '../../types/emission'
import { CATEGORY_STYLES, formatKg, formatRelative } from './format'

interface EmissionCardProps {
  emission: Emission
}

/** Tarjeta presentacional. `memo` evita re-renderizarla si su emisión no cambió. */
export const EmissionCard = memo(function EmissionCard({ emission }: EmissionCardProps) {
  const style = CATEGORY_STYLES[emission.category]
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-slate-900">{emission.source_name}</h3>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
        >
          <span aria-hidden="true">{style.icon}</span>
          {emission.category}
        </span>
      </div>
      <p className="text-2xl font-bold tracking-tight text-slate-900">
        {formatKg(emission.co2_kg)}
        <span className="ml-1 text-sm font-medium text-slate-500">
          CO<sub>2</sub>e
        </span>
      </p>
      <p className="text-xs text-slate-500">
        <time dateTime={emission.measured_at} title={new Date(emission.measured_at).toLocaleString('es-CO')}>
          Medido {formatRelative(emission.measured_at)}
        </time>
      </p>
    </article>
  )
})
