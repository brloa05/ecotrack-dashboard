import { useCallback, useEffect, useMemo, useState } from 'react'
import { emissionsService, type EmissionsService } from '../services/emissions.service'
import { EMISSION_CATEGORIES } from '../types/emission'
import type { Emission, EmissionCategory, EmissionsStats, NewEmission } from '../types/emission'

export interface UseEmissionsResult {
  emissions: Emission[]
  stats: EmissionsStats
  loading: boolean
  error: string | null
  submitting: boolean
  submitError: string | null
  mode: EmissionsService['mode']
  /** Inserta una medición. Devuelve `true` si se guardó, para que el formulario se limpie. */
  addEmission: (input: NewEmission) => Promise<boolean>
  reload: () => Promise<void>
}

const toMessage = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

/** Agrega una emisión al inicio evitando duplicados (la inserción propia también llega por Realtime). */
function prependUnique(list: Emission[], emission: Emission): Emission[] {
  return list.some((e) => e.id === emission.id) ? list : [emission, ...list]
}

export function useEmissions(service: EmissionsService = emissionsService): UseEmissionsResult {
  const [emissions, setEmissions] = useState<Emission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Carga inicial + suscripción en tiempo real. `active` evita actualizar estado tras desmontar.
  useEffect(() => {
    let active = true
    service.list().then(
      (data) => {
        if (!active) return
        setEmissions(data)
        setLoading(false)
      },
      (err: unknown) => {
        if (!active) return
        setError(toMessage(err, 'Error al cargar las emisiones'))
        setLoading(false)
      },
    )
    const unsubscribe = service.subscribe((emission) => {
      if (active) setEmissions((prev) => prependUnique(prev, emission))
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [service])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setEmissions(await service.list())
    } catch (err) {
      setError(toMessage(err, 'Error al cargar las emisiones'))
    } finally {
      setLoading(false)
    }
  }, [service])

  const addEmission = useCallback(
    async (input: NewEmission) => {
      setSubmitting(true)
      setSubmitError(null)
      try {
        const created = await service.create(input)
        setEmissions((prev) => prependUnique(prev, created))
        return true
      } catch (err) {
        setSubmitError(toMessage(err, 'No se pudo guardar la medición'))
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [service],
  )

  // Solo se recalcula cuando cambia la lista, no en cada render (p. ej. al escribir en el formulario).
  const stats = useMemo<EmissionsStats>(() => {
    const byCategory = Object.fromEntries(EMISSION_CATEGORIES.map((c) => [c, 0])) as Record<
      EmissionCategory,
      number
    >
    let totalCo2 = 0
    for (const e of emissions) {
      byCategory[e.category] += e.co2_kg
      totalCo2 += e.co2_kg
    }
    return { totalCo2, byCategory, count: emissions.length }
  }, [emissions])

  return {
    emissions,
    stats,
    loading,
    error,
    submitting,
    submitError,
    mode: service.mode,
    addEmission,
    reload,
  }
}
