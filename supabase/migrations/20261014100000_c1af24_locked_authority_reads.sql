-- C1AF-24: the C1AF-20 shared authority check locks cohort, flags and award
-- rows. Formal and review state RPCs can reach that check, so PostgREST must
-- execute them in a read-write transaction even though they return snapshots.
-- This changes function volatility only; it does not activate any control.
begin;

alter function assessor_rollout_private.formal_authorized(uuid) volatile;
alter function assessor_rollout_private.formal_state(uuid) volatile;
alter function public.rpc_assessor_formal_state(uuid) volatile;

alter function assessor_rollout_private.chapter_review_authorized(uuid,uuid,uuid) volatile;
alter function assessor_rollout_private.chapter_review_snapshot(uuid,uuid) volatile;
alter function public.rpc_assessor_chapter_review_state(uuid,uuid) volatile;

commit;
