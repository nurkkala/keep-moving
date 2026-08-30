-- Replace the whole routine in one transaction, so a half-saved edit is impossible.
create function public.save_routine(items jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.routine_exercises where user_id = auth.uid();

  insert into public.routine_exercises (user_id, position, name, kind, type, seconds, reps, cue)
  select auth.uid(),
         (ord - 1)::int,
         item->>'name',
         item->>'kind',
         item->>'type',
         nullif(item->>'seconds', '')::int,
         nullif(item->>'reps', '')::int,
         nullif(item->>'cue', '')
  from jsonb_array_elements(items) with ordinality as t(item, ord);
end;
$$;

-- Write a finished session and all its items together.
create function public.save_session(total_sec int, items jsonb)
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

  insert into public.session_items (session_id, user_id, position, name, kind, actual_sec, skipped, how)
  select new_id,
         auth.uid(),
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
