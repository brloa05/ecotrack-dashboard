import type { EmissionCategory } from '../../types/emission'

const kgFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
const tonFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })
const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

export const formatKg = (kg: number) => `${kgFormatter.format(kg)} kg`
export const formatTons = (kg: number) => `${tonFormatter.format(kg / 1000)} t`

export function formatRelative(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relativeFormatter.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return relativeFormatter.format(hours, 'hour')
  return relativeFormatter.format(Math.round(hours / 24), 'day')
}

/** Clases de Tailwind por categoría (literales completos para que Tailwind los detecte). */
export const CATEGORY_STYLES: Record<EmissionCategory, { badge: string; bar: string; icon: string }> = {
  Transporte: { badge: 'bg-sky-100 text-sky-800 ring-sky-200', bar: 'bg-sky-500', icon: '🚚' },
  Energía: { badge: 'bg-amber-100 text-amber-800 ring-amber-200', bar: 'bg-amber-500', icon: '⚡' },
  Residuos: { badge: 'bg-violet-100 text-violet-800 ring-violet-200', bar: 'bg-violet-500', icon: '♻️' },
}
