-- Items arrive one per set, already in performed order.
create or replace function public.save_session(
  total_sec int,
  items jsonb,
  target_workout uuid default null,
  mode text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  wname  text;
  wmode  text;
begin
  select w.name, w.order_mode into wname, wmode
  from public.workouts w
  where w.id = target_workout and w.user_id = auth.uid();

  insert into public.sessions (user_id, total_sec, workout_id, workout_name, order_mode)
  values (auth.uid(), total_sec, target_workout, wname, coalesce(mode, wmode))
  returning id into new_id;

  insert into public.session_items
    (session_id, user_id, exercise_id, position, set_number, name, kind,
     target_type, target_value, target_sets,
     actual_value, actual_sec, skipped, how)
  select new_id,
         auth.uid(),
         nullif(item->>'exercise_id', '')::uuid,
         (ord - 1)::int,
         coalesce((item->>'set_number')::int, 1),
         item->>'name',
         item->>'kind',
         nullif(item->>'target_type', ''),
         nullif(item->>'target_value', '')::int,
         nullif(item->>'target_sets', '')::int,
         nullif(item->>'actual_value', '')::int,
         coalesce((item->>'actual')::int, 0),
         coalesce((item->>'skipped')::boolean, false),
         nullif(item->>'how', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);

  return new_id;
end;
$$;

drop function if exists public.save_session(int, jsonb, uuid);

-- The performed order for a workout, expanded to one row per set. This is the
-- sequence the coach walks; the mode decides only how it's interleaved.
-- ("position" is reserved in a return signature, hence "ordinal".)
create function public.workout_sequence(target_workout uuid)
returns table (
  ordinal int, set_number int, total_sets int,
  exercise_id uuid, name text, kind text,
  target_type text, target_value int,
  instructions text, note text
)
language sql
stable
security invoker
set search_path = ''
as $$
  with expanded as (
    select r.position as slot, g.n as set_number, r.sets as total_sets,
           r.exercise_id, r.name, r.kind, r.target_type, r.target_value,
           r.instructions, r.note
    from public.workout_exercises_resolved r
    cross join lateral generate_series(1, r.sets) as g(n)
    where r.workout_id = target_workout
  ),
  ordered as (
    select e.*,
           case (select w.order_mode from public.workouts w where w.id = target_workout)
             -- straight: finish an exercise before starting the next
             when 'straight' then row_number() over (order by e.slot, e.set_number)
             -- circuit: one set of each, then round two, and so on
             else row_number() over (order by e.set_number, e.slot)
           end as seq
    from expanded e
  )
  select (seq - 1)::int, set_number, total_sets,
         exercise_id, name, kind, target_type, target_value, instructions, note
  from ordered
  order by seq;
$$;
