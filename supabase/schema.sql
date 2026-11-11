-- Shelfie: wspólna baza dla dwóch telefonów, bez kont. Wklej w Supabase: SQL Editor, New query, Run.
-- Dostęp jest tylko przez dwie funkcje i długi klucz gospodarstwa (z kodu QR). Sama tabela jest dla aplikacji zablokowana.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sp_rows (
  key_hash text not null,               -- sha256 klucza gospodarstwa (klucza nie trzymamy)
  kind text not null,                   -- product, stock, list, event, purchase, habit, dismissed
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  ts bigint not null,                   -- czas zmiany na telefonie (ms): wygrywa nowszy
  changed_at timestamptz not null default now(),  -- czas zapisu na serwerze: po nim telefony pobierają zmiany
  primary key (key_hash, kind, id)
);

create index if not exists sp_rows_changed on public.sp_rows (key_hash, changed_at);

alter table public.sp_rows enable row level security;
-- Celowo brak polityk RLS: anon nie ma bezpośredniego dostępu do tabeli.
revoke all on table public.sp_rows from anon, authenticated;

create or replace function public.sp_hash(p_key text)
returns text
language sql
immutable
set search_path = public, extensions
as $$ select encode(extensions.digest(p_key, 'sha256'), 'hex') $$;

-- Zapis zmian z telefonu. Wiersz z nowszym ts wygrywa.
create or replace function public.sp_push(p_key text, p_rows jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text;
  r jsonb;
  stamp timestamptz := clock_timestamp();
begin
  if p_key is null or length(p_key) < 16 then
    raise exception 'zły klucz';
  end if;
  h := public.sp_hash(p_key);
  for r in select * from jsonb_array_elements(p_rows) loop
    insert into public.sp_rows (key_hash, kind, id, data, deleted, ts, changed_at)
    values (h, r->>'kind', r->>'id', r->'data', coalesce((r->>'deleted')::boolean, false), (r->>'ts')::bigint, stamp)
    on conflict (key_hash, kind, id) do update
      set data = excluded.data,
          deleted = excluded.deleted,
          ts = excluded.ts,
          changed_at = excluded.changed_at
      where excluded.ts >= public.sp_rows.ts;
  end loop;
  return stamp;
end;
$$;

-- Pobranie zmian zapisanych po p_since.
create or replace function public.sp_pull(p_key text, p_since timestamptz default 'epoch')
returns table (kind text, id text, data jsonb, deleted boolean, ts bigint, changed_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
stable
as $$
begin
  if p_key is null or length(p_key) < 16 then
    raise exception 'zły klucz';
  end if;
  return query
    select s.kind, s.id, s.data, s.deleted, s.ts, s.changed_at
    from public.sp_rows s
    where s.key_hash = public.sp_hash(p_key) and s.changed_at > p_since
    order by s.changed_at;
end;
$$;

revoke all on function public.sp_push(text, jsonb) from public;
revoke all on function public.sp_pull(text, timestamptz) from public;
grant execute on function public.sp_push(text, jsonb) to anon;
grant execute on function public.sp_pull(text, timestamptz) to anon;
