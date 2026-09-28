# Encouraging learner progress

This design note accompanies the first home-card increment. It builds on the
counting rules and accessibility contract in [bhw-progress-plan.md](bhw-progress-plan.md).

## Learner experience

The first screen should answer three questions in order: **How far have I
come? What is my next step? Where can I see the whole journey?** The home card
puts the overall ring and lesson count first, one prominent action second,
and chapter detail last. The chapter list remains available for people who
want to choose a different place to study.

Compact mobile wireframe:

```text
┌───────────────────────────────────┐
│ My training                       │
│ ◯  BHW Reference Manual           │
│    12 of 26 lessons done           │
│    In progress                     │
│                                   │
│ Up next: Chapter 1 · 1.4          │
│ [ Continue where you left off  ]   │
├───────────────────────────────────┤
│ Chapters                          │
│ Chapter 1              In progress│
│ █████████░░  12/18                │
│ Chapter 2              Not started│
│ ░░░░░░░░░░░  0/8                  │
│ [ View the whole manual ]          │
└───────────────────────────────────┘
```

When no lesson remains, an assessment-ready chapter becomes the next step.
When none is ready, the action opens the manual. An unpublished chapter never
appears as 0% complete. This card only reads existing progress; it does not
create new activity or qualification records.

## Follow-on increments

1. Add a precise next milestone (for example, "2 lessons to finish this
   subchapter") and friendly returning/empty states, derived only from
   published required lessons.
2. Celebrate a saved lesson completion and completed subchapter/chapter with
   a brief, optional animation. Keep a static equivalent for reduced motion.
3. Add permanent achievements only after defining award-once rules, historical
   backfill, reset handling, and distinct assessor qualification criteria.

The visual language stays within `src/styles/tokens.css`: warm canvas,
marigold action, teal accent, and sampaguita yellow for recognition. All
meaningful status uses text and an icon as well as color. Check the design
at 360px, with Filipino and English, all display settings, and keyboard use.
