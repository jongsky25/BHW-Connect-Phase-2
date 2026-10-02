# Blood-pressure thresholds: what the public sources say

Researched 1 Oct 2026 for the two entries still waiting on a figure:
`m3-bp-grade-3` (referral timing at the highest category) and
`m3-bp-low-numbers` (a numeric low-BP cut-off). **Neither figure could be
confirmed from public sources.** What was found, and one correction to the
calculator's labelling, is below, for the BLHSD-WHO clinical decision.

## 1. The updated PhilPEN 2025 protocol

Not found online. The DOH PhilPEN page is blocked to this tooling (the same
reason it is marked `wafBlocked` in `sources.json`), and searches returned only
news and programme pages (the DOH-JICA project to roll out the updated PhilPEN;
a general statement that PhilPEN assesses CVD risk, including BP, in people 25
and over). **No referral threshold or timing from the 2025 protocol is
published in anything reachable.** It has to come from BLHSD or the WHO country
office.

## 2. Referral at the highest category (`m3-bp-grade-3`)

**What the Philippine 2024 guideline says**
([Executive Summary of the 2024 Philippine CPG on Acute Severe Blood Pressure
Elevation](https://pmc.ncbi.nlm.nih.gov/articles/PMC12856959/)):

- Acute severe hypertension is "SBP equal to or greater than 180 mmHg or DBP
  equal to or greater than 120 mmHg without signs and symptoms of
  hypertension-mediated organ damage" (Best Practice Statement 1).
- "We suggest screening for signs and symptoms of hypertension-mediated organ
  damage to rule out hypertensive emergency, which will warrant referral to a
  hospital" (Statement 2). Symptoms listed: focal neurologic complaints, visual
  impairment, dyspnea, chest pain, headache (Statement 1, section 3.3).
- If none: "Allow 2 h of rest for these patients, followed by clinical
  reassessment" (section 4.4.2). That is a clinician's step, not a BHW's.

**What it does not say:** any "same-day" or "immediate" timing for a screening
reading with no symptoms, or anything addressed to a BHW.

**The WHO HEARTS document does not settle it either.** The
[WHO tool for developing a consensus protocol](https://www.who.int/publications/i/item/WHO-NMH-NVI-19-8)
(WHO/NMH/NVI/19.8, 2018) shows *example protocols from Indian states* in its
annex, and they disagree: one says at SBP 180 or DBP 110 "start treatment and
refer to specialist immediately", another says "refer patient to a specialist
after starting treatment". These are national examples, not a WHO
recommendation, so they should **not** be cited as one.

**Discrepancy to resolve.** The calculator's grade 3 is the ESC/ESH category,
SBP >= 180 or DBP >= 110. The Philippine acute-severe threshold is DBP >= 120.
A reading such as 185/112 is grade 3 in the calculator and not "acute severe" in
the Philippine guideline. The calculator reply already defers the timing to the
PhilPEN protocol and asks about emergency signs first, which matches the
Philippine symptom list; it does not claim a time.

## 3. The Philippine classification (a correction)

The [Philippine Society of Hypertension 2020 CPG](https://pmc.ncbi.nlm.nih.gov/articles/PMC8678709/)
uses three bands, "Normal BP < 120/80, Borderline BP 120-139/80-89,
Hypertension >= 140/90", and defines hypertension as "an office blood pressure
of 140/90 mm Hg or above, typically at least twice taken on two separate days".
It deliberately has **no grades 1-3 and no isolated systolic category**.

The calculator uses the ESC/ESH 2018 grades (optimal, normal, high-normal,
grade 1-3). Earlier in this work they were described as "used by the Philippine
Society of Hypertension"; that was wrong, and a code comment saying so is
corrected in this change. The KB entries cite ESC/ESH for the grades and
PSH for 140/90, which is accurate. The two schemes agree that 140/90 is where
the hypertension range starts and differ below it ("high-normal" 130-139/85-89
against "borderline" 120-139/80-89).

## 4. A numeric low-BP cut-off (`m3-bp-low-numbers`)

There is no guideline cut-off. The Philippine 2020 CPG does not address
hypotension. A clinical review ([Hypotension, StatPearls](https://www.ncbi.nlm.nih.gov/sites/books/NBK499961/))
describes it by convention as systolic below 90 or diastolic below 60, notes
that definitions are not universal, and that some adults are normally that low.
What matters clinically is symptoms. The calculator labels a reading "low" at
those conventional values but tells the BHW there is no agreed cut-off and to go
by symptoms.

## Decisions taken (2 Oct 2026)

The owner asked for these three to be decided on international standards
instead of waiting for the PhilPEN 2025 protocol. Each is made conservatively
(the more inclusive threshold, the earlier referral), and each defers to the
LGU's PhilPEN protocol where that sets something different. **These are
decisions taken on published guidelines, not a BLHSD-WHO ruling; the clinical
reviewer should read the changed wording before it reaches BHWs.**

1. **Highest category and its timing.**
   - Threshold: systolic >= 180 **or** diastolic >= 110 (ESC/ESH 2018 grade 3).
     This is deliberately the more inclusive of the international (110) and
     Philippine acute-severe (120) diastolic numbers, so every reading the
     Philippine definition would flag is also flagged here.
   - Action: ask first about chest pain, trouble breathing, severe headache,
     one-sided weakness or numbness, trouble speaking, changes in vision,
     confusion or fainting (the Philippine 2024 CPG list plus the usual
     stroke and cardiac signs). **Any of them: emergency, transport now.**
     **None: seen at the health facility today**, not sent home to wait.
   - Basis: ESC/ESH 2018 gives grade 3 immediate drug treatment and defines an
     emergency as grade 3 with acute symptomatic organ damage; AHA/ACC guidance
     for readings above 180/120 is emergency care with symptoms and same-day
     evaluation without; the Philippine 2024 CPG screens for the same
     symptoms and sends those who have them to hospital. Same-day assessment
     satisfies all three. The 2-hour rest and clinical reassessment in the
     Philippine CPG is a clinician's step and is not asked of a BHW.
   - Wording: "If your LGU's PhilPEN protocol sets a different timing for this
     level, follow it."
   - Published: `m3-bp-grade-3` (now cited), the calculator's grade 3 reply, and
     `adv-bp-grade-3`.

2. **Low blood pressure.** A top number below 90 or a bottom number below 60 is
   *generally treated as low* (StatPearls and the usual clinical convention),
   with two caveats stated in the reply and the entry: there is no single
   international cut-off, and some people are normally that low and well.
   Symptoms decide the action. Published: `m3-bp-low-numbers` (now cited) and
   the calculator's low reply, which no longer says "no agreed cut-off".

3. **The Philippine bands beside the grade.** Yes. Every non-low result now ends
   its first line with "Philippine guideline: normal / borderline / hypertension
   range", and the hypertension reply says it takes at least two readings on two
   separate days to confirm, which is the PSH 2020 CPG's own wording. The
   mapping is exact, not approximate (ESC "optimal" is Philippine "normal";
   ESC "normal" and "high-normal" together are "borderline"; grades 1 to 3 are
   "hypertension"), so it adds a label and no second set of cut-offs. It is
   tested at every boundary. `m3-bp-categories` states the three bands.

## Still open

- The updated PhilPEN 2025 protocol itself, if BLHSD or the WHO country office
  can share it: if it gives a different timing or threshold, it overrides the
  above, and the wording already says to follow the LGU's protocol.
- A clinician's read of the changed grade 3, low and band wording.
