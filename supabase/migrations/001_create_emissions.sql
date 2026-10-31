-- Tabla de mediciones de emisiones para el Dashboard de EcoTrack.
create table if not exists public.emissions (
  id           uuid primary key default gen_random_uuid(),
  source_name  text not null check (char_length(source_name) between 3 and 80),
  category     text not null check (category in ('Transporte', 'Energía', 'Residuos')),
  co2_kg       numeric(12, 2) not null check (co2_kg > 0),
  measured_at  timestamptz not null default now()
);

create index if not exists emissions_measured_at_idx on public.emissions (measured_at desc);

-- Row Level Security: lectura e inserción abiertas para el rol anónimo (demo académica).
-- En producción se restringiría a usuarios autenticados de cada empresa.
alter table public.emissions enable row level security;

create policy "Lectura pública de emisiones"
  on public.emissions for select
  to anon, authenticated
  using (true);

create policy "Inserción pública de emisiones"
  on public.emissions for insert
  to anon, authenticated
  with check (true);

-- Habilita Supabase Realtime para que el dashboard reciba inserciones en vivo.
alter publication supabase_realtime add table public.emissions;

-- Datos de ejemplo
insert into public.emissions (source_name, category, co2_kg, measured_at) values
  ('Flota de camiones Norte',     'Transporte', 1840.50, now() - interval '12 minutes'),
  ('Planta de producción A',      'Energía',    3210.00, now() - interval '45 minutes'),
  ('Relleno sanitario municipal', 'Residuos',    960.25, now() - interval '90 minutes'),
  ('Data center Bogotá',          'Energía',    1275.80, now() - interval '3 hours'),
  ('Vuelos corporativos',         'Transporte', 2450.00, now() - interval '5 hours');
