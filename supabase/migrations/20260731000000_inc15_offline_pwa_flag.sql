-- INC-15: Offline / PWA. No new tables — this increment is a manifest +
-- service worker + a static offline fallback page, all served from
-- src/app and public/. The only database change it needs is its feature
-- flag, following the same "ships behind a flag defaulted off" pattern as
-- INC-10 through INC-14.
insert into public.feature_flags (key, enabled, description)
values
  ('offline_pwa', false, 'Web app manifest + service worker: installable app shell and cache-as-you-browse offline fallback for previously visited pages.')
on conflict (key) do nothing;
