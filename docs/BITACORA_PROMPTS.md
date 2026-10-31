# Bitácora de Prompts – Ciclo Spec-to-Code (EcoTrack)

**Objetivo:** implementar el componente `EmissionsTracker` y el hook `useEmissions` del
"Dashboard de Emisiones en Tiempo Real" con React + TypeScript (Vite), Supabase y Tailwind CSS,
refinando la salida de la IA en 4 iteraciones en lugar de aceptar el primer resultado.

| # | Prompt | Qué se obtuvo | Qué faltaba → motivó el siguiente prompt |
|---|--------|---------------|------------------------------------------|
| 1 | Estructura | Árbol de componentes y capas | No había contrato de datos ni modo sin backend |
| 2 | Lógica | `useEmissions` con loading/error/insert | Sin tiempo real, duplicados, `numeric` como string |
| 3 | Refinamiento | TS estricto, accesibilidad, `useMemo`/`memo` | Errores de compilación detectados por el modo estricto |
| 4 | UI y verificación | Tailwind responsive, loaders, capturas | — (versión final) |

---

## Prompt 1 – Estructura

```text
Actúa como Arquitecto Frontend Senior experto en React 19, TypeScript y Supabase.

ESPECIFICACIÓN
Componente "EmissionsTracker" para el Dashboard de Emisiones de EcoTrack:
- Listado de tarjetas con: nombre de la fuente, categoría (Transporte | Energía | Residuos)
  y kg de CO2 producido.
- Formulario para agregar nuevas mediciones.
- Custom hook "useEmissions" que gestione carga, inserción y errores contra Supabase.
- Estilos con Tailwind CSS.
La tabla ya existe en Supabase: emissions(id uuid, source_name text, category text,
co2_kg numeric, measured_at timestamptz).

TAREA
Propón SOLO la arquitectura (sin implementar todavía):
1. Árbol de carpetas dentro de src/.
2. Lista de componentes con sus props tipadas (interfaces TypeScript).
3. Responsabilidad de cada capa: componentes, hook, servicio, cliente de Supabase, tipos.
4. Regla de dependencias: los componentes nunca importan Supabase.
Formato: árbol en bloque de código + tabla "Archivo | Responsabilidad | Depende de".
```

**Resultado (v1):** la IA propuso separar `EmissionsTracker` (contenedor), `EmissionCard`,
`EmissionForm`, un hook `useEmissions` y `lib/supabase.ts`.

```
src/
├── lib/supabase.ts
├── hooks/useEmissions.ts
└── components/EmissionsTracker/
    ├── EmissionsTracker.tsx
    ├── EmissionCard.tsx
    └── EmissionForm.tsx
```

**Problemas detectados en v1:**
- El hook llamaba a `supabase.from('emissions')` directamente: si cambia el backend hay que tocar el hook.
- La categoría era `string` y no había tipo compartido `Emission`.
- No contemplaba qué pasa si no hay credenciales de Supabase (no se podría hacer la demo).

---

## Prompt 2 – Lógica (Custom Hook)

```text
Sobre la arquitectura anterior, implementa la capa de datos y el hook. Restricciones:

1. Crea src/types/emission.ts con:
   - EMISSION_CATEGORIES como tupla `as const` y el tipo EmissionCategory derivado de ella.
   - interface Emission y type NewEmission (solo los campos que llena el usuario).
2. Crea src/services/emissions.service.ts con una interfaz EmissionsService
   { list, create, subscribe } y DOS implementaciones:
   - Supabase (select ordenado por measured_at desc, insert().select().single(),
     y suscripción Realtime a INSERT con postgres_changes).
   - Mock en memoria con latencia simulada, usado cuando faltan VITE_SUPABASE_URL /
     VITE_SUPABASE_ANON_KEY.
3. useEmissions debe exponer: emissions, loading, error, submitting, submitError,
   addEmission(input): Promise<boolean>, reload().
   - Manejo de errores con try/catch y mensajes en español.
   - No actualizar estado si el componente se desmontó.
   - Limpiar la suscripción Realtime en el cleanup del useEffect.
Devuelve cada archivo completo.
```

**Resultado (v2):** el hook ya separaba loading/error de carga y de envío. Así quedó el
primer borrador del efecto de carga:

```ts
// v2 – primer borrador
const reload = useCallback(async () => {
  setLoading(true)
  setError(null)
  try { setEmissions(await service.list()) }
  catch (err) { setError(toMessage(err)) }
  finally { setLoading(false) }
}, [service])

useEffect(() => { void reload() }, [reload])
```

**Problemas detectados en v2:**
- El linter (oxlint, regla `react/set-state-in-effect`) marcó `setState` síncrono dentro del efecto → render en cascada.
- Al insertar, la fila llegaba **dos veces**: una por la respuesta de `create` y otra por el evento Realtime.
- PostgREST/Realtime pueden enviar `numeric` como string → los totales se concatenaban en vez de sumarse.
- Si el usuario cambiaba de pantalla durante la carga, se llamaba a `setState` sobre un componente desmontado.

---

## Prompt 3 – Refinamiento (restricciones de calidad)

```text
Refactoriza el código de la v2 aplicando estas restricciones, y explica cada cambio:

1. TypeScript ESTRICTO: activa "strict" y "noUncheckedIndexedAccess" en tsconfig.app.json.
   Prohibido usar `any` o `as` para silenciar errores; valida los datos externos.
2. Normaliza cada fila de Supabase con una función toEmission() que convierta co2_kg
   con Number() y valide la categoría con un type guard.
3. Evita duplicados: si una emisión con el mismo id ya está en la lista, no la agregues.
4. El efecto inicial no debe llamar setState de forma síncrona: actualiza el estado
   en los callbacks de la promesa y usa una bandera `active` para el desmontaje.
5. Optimiza re-renders:
   - Calcula los totales (total y por categoría) con useMemo dentro del hook.
   - Filtra por categoría con useMemo en el componente.
   - Envuelve EmissionCard y EmissionsSummary con React.memo.
   - El estado del formulario debe ser local para que escribir no re-renderice la lista.
6. Accesibilidad (WCAG 2.1 AA): labels asociados con htmlFor/useId, aria-invalid y
   aria-describedby en campos con error, role="alert" para errores, aria-live para
   la lista y los mensajes, aria-busy durante la carga, aria-pressed en los filtros,
   foco visible en todos los botones.
```

**Resultado (v3):**

```ts
// v3 – carga inicial sin setState síncrono, con desmontaje seguro y Realtime
useEffect(() => {
  let active = true
  service.list().then(
    (data) => { if (!active) return; setEmissions(data); setLoading(false) },
    (err: unknown) => { if (!active) return; setError(toMessage(err, '...')); setLoading(false) },
  )
  const unsubscribe = service.subscribe((emission) => {
    if (active) setEmissions((prev) => prependUnique(prev, emission))
  })
  return () => { active = false; unsubscribe() }
}, [service])

// Totales memorizados: escribir en el formulario no los recalcula
const stats = useMemo(() => { /* total y por categoría */ }, [emissions])
```

**Problema detectado en v3:** al activar `noUncheckedIndexedAccess`, el compilador encontró
un error real en el sensor simulado:

```
emissions.service.ts(112,40): error TS2538: Type 'undefined' cannot be used as an index type.
```

`EMISSION_CATEGORIES[Math.floor(Math.random() * n)]` puede ser `undefined` para TypeScript.
Se corrigió con un helper tipado que exige un arreglo no vacío:

```ts
function pickRandom<T>(items: readonly [T, ...T[]]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0]
}
```

---

## Prompt 4 – UI profesional y verificación

```text
Con la lógica ya estable, diseña la UI con Tailwind CSS v4:

1. Layout responsive mobile-first: en móvil todo en una columna; desde lg, formulario
   fijo (sticky) a la izquierda y grid de tarjetas a la derecha (1/2/3 columnas).
2. Encabezado con un indicador de estado: "En vivo · Supabase Realtime" o
   "Modo demo · datos simulados".
3. Fila de resumen: total en toneladas y una tarjeta por categoría con barra de
   participación porcentual (role="meter").
4. Feedback claro: skeletons durante la carga, spinner y texto "Guardando…" en el
   botón, mensaje de éxito, tarjeta de error con botón "Reintentar" y estado vacío.
5. Colores consistentes por categoría (Transporte=sky, Energía=amber, Residuos=violet),
   escribiendo las clases completas para que Tailwind las detecte.
6. Añade los parámetros ?demo=slow y ?demo=error al servicio mock para poder demostrar
   los estados de carga y error sin romper nada.
Entrega además el SQL de la tabla con RLS y la publicación de Realtime.
```

**Resultado (v4 – final):** dashboard con resumen por categoría, filtros, formulario
validado y estados de carga, error y vacío; migración SQL en
`supabase/migrations/001_create_emissions.sql`. Verificación:

- `npm run build` (incluye `tsc -b` en modo estricto) → sin errores.
- `npm run lint` (oxlint) → 0 advertencias.
- Capturas automáticas con Playwright en escritorio (1440 px) y móvil (390 px) en `docs/capturas/`.

---

## Evolución resumida

| Aspecto | v1 | v2 | v3 | v4 |
|---|---|---|---|---|
| Acceso a datos | Supabase dentro del hook | Servicio con interfaz + mock | Normalización `toEmission` | — |
| Tipado | `category: string` | Tupla `as const` + tipos | `strict` + `noUncheckedIndexedAccess` | — |
| Estados asíncronos | Solo `loading` | loading / error / submitting | Desmontaje seguro, sin setState síncrono | Skeleton, spinner, reintentar |
| Tiempo real | No | Realtime `INSERT` | Sin duplicados | Indicador "En vivo" |
| Rendimiento | — | — | `useMemo` + `React.memo` + estado local del form | — |
| Accesibilidad | — | — | labels, aria-*, role="alert" | Foco visible, `role="meter"` |
| UI | Sin estilos | Sin estilos | Básica | Tailwind responsive |

**Lección principal:** el primer código de la IA "funcionaba", pero tenía duplicados, errores
de tipos ocultos y re-renders innecesarios. Solo aparecieron al pedir explícitamente
restricciones (modo estricto, linter, accesibilidad), es decir, al tratar la salida
de la IA como un borrador que se revisa y no como código final.
