-- ============================================================ exercise catalog
-- A user_id of null means "built in" — visible to everyone, editable by no one.
create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  instructions    text,
  video_url       text check (video_url is null or video_url ~ '^https?://'),
  kind            text not null check (kind in ('stretch','strength','core','cardio')),
  default_type    text not null check (default_type in ('time','reps')),
  default_seconds int check (default_seconds > 0),
  default_reps    int check (default_reps > 0),
  created_at      timestamptz not null default now(),
  constraint default_target_matches_type check (
    (default_type = 'time' and default_seconds is not null) or
    (default_type = 'reps' and default_reps  is not null)
  )
);
create index exercises_owner_idx on public.exercises (user_id);

-- ========================================================= attribute vocabulary
-- attribute_types  = the axes ('body_area', 'condition', 'equipment', ...)
-- attribute_values = the allowed values on each axis ('hamstrings', 'sciatica')
-- Adding a new axis is an INSERT, not a migration.

create table public.attribute_types (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  key          text not null,
  label        text not null,
  multi_valued boolean not null default true,
  position     int not null default 0,
  unique nulls not distinct (user_id, key)
);

create table public.attribute_values (
  id       uuid primary key default gen_random_uuid(),
  type_id  uuid not null references public.attribute_types(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  key      text not null,
  label    text not null,
  position int not null default 0,
  unique nulls not distinct (type_id, user_id, key)
);
create index attribute_values_type_idx on public.attribute_values (type_id);

create table public.exercise_attributes (
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  value_id    uuid not null references public.attribute_values(id) on delete cascade,
  primary key (exercise_id, value_id)
);
create index exercise_attributes_value_idx on public.exercise_attributes (value_id);

-- ================================================== routine points at exercises
drop view if exists public.kind_totals;
drop function if exists public.save_routine(jsonb);
drop table public.routine_exercises;

create table public.routine_exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position    int  not null,
  -- All null = use the exercise's own defaults. Set to override for this slot.
  type        text check (type in ('time','reps')),
  seconds     int check (seconds > 0),
  reps        int check (reps > 0),
  note        text,
  created_at  timestamptz not null default now()
);
create index routine_exercises_user_pos_idx on public.routine_exercises (user_id, position);

-- Session items keep their own copy of name and kind so history stays truthful
-- after an exercise is renamed or deleted; the link is a convenience.
alter table public.session_items
  add column exercise_id uuid references public.exercises(id) on delete set null;

-- ============================================================================ RLS
alter table public.exercises           enable row level security;
alter table public.attribute_types     enable row level security;
alter table public.attribute_values    enable row level security;
alter table public.exercise_attributes enable row level security;
alter table public.routine_exercises   enable row level security;

create policy "read built-in and own exercises" on public.exercises
  for select to authenticated using (user_id is null or auth.uid() = user_id);
create policy "write own exercises" on public.exercises
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read built-in and own types" on public.attribute_types
  for select to authenticated using (user_id is null or auth.uid() = user_id);
create policy "write own types" on public.attribute_types
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read built-in and own values" on public.attribute_values
  for select to authenticated using (user_id is null or auth.uid() = user_id);
create policy "write own values" on public.attribute_values
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tagging is allowed only on exercises you own; reading follows the exercise.
create policy "read attributes of visible exercises" on public.exercise_attributes
  for select to authenticated using (exists (
    select 1 from public.exercises e
    where e.id = exercise_id and (e.user_id is null or e.user_id = auth.uid())
  ));
create policy "tag own exercises" on public.exercise_attributes
  for all to authenticated
  using     (exists (select 1 from public.exercises e where e.id = exercise_id and e.user_id = auth.uid()))
  with check(exists (select 1 from public.exercises e where e.id = exercise_id and e.user_id = auth.uid()));

create policy "own routine" on public.routine_exercises
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================================================================= views
-- The routine with overrides already resolved — what the coach actually reads.
create view public.routine_resolved with (security_invoker = on) as
select r.id, r.user_id, r.position, r.note,
       e.id as exercise_id, e.name, e.kind, e.description, e.instructions, e.video_url,
       coalesce(r.type,    e.default_type)    as type,
       coalesce(r.seconds, e.default_seconds) as seconds,
       coalesce(r.reps,    e.default_reps)    as reps
from public.routine_exercises r
join public.exercises e on e.id = r.exercise_id;

-- Flattened tags, for filtering: "show me everything for sciatica"
create view public.exercise_tags with (security_invoker = on) as
select ea.exercise_id, t.key as type_key, t.label as type_label,
       v.id as value_id, v.key as value_key, v.label as value_label
from public.exercise_attributes ea
join public.attribute_values v on v.id = ea.value_id
join public.attribute_types  t on t.id = v.type_id;

create view public.kind_totals with (security_invoker = on) as
  select user_id, kind, sum(actual_sec)::int as total_sec, count(*)::int as reps_done
  from public.session_items
  where not skipped
  group by user_id, kind;
