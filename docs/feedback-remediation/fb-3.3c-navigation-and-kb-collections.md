# FB-3.3c — destination descriptions and KB collection labels

The owner directed review, implementation, testing, merge and live publication
of the next navigation-label slice. Reports `de0665b6-a86a-4c84-9237-8cfc8f3c7d02`
(Home choices) and `388f5589-510a-4c38-a78d-51f4316e8c95` (KB module numbers)
were checked read-only against the pilot on 24 October 2026. Both remain `new`.

## Findings

Home already listed each role/feature-allowed destination, but the links only
named it. The mobile drawer and desktop More disclosure also provided labels
without explanations. Adding a second independent feature list would risk
showing destinations inconsistent with those menus.

The live KB has Maternal & Child Health, six HHP+/PhilPEN categories, three
PhilHealth guidance categories, nine current Day 1 categories and several
additional categories bearing repeated module labels. The original
flat list mixed these collections. Maternal & Child Health has no authored
chapter/module mapping. Its lack of a module number is not missing data to
fill by guessing. Read-only counts also show that category existence does not
establish published content or course availability; this slice makes no such
availability claim or change.

## Delivered behavior

Home now shows descriptive destination cards, using the existing getNavItems
result in its existing order. Mobile drawer destinations and desktop More links
show the same bilingual descriptions. Link accessible names remain the concise
original labels, with separate accessible descriptions. Existing role/flag
filtering, hrefs, active states, Escape/focus recovery and sign-out remain.
The desktop disclosure has a bounded width and scrolling for the longer list.

KB browse groups existing category rows by exact authored source membership:

- BHW Reference Manual, Chapter 1: the delivery chapter mapping in
  `content/training/day1-basic-competencies/program.json` and the nine exact
  categories in its `categories.json` establish chapter/module context.
- HHP+/PhilPEN: `content/kb/hhp-ncd/categories.json` establishes a separate
  six-module reference collection; no Chapter 1 label is assigned.
- PhilHealth guidance: its authored category manifest establishes collection
  membership, with no invented module sequence.
- Additional health topics: unmapped categories, including Maternal & Child
  Health and unmapped module-labeled categories, remain reference topics.

Module badges use the authored sequence denominator, not the count of currently
returned/live categories. No mapping is inferred from a slug prefix, display
name, sort_order or a similar module number. A leading Module/Modyul numeric
prefix is separated from the displayed topic title so its verified context
carries the number. Original database labels remain unchanged and are retained
as browse-link title text. The category page shows the same collection context;
its answers, articles, anchors and URLs remain intact. KB browse offers the
existing Courses destination only when the learning feature is available.

There is no database migration, category rename/merge/deletion, publication,
clinical-content edit, lesson ordering change, progress/grade update or
feedback closure. All category rows remain browseable, including empty ones;
the existing empty-category state still applies. Historical training sources,
shared lesson reader and preservation pins remain untouched.

## Verification and release

Focused tests verify bilingual descriptions and concise accessible names,
role/feature exclusions, description coverage for all four roles, exact KB
membership, nine-versus-six numbering, safe unmapped handling, display-only
prefix separation, unchanged category rows/answer display/article flags, auth
and the conditional Courses shortcut. Existing header/drawer/navigation and
representative historical-preservation tests are retained.

A disposable-backend browser journey opens Home, phone drawer and desktop
More, checks descriptions and wrapping at 320/390/1280px and XL text, scans
Home cards in light/dark themes, then opens KB and a published HHP category.
It checks both languages, the six-module context and Maternal & Child Health
as a general reference. Preference writes use only a new temporary local BHW;
no write-based pilot tests run. The PR records full CI, exact merge/deployment
readiness and public auth-gate checks. Signed-in CI verification is distinguished
from authenticated production-browser verification. Both reports remain open
for live comments.
