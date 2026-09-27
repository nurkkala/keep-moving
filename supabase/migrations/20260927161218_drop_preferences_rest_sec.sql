-- preferences.rest_sec was never read. Rest length belongs to the workout:
-- workouts.rest_sec, with the app falling back to 15 when it is null. The
-- "null = use preferences" fallback its first migration described was never
-- built. Roadmap OPEN-11-rest-pref.
alter table public.preferences drop column rest_sec;

comment on column public.workouts.rest_sec is
  'Seconds of rest between sets. Null means the app default of 15.';
