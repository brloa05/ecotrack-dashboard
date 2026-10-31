import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { EMISSION_CATEGORIES, isEmissionCategory } from '../types/emission'
import type { Emission, EmissionCategory, NewEmission } from '../types/emission'

/** Contrato que el hook consume; no sabe si detrás hay Supabase o datos simulados. */
export interface EmissionsService {
  readonly mode: 'supabase' | 'mock'
  list(): Promise<Emission[]>
  create(input: NewEmission): Promise<Emission>
  /** Escucha nuevas mediciones en tiempo real. Devuelve la función para desuscribirse. */
  subscribe(onInsert: (emission: Emission) => void): () => void
}

const TABLE = 'emissions'

/** Valida y normaliza una fila (PostgREST/Realtime pueden enviar `numeric` como string). */
function toEmission(row: Record<string, unknown>): Emission {
  const category = String(row.category)
  if (!isEmissionCategory(category)) {
    throw new Error(`Categoría desconocida recibida de la base de datos: ${category}`)
  }
  return {
    id: String(row.id),
    source_name: String(row.source_name),
    category,
    co2_kg: Number(row.co2_kg),
    measured_at: String(row.measured_at),
  }
}

function createSupabaseService(client: SupabaseClient): EmissionsService {
  return {
    mode: 'supabase',

    async list() {
      const { data, error } = await client
        .from(TABLE)
        .select('id, source_name, category, co2_kg, measured_at')
        .order('measured_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(toEmission)
    },

    async create(input) {
      const { data, error } = await client.from(TABLE).insert(input).select().single()
      if (error) throw new Error(error.message)
      return toEmission(data)
    },

    subscribe(onInsert) {
      const channel = client
        .channel('emissions-inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) =>
          onInsert(toEmission(payload.new)),
        )
        .subscribe()
      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Modo demo: mismo contrato, datos en memoria con latencia simulada.
// `?demo=error` fuerza un fallo de carga y `?demo=slow` alarga la latencia.
// ---------------------------------------------------------------------------

const SAMPLE_SOURCES: Record<EmissionCategory, [string, ...string[]]> = {
  Transporte: ['Flota de camiones Norte', 'Vuelos corporativos', 'Montacargas bodega 2'],
  Energía: ['Planta de producción A', 'Data center Bogotá', 'Oficinas sede central'],
  Residuos: ['Relleno sanitario municipal', 'Residuos orgánicos cafetería', 'Lodos planta de agua'],
}

function pickRandom<T>(items: readonly [T, ...T[]]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]
}

function createMockService(): EmissionsService {
  const params = new URLSearchParams(window.location.search)
  const demo = params.get('demo')
  const latency = demo === 'slow' ? 4000 : 700
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString()
  let rows: Emission[] = [
    { id: 'm-1', source_name: 'Flota de camiones Norte', category: 'Transporte', co2_kg: 1840.5, measured_at: minutesAgo(12) },
    { id: 'm-2', source_name: 'Planta de producción A', category: 'Energía', co2_kg: 3210, measured_at: minutesAgo(45) },
    { id: 'm-3', source_name: 'Relleno sanitario municipal', category: 'Residuos', co2_kg: 960.25, measured_at: minutesAgo(90) },
    { id: 'm-4', source_name: 'Data center Bogotá', category: 'Energía', co2_kg: 1275.8, measured_at: minutesAgo(180) },
    { id: 'm-5', source_name: 'Vuelos corporativos', category: 'Transporte', co2_kg: 2450, measured_at: minutesAgo(300) },
  ]
  let nextId = rows.length + 1

  return {
    mode: 'mock',

    async list() {
      await wait(latency)
      if (demo === 'error') throw new Error('No se pudo conectar con el servidor de emisiones (simulado).')
      return [...rows]
    },

    async create(input) {
      await wait(latency)
      const emission: Emission = { ...input, id: `m-${nextId++}`, measured_at: new Date().toISOString() }
      rows = [emission, ...rows]
      return emission
    },

    subscribe(onInsert) {
      // Simula un sensor IoT que reporta una medición cada 20 s.
      const timer = setInterval(() => {
        const category = pickRandom(EMISSION_CATEGORIES)
        const emission: Emission = {
          id: `m-${nextId++}`,
          source_name: `${pickRandom(SAMPLE_SOURCES[category])} (sensor)`,
          category,
          co2_kg: Math.round(Math.random() * 90_000) / 100 + 50,
          measured_at: new Date().toISOString(),
        }
        rows = [emission, ...rows]
        onInsert(emission)
      }, 20_000)
      return () => clearInterval(timer)
    },
  }
}

export const emissionsService: EmissionsService = supabase
  ? createSupabaseService(supabase)
  : createMockService()
