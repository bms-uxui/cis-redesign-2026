-- Schema for the EHP-CIS Supabase backend.
-- Run this in the Supabase SQL editor to create the patients table.
--
-- NOTE: This drops public.patients if it already exists with a different
-- shape. Safe for development only — never run this against production
-- data unless you've backed up first.

create extension if not exists "pgcrypto";

drop table if exists public.patients cascade;

create table public.patients (
  hn            text primary key,
  cid           text,
  prefix        text,
  first_name    text not null,
  last_name     text not null,
  gender        text not null check (gender in ('male', 'female', 'other')),
  birthdate     date,
  blood_group   text check (blood_group in ('A', 'B', 'AB', 'O')),
  rh            text check (rh in ('+', '-')),
  phone         text,
  email         text,
  address       text,
  religion      text,
  occupation    text,
  nationality   text,
  marital       text,
  status        text not null default 'active'
                  check (status in ('active', 'inactive', 'deceased')),
  -- Extended free-form data (allergies, chronic conditions, notes, custom
  -- fields the LLM may pick up). Kept as JSONB so the schema stays stable
  -- while the extractor evolves.
  profile       jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists patients_cid_idx on public.patients (cid);
create index if not exists patients_name_idx
  on public.patients (first_name, last_name);

-- Auto-bump updated_at on row update
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_patients_updated_at on public.patients;
create trigger trg_patients_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- For dev: allow read/write for everyone (anon, authenticated, publishable
-- keys all roll up under `public`). Tighten this once you wire real auth.
alter table public.patients enable row level security;

drop policy if exists patients_anon_all on public.patients;
drop policy if exists patients_all on public.patients;
create policy patients_all
  on public.patients for all
  to public
  using (true)
  with check (true);
