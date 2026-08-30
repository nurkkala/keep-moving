-- Dark, light, or follow the system.
--
-- 'system' is the default because the app is used propped on a floor or a mat
-- at both ends of the day, and the OS already knows which one it is.
--
-- This is the cross-device copy, not the source of truth for first paint —
-- localStorage is, because a database round trip can't beat the first frame
-- and the wrong theme flashing is worse than a device disagreeing. The two
-- reconcile on sign-in: the stored value wins and is written back to
-- localStorage, so a new device adopts your choice on its second paint.

alter table public.preferences
  add column theme text not null default 'system'
    check (theme in ('system', 'light', 'dark'));
