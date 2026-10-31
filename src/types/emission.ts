export const EMISSION_CATEGORIES = ['Transporte', 'Energía', 'Residuos'] as const

export type EmissionCategory = (typeof EMISSION_CATEGORIES)[number]

export interface Emission {
  id: string
  source_name: string
  category: EmissionCategory
  /** Kilogramos de CO2 equivalente producidos en la medición. */
  co2_kg: number
  measured_at: string
}

export type NewEmission = Pick<Emission, 'source_name' | 'category' | 'co2_kg'>

export interface EmissionsStats {
  totalCo2: number
  byCategory: Record<EmissionCategory, number>
  count: number
}

export function isEmissionCategory(value: string): value is EmissionCategory {
  return (EMISSION_CATEGORIES as readonly string[]).includes(value)
}
