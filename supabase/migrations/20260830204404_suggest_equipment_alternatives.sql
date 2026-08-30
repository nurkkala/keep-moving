-- When an exercise needs kit you don't own, offer something you can actually
-- do instead. A substitute is only useful if it works the same area, so
-- candidates are ranked by how many body areas they share, then by whether
-- they match the category, then by what you've done least recently.
create function public.suggest_alternatives(target_exercise uuid, want int default 3)
returns table (
  exercise_id uuid, name text, kind text,
  shared_areas int, same_kind boolean, needs text[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with target_areas as (
    select v.id
    from public.exercise_attributes ea
    join public.attribute_values v on v.id = ea.value_id
    join public.attribute_types t on t.id = v.type_id and t.key = 'body_area'
    where ea.exercise_id = target_exercise
  ),
  target_kind as (
    select kind from public.exercises where id = target_exercise
  )
  select a.exercise_id, a.name, a.kind,
         (select count(*)::int
          from public.exercise_attributes ea
          where ea.exercise_id = a.exercise_id
            and ea.value_id in (select id from target_areas)) as shared_areas,
         a.kind = (select kind from target_kind) as same_kind,
         a.needs
  from public.exercise_availability a
  where a.exercise_id <> target_exercise
    and a.can_do                       -- only offer things they can actually do
    and exists (                       -- and that work at least one same area
      select 1 from public.exercise_attributes ea
      where ea.exercise_id = a.exercise_id
        and ea.value_id in (select id from target_areas)
    )
  order by shared_areas desc,
           same_kind desc,
           (select max(s.performed_at)
            from public.session_items si
            join public.sessions s on s.id = si.session_id
            where si.exercise_id = a.exercise_id and si.user_id = auth.uid())
             asc nulls first
  limit want;
$$;
