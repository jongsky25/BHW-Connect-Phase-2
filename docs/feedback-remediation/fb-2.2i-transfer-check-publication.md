# FB-2.2i — approved roles transfer-check release

The owner approved the exact bilingual replacement and stated current-progress effect from [the reviewed packet](fb-2.2i-chapter1-transfer-check-review.md) on 27 October 2026. The [approval record](../../content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/approval-record.json) binds that packet's bytes and merge commit, both languages, both views, the previous published content hash, and the successor hash `68c16ccf0e7790566ef551c1b5fab55597cd10cf35d3ce3323c5cfb29b34a154`.

The original approved 1.1.6 source and media remain intact. The scoped loader applies the approved successor after compilation and rejects a changed source or review packet. The replacement changes only the final formative check in Read and Slides. The section IDs, concept map, other teaching, formal Chapter I assessment forms and keys, and observed practical task remain unchanged.

The [guarded publication transaction](../../content/training/day1-basic-competencies/lesson-releases/bhw-roles-application-fb-2.2i-v2/publish.sql) checks the exact published revision, old check in both views, six-lesson subchapter, one enabled practice criterion with no attempts, and absence of a duplicate successor. It inserts one immutable lesson revision, copies private facilitator notes, updates that lesson's publication pointer and linked unused criterion, and records an audit event. It does not rewrite historical completion rows or assessment enrollments, responses, attempts, or scores. Disposable PostgreSQL and focused content tests cover the transaction and successor. Recheck the pilot baseline before the live transaction.

The current-revision policy can require learners who completed 1.1.6 on the previous revision to do the revised formative check again. At the pre-release review, 18 BHW and 5 assessor completion rows were on that revision; 1 BHW and 40 assessor rows were already historical. Existing records remain available as history. The original feedback remains open for pilot comments.

Publication and production receipts will be added after CI, merge, deployment and the guarded pilot transaction complete.
