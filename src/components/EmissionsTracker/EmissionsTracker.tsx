import { useMemo, useState } from 'react'
import { useEmissions } from '../../hooks/useEmissions'
import { EMISSION_CATEGORIES } from '../../types/emission'
import type { EmissionCategory } from '../../types/emission'
import { EmissionCard } from './EmissionCard'
import { EmissionForm } from './EmissionForm'
import { EmissionsSummary } from './EmissionsSummary'

type Filter = EmissionCategory | 'Todas'
const FILTERS: readonly Filter[] = ['Todas', ...EMISSION_CATEGORIES]

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5" aria-hidden="true">
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="mt-4 h-7 w-1/2 rounded bg-slate-200" />
      <div className="mt-4 h-3 w-1/3 rounded bg-slate-100" />
    </div>
  )
}

export function EmissionsTracker() {
  const { emissions, stats, loading, error, submitting, submitError, mode, addEmission, reload } =
    useEmissions()
  const [filter, setFilter] = useState<Filter>('Todas')

  const visible = useMemo(
    () => (filter === 'Todas' ? emissions : emissions.filter((e) => e.category === filter)),
    [emissions, filter],
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-xl text-white"
            >
              🌱
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">EcoTrack</h1>
              <p className="text-sm text-slate-500">Dashboard de Emisiones en Tiempo Real</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              mode === 'supabase'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-slate-100 text-slate-700 ring-slate-200'
            }`}
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            {mode === 'supabase' ? 'En vivo · Supabase Realtime' : 'Modo demo · datos simulados'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {!error && (loading && emissions.length === 0 ? null : <EmissionsSummary stats={stats} />)}

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <EmissionForm onSubmit={addEmission} submitting={submitting} submitError={submitError} />
          </aside>

          <section aria-labelledby="emissions-heading" aria-busy={loading} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="emissions-heading" className="text-lg font-semibold text-slate-900">
                Mediciones recientes
              </h2>
              <div role="group" aria-label="Filtrar por categoría" className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`rounded-full px-3 py-1 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                      filter === f
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="font-semibold text-rose-800">No pudimos cargar las emisiones</p>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={() => void reload()}
                  className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
                >
                  Reintentar
                </button>
              </div>
            ) : loading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <span className="sr-only" role="status">
                  Cargando emisiones…
                </span>
                {Array.from({ length: 6 }, (_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-medium text-slate-700">No hay mediciones {filter !== 'Todas' && `de ${filter}`}</p>
                <p className="mt-1 text-sm text-slate-500">Registra la primera con el formulario.</p>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
                {visible.map((emission) => (
                  <li key={emission.id}>
                    <EmissionCard emission={emission} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
