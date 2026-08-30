-- What the user actually owns. Presence of a row means "I have this".
-- Equipment itself is not a new concept — it's the existing 'equipment'
-- attribute axis, so tagging an exercise already works and adding a new piece
-- of kit is an INSERT into attribute_values, not a migration.
create table public.user_equipment (
  user_id    uuid not null references auth.users(id) on delete cascade,
  value_id   uuid not null references public.attribute_values(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, value_id)
);

alter table public.user_equipment enable row level security;

create policy "own equipment" on public.user_equipment
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A CHECK can't run a subquery, so guard the axis with a trigger: without it
-- you could claim to own "Sciatica".
create function public.assert_equipment_value()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.attribute_values v
    join public.attribute_types t on t.id = v.type_id
    where v.id = new.value_id and t.key = 'equipment'
  ) then
    raise exception 'Not a piece of equipment.';
  end if;
  return new;
end;
$$;

create trigger user_equipment_is_equipment
  before insert or update on public.user_equipment
  for each row execute function public.assert_equipment_value();

-- ========================================================================= views
-- Per exercise: what it needs, what's missing, and whether it's doable.
-- 'No equipment' is never missing — everyone has nothing.
create view public.exercise_availability with (security_invoker = on) as
with needs as (
  select e.id as exercise_id, v.id as value_id, v.key, v.label
  from public.exercises e
  join public.exercise_attributes ea on ea.exercise_id = e.id
  join public.attribute_values v on v.id = ea.value_id
  join public.attribute_types t on t.id = v.type_id and t.key = 'equipment'
  where v.key <> 'none'
)
select e.id as exercise_id, e.name, e.kind,
       coalesce(array_agg(n.label order by n.label)
                filter (where n.value_id is not null), '{}') as needs,
       coalesce(array_agg(n.label order by n.label)
                filter (where n.value_id is not null and ue.value_id is null), '{}') as missing,
       count(n.value_id) filter (where ue.value_id is null) = 0 as can_do
from public.exercises e
left join needs n on n.exercise_id = e.id
left join public.user_equipment ue
       on ue.value_id = n.value_id and ue.user_id = auth.uid()
where e.user_id is null or e.user_id = auth.uid()
group by e.id, e.name, e.kind;

-- Everything a workout's fixed slots call for, with what you're short of.
-- Rule slots are excluded: which exercises they pick isn't known until the
-- session starts, so their kit can't be promised in advance.
create view public.workout_equipment with (security_invoker = on) as
select w.id as workout_id, w.user_id, v.id as value_id, v.label,
       bool_or(ue.value_id is not null) as owned,
       count(distinct we.exercise_id)::int as used_by
from public.workouts w
join public.workout_exercises we on we.workout_id = w.id and we.exercise_id is not null
join public.exercise_attributes ea on ea.exercise_id = we.exercise_id
join public.attribute_values v on v.id = ea.value_id
join public.attribute_types t on t.id = v.type_id and t.key = 'equipment'
left join public.user_equipment ue on ue.value_id = v.id and ue.user_id = w.user_id
where v.key <> 'none'
group by w.id, w.user_id, v.id, v.label;

-- ================================================== estimate, now with distance
drop view if exists public.workout_summaries;

create view public.workout_summaries with (security_invoker = on) as
select w.id, w.user_id, w.name, w.description, w.days_of_week, w.order_mode,
       w.rest_sec, w.position,
       (select count(*) from public.workout_exercises we where we.workout_id = w.id)::int
         as slot_count,
       (select coalesce(sum(coalesce(we.pick_count, 1)), 0)
        from public.workout_exercises we where we.workout_id = w.id)::int
         as exercise_count,
       coalesce((
         select sum(r.sets * case r.target_type
                               when 'time'     then r.target_value
                               when 'reps'     then r.target_value * 4    -- ~4s a rep
                               when 'distance' then r.target_value / 2    -- ~2 m/s, blended
                             end)
         from public.workout_exercises_resolved r where r.workout_id = w.id
       ), 0)::int as est_work_sec,
       (select count(*) from public.workout_equipment we2
        where we2.workout_id = w.id and not we2.owned)::int as missing_equipment
from public.workouts w;
