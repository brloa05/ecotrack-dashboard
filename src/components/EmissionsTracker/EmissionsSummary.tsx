import { memo } from 'react'
import { EMISSION_CATEGORIES } from '../../types/emission'
import type { EmissionsStats } from '../../types/emission'
import { CATEGORY_STYLES, formatKg, formatTons } from './format'

interface EmissionsSummaryProps {
  stats: EmissionsStats
}

export const EmissionsSummary = memo(function EmissionsSummary({ stats }: EmissionsSummaryProps) {
  return (
    <section aria-label="Resumen de emisiones" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-emerald-700 p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-emerald-100">Total emitido</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{formatTons(stats.totalCo2)}</p>
        <p className="mt-1 text-sm text-emerald-100">
          CO₂e · {stats.count} {stats.count === 1 ? 'medición' : 'mediciones'}
        </p>
      </div>

      {EMISSION_CATEGORIES.map((category) => {
        const value = stats.byCategory[category]
        const share = stats.totalCo2 > 0 ? Math.round((value / stats.totalCo2) * 100) : 0
        const style = CATEGORY_STYLES[category]
        return (
          <div key={category} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <span aria-hidden="true">{style.icon}</span>
              {category}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{formatKg(value)}</p>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
              role="meter"
              aria-label={`Participación de ${category}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={share}
            >
              <div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${share}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{share}% del total</p>
          </div>
        )
      })}
    </section>
  )
})
