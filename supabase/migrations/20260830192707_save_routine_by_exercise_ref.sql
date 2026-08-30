-- Routine slots now reference exercises; overrides are optional per slot.
create function public.save_routine(items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.routine_exercises where user_id = auth.uid();

  insert into public.routine_exercises (user_id, exercise_id, position, type, seconds, reps, note)
  select auth.uid(),
         (item->>'exercise_id')::uuid,
         (ord - 1)::int,
         nullif(item->>'type', ''),
         nullif(item->>'seconds', '')::int,
         nullif(item->>'reps', '')::int,
         nullif(item->>'note', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);
end;
$$;

-- Seeds a new user's routine from the built-in library, in catalog order.
create function public.seed_default_routine()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.routine_exercises where user_id = auth.uid()) then
    return;
  end if;

  insert into public.routine_exercises (user_id, exercise_id, position)
  select auth.uid(), e.id, (row_number() over (order by e.created_at, e.name) - 1)::int
  from public.exercises e
  where e.user_id is null;
end;
$$;

-- Carry the exercise link onto session items when the app supplies it.
create or replace function public.save_session(total_sec int, items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.sessions (user_id, total_sec)
  values (auth.uid(), total_sec)
  returning id into new_id;

  insert into public.session_items
    (session_id, user_id, exercise_id, position, name, kind, actual_sec, skipped, how)
  select new_id,
         auth.uid(),
         nullif(item->>'exercise_id', '')::uuid,
         (ord - 1)::int,
         item->>'name',
         item->>'kind',
         coalesce((item->>'actual')::int, 0),
         coalesce((item->>'skipped')::boolean, false),
         nullif(item->>'how', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);

  return new_id;
end;
$$;
