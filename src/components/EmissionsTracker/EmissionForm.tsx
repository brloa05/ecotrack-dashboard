import { useId, useState, type FormEvent } from 'react'
import { EMISSION_CATEGORIES, isEmissionCategory } from '../../types/emission'
import type { EmissionCategory, NewEmission } from '../../types/emission'

interface EmissionFormProps {
  onSubmit: (input: NewEmission) => Promise<boolean>
  submitting: boolean
  submitError: string | null
}

interface FieldErrors {
  source_name?: string
  co2_kg?: string
}

function validate(sourceName: string, co2: string): FieldErrors {
  const errors: FieldErrors = {}
  const name = sourceName.trim()
  if (name.length < 3) errors.source_name = 'Escribe al menos 3 caracteres.'
  else if (name.length > 80) errors.source_name = 'Máximo 80 caracteres.'
  const value = Number(co2)
  if (co2.trim() === '' || !Number.isFinite(value)) errors.co2_kg = 'Ingresa un número válido.'
  else if (value <= 0) errors.co2_kg = 'El valor debe ser mayor que 0.'
  else if (value > 10_000_000) errors.co2_kg = 'El valor parece demasiado alto (máx. 10.000.000 kg).'
  return errors
}

const inputBase =
  'block w-full rounded-lg border bg-white px-3 py-2 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 disabled:bg-slate-50'
const inputOk = 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/30'
const inputBad = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30'

/** El estado del formulario es local: escribir aquí no re-renderiza la lista de tarjetas. */
export function EmissionForm({ onSubmit, submitting, submitError }: EmissionFormProps) {
  const id = useId()
  const [sourceName, setSourceName] = useState('')
  const [category, setCategory] = useState<EmissionCategory>('Transporte')
  const [co2, setCo2] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccess(false)
    const nextErrors = validate(sourceName, co2)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const saved = await onSubmit({ source_name: sourceName.trim(), category, co2_kg: Number(co2) })
    if (saved) {
      setSourceName('')
      setCo2('')
      setSuccess(true)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <h2 id={`${id}-title`} className="text-lg font-semibold text-slate-900">
          Nueva medición
        </h2>
        <p className="text-sm text-slate-500">Registra el CO₂ producido por una fuente.</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-name`} className="block text-sm font-medium text-slate-700">
          Nombre de la fuente
        </label>
        <input
          id={`${id}-name`}
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="Ej. Flota de camiones Norte"
          maxLength={80}
          disabled={submitting}
          aria-invalid={errors.source_name ? true : undefined}
          aria-describedby={errors.source_name ? `${id}-name-error` : undefined}
          className={`${inputBase} ${errors.source_name ? inputBad : inputOk}`}
        />
        {errors.source_name && (
          <p id={`${id}-name-error`} className="text-sm text-rose-600">
            {errors.source_name}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-category`} className="block text-sm font-medium text-slate-700">
          Categoría
        </label>
        <select
          id={`${id}-category`}
          value={category}
          onChange={(e) => {
            if (isEmissionCategory(e.target.value)) setCategory(e.target.value)
          }}
          disabled={submitting}
          className={`${inputBase} ${inputOk}`}
        >
          {EMISSION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${id}-co2`} className="block text-sm font-medium text-slate-700">
          CO₂ producido (kg)
        </label>
        <input
          id={`${id}-co2`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={co2}
          onChange={(e) => setCo2(e.target.value)}
          placeholder="0,00"
          disabled={submitting}
          aria-invalid={errors.co2_kg ? true : undefined}
          aria-describedby={errors.co2_kg ? `${id}-co2-error` : undefined}
          className={`${inputBase} ${errors.co2_kg ? inputBad : inputOk}`}
        />
        {errors.co2_kg && (
          <p id={`${id}-co2-error`} className="text-sm text-rose-600">
            {errors.co2_kg}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        )}
        {submitting ? 'Guardando…' : 'Agregar medición'}
      </button>

      <div aria-live="polite">
        {submitError && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </p>
        )}
        {success && !submitError && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            ✓ Medición registrada correctamente.
          </p>
        )}
      </div>
    </form>
  )
}
