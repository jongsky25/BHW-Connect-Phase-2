# Training dashboard (initial course scope)

The admin Training dashboard reports the BHW Reference Manual and current
assessor chapter training. It uses existing records; it does not write learner
progress. Other published courses can be added after their eligibility and
completion rules are defined.

## Counting rules

- **Catchment:** an active admin sees active BHWs and assessors assigned to the
  admin's org unit or a descendant. A selected area can only narrow that tree.
  A person is counted once at their assigned org unit. Thus a regional assessor
  contributes to the regional rollup but not to a municipality's count. A
  national admin sees the national rollup. Ordinary BHWs cannot call the
  reporting RPC.
- **Expected:** an active person for whom an available, published manual
  chapter is visible. Assessor chapters must also have current exam
  requirements. People with no activity remain in this denominator.
- **Started:** a BHW has a `course_progress` row. An assessor has study
  completion for a currently published lesson, or any recorded exam,
  orientation, or current qualification evidence for the chapter.
- **Content complete:** a BHW's course status or completion timestamp shows
  completion. An assessor has completed every authored required lesson for
  the current published revision; missing required content prevents completion.
- **Final outcome:** a BHW is `certified`, or an assessor has an active chapter
  qualification for the current curriculum version.
- **All chapters:** a person has started if any available chapter was started;
  content and final outcomes require every available chapter for that role.
  Unpublished chapters are excluded. The denominator changes when a new
  chapter becomes available, so the dashboard is a current-state view.

The cards show content completion rates against both expected learners and
starters. The area breakdown assigns each person to exactly one immediate
child of the selected area, or to the selected area itself when assigned
there. Selecting a child narrows the whole dashboard. The individual list uses the same scope and counts, with 20 people
per page. Search only filters the list; it does not change the aggregate cards.

`rpc_training_dashboard` returns derived counts and names to active admins.
It does not return exam answers or private resume positions. Its database
test covers national and municipal scope, zero-progress learners, assessor
headcount placement, filtering, and rejection of BHW and anonymous callers.
