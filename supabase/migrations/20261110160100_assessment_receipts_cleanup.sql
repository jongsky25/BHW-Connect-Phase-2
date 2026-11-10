-- One-time cleanup for 20261110160000_assessment_save_receipts.sql.
--
-- Drops the receipts of attempts that are no longer drafts: no save on them can
-- be retried, and a retried submit is answered by the already-submitted branch.
-- Compacts the remaining draft receipts to the replay marker; their retry then
-- rebuilds the response from the attempt. Learner answers live in
-- learner_assessment_private.responses and course_test_attempts and are not
-- touched.
--
-- Run outside class hours. Deleting rows does not shrink the file; afterwards,
-- run this once on its own (it cannot run inside a migration and briefly locks
-- the table):
--   vacuum full learner_assessment_private.mutation_receipts;

delete from learner_assessment_private.mutation_receipts m
  using learner_assessment_private.attempts a
  where a.id = m.attempt_id and a.state <> 'draft';

update learner_assessment_private.mutation_receipts m
  set result = jsonb_build_object('replay_from_attempt', true, 'revision', a.revision)
  from learner_assessment_private.attempts a
  where a.id = m.attempt_id and not (m.result ? 'replay_from_attempt');
