-- Apply to a dedicated Shine Digital project. No customer records are seeded.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.studio_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);
create function private.is_studio_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.studio_members where user_id = (select auth.uid()));
$$;
create function private.is_studio_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.studio_members where user_id = (select auth.uid()) and role = 'owner');
$$;
revoke all on function private.is_studio_member() from public, anon, authenticated;
revoke all on function private.is_studio_owner() from public, anon, authenticated;
grant execute on function private.is_studio_member(), private.is_studio_owner() to authenticated;
alter table public.studio_members enable row level security;
create policy "Members can read their own membership" on public.studio_members for select to authenticated using (user_id = (select auth.uid()));

create table public.studio_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  phone text not null default '',
  trade text not null default 'Electrician' check (trade in ('Electrician','Plumber','Auto service','Other')),
  city text not null default 'București',
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  maps_url text not null default '',
  status text not null default 'New' check (status in ('New','Ready','Shared','Interested','Paid','Live','Not interested')),
  notes text not null default '',
  consent boolean not null default false,
  consent_note text not null default '',
  verified boolean not null default false,
  follow_up date,
  quote_ron numeric(12,2) not null default 0 check (quote_ron >= 0),
  style text not null default 'modern' check (style in ('modern','classic','bold')),
  headline text not null default '',
  intro text not null default '',
  about text not null default '',
  live_url text not null default '',
  preview_token text unique,
  preview_content jsonb,
  preview_enabled boolean not null default false,
  preview_updated_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not consent or length(consent_note) > 0),
  check (not preview_enabled or (preview_token is not null and preview_content is not null))
);
create index studio_leads_follow_up_idx on public.studio_leads(follow_up);
create index studio_leads_created_by_idx on public.studio_leads(created_by);
alter table public.studio_leads enable row level security;
create policy "Studio members read leads" on public.studio_leads for select to authenticated using ((select private.is_studio_member()));
create policy "Studio members add leads" on public.studio_leads for insert to authenticated with check ((select private.is_studio_member()));
create policy "Studio members edit leads" on public.studio_leads for update to authenticated using ((select private.is_studio_member())) with check ((select private.is_studio_member()));

create table public.studio_settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'Shine Digital',
  whatsapp text not null default '',
  email text not null default '',
  package_note text not null default 'Solicitați detalii despre pachet, găzduire și întreținere.',
  updated_at timestamptz not null default now()
);
alter table public.studio_settings enable row level security;
create policy "Members read settings" on public.studio_settings for select to authenticated using ((select private.is_studio_member()));
create policy "Owners add settings" on public.studio_settings for insert to authenticated with check ((select private.is_studio_owner()));
create policy "Owners edit settings" on public.studio_settings for update to authenticated using ((select private.is_studio_owner())) with check ((select private.is_studio_owner()));

create table public.studio_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.studio_leads(id) on delete cascade,
  session_id uuid not null,
  event_type text not null check (event_type in ('interest','style')),
  style text not null check (style in ('modern','classic','bold')),
  created_at timestamptz not null default now(),
  unique (lead_id, session_id, event_type, style)
);
create index studio_events_created_idx on public.studio_events(created_at desc);
alter table public.studio_events enable row level security;
create policy "Members read preview activity" on public.studio_events for select to authenticated using ((select private.is_studio_member()));

-- Public callers get an explicit projection of the approved preview, never the lead row.
create function public.studio_get_preview(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'token', l.preview_token,
    'content', l.preview_content,
    'quote_ron', l.quote_ron,
    'seller', coalesce((select jsonb_build_object('name',s.business_name,'whatsapp',s.whatsapp,'email',s.email,'package_note',s.package_note) from public.studio_settings s where s.id=1), '{"name":"Shine Digital"}'::jsonb)
  ) from public.studio_leads l where l.preview_token = p_token and l.preview_enabled limit 1;
$$;
revoke all on function public.studio_get_preview(text) from public, anon, authenticated;
grant execute on function public.studio_get_preview(text) to anon, authenticated;

-- Anonymous activity is a coarse interest signal, not identity or proof of a human view.
create function public.studio_record_event(p_token text, p_session uuid, p_event text, p_style text) returns void
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if p_event not in ('interest','style') or p_style not in ('modern','classic','bold') then return; end if;
  select id into target_id from public.studio_leads where preview_token=p_token and preview_enabled;
  if target_id is null then return; end if;
  if (select count(*) from public.studio_events where lead_id=target_id and created_at > now()-interval '1 day') >= 200 then return; end if;
  insert into public.studio_events(lead_id,session_id,event_type,style) values(target_id,p_session,p_event,p_style) on conflict do nothing;
end;
$$;
revoke all on function public.studio_record_event(text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.studio_record_event(text,uuid,text,text) to anon, authenticated;

-- Keep privileges narrow even if the project's default grants are broad.
revoke all on public.studio_members, public.studio_leads, public.studio_settings, public.studio_events from anon, authenticated;
grant select on public.studio_members, public.studio_events to authenticated;
grant select,insert,update on public.studio_leads, public.studio_settings to authenticated;
