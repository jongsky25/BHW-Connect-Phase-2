-- ---------------------------------------------------------------------
-- INC-16 follow-up: backfill users.notifications_last_read_at for every
-- account that already existed before the notifications feature shipped.
--
-- The seven RPCs touched by 20260802000000_inc16_notifications.sql write
-- to public.notifications unconditionally — the `notifications` feature
-- flag only gates the bell/`/notifications` UI, not the insert itself (by
-- design: gating each RPC's insert on a flag read would mean re-touching
-- all seven every time the flag's rollout state changes, for a feature
-- whose flag is meant to be flipped once). That means announcements,
-- survey/course publishes, forum replies, flip-chart reviews, and
-- transfers all started accumulating notification rows the moment this
-- migration ran — well before anyone switches the flag on.
--
-- Every existing user's notifications_last_read_at is null, and the
-- unread count / feed order treat null as "unread since the epoch". Left
-- alone, the first flag flip would dump every notification generated
-- during the dark-launch window on every user as if it just happened
-- (e.g. a BHW transferred weeks ago suddenly seeing "You were
-- transferred" as new). Backfilling the cursor to "now" for everyone who
-- already has an account draws the line at "this migration's rollout,"
-- so only notifications generated after this point are ever presented
-- as unread. New users created after this migration still start with a
-- null cursor as designed, per rpc_admin_create_user's existing baseline
-- column set.
-- ---------------------------------------------------------------------

update public.users
set notifications_last_read_at = now()
where notifications_last_read_at is null;
