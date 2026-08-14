# Economics Learning Loop — UX Brief

Status: implementation-ready design checkpoint  
Scope: Phase 0/Phase 1 responsive web prototype for one Economics class  
Primary outcome: show one complete learning loop from student reasoning to teacher action  
Explicitly out of scope: production authentication, live AI, payments, native apps, integrations, parent access, attendance, proctoring, Python execution, and copied exam content

AI assistance principle: any future AI support is optional and transparent. Connecting an authorised agent does not expand tenant, course, role, purpose, retention, or student-data boundaries. The first vertical slice has no live AI provider, MCP server, or Gemma integration.

## 1. Product promise

Learning Loop helps a student make their thinking visible, act on precise feedback, and improve while giving the teacher evidence that is useful for the next teaching move. The prototype must feel like an active Economics lesson, not a course-file repository or generic administration dashboard.

The vertical slice uses original, synthetic market data. A student investigates a fall in production costs, predicts the market effect, directly shifts a supply curve, observes the changed equilibrium, and explains the causal chain. The teacher sees the same evidence grouped into progress, misconception, and marking signals.

## 2. Production role separation and preview entry

Production rule: student-facing screens show only the student experience; teacher-facing screens show only teacher controls and learning evidence; platform-owner, organisation-administrator, teaching-assistant, and future parent/guardian views each have separately enforced permissions and scoped navigation. A real student must never see a role switch or gain access to teacher evidence by changing client state.

For this design canvas and local prototype only, the entry/header includes an author-preview control:

- Label: **Preview as**.
- Choice **Student activity** opens Maya Chen’s learning experience.
- Choice **Teacher evidence** opens Mr Rahman’s view of the same activity evidence, misconception signals, and marking controls.
- Supporting copy or tooltip: **Demo and author review only. In production, each user sees only the workspace permitted for their account.**

A concise explanation near the control says **Student completes the activity · Teacher reviews evidence and marks the same activity**. The control must read as a preview/QA device, never as authentication or a proposed student-facing feature.

Implementation boundary: store only synthetic demo names and activity state locally. No email, phone, date of birth, or real student identifiers. README architecture notes must preserve the intended future activation-code onboarding and backend-enforced roles, but those flows are not simulated here.

## 3. Student journey

### Activity frame

Title: **How a supply shock changes equilibrium**  
Learning goal: **Shift a market curve and use the new equilibrium to explain how a change in costs affects price and quantity.**  
Estimated time: 8 minutes

The top of the activity shows a five-step loop, labelled with words and numbers:

1. Notice
2. Predict
3. Test
4. Explain
5. Reflect

Only the current and completed steps receive visual emphasis. Progress is saved after every meaningful change and restored after refresh. A text status such as **Saved on this device** confirms persistence without implying cloud sync.

### Step 1 — Notice

Present a short, original scenario: a new battery-assembly process lowers the cost of supplying shared e-bikes. Before the change, the synthetic weekly market schedule is:

| Price ($) | Quantity demanded | Quantity supplied |
| --------: | ----------------: | ----------------: |
|         2 |               100 |                20 |
|         4 |                80 |                40 |
|         6 |                60 |                60 |
|         8 |                40 |                80 |
|        10 |                20 |               100 |

The initial equilibrium is $6 and 60 rentals. The schedule and graph are two representations of the same data. Keep the table available beside or immediately before the graph at all breakpoints. In the constrained model, one curve-shift step changes quantity by 40 units at every price; this produces a clean target equilibrium of $4 and 80 rentals when supply shifts right.

### Step 2 — Predict

Single-select prompt: **When battery-assembly costs fall, what is most likely to happen to the market equilibrium?**

- Price falls and quantity rises
- Price rises and quantity falls
- Both price and quantity rise
- Both price and quantity fall

The student commits before seeing correctness feedback. The first response captures the pre-feedback prediction even if the student retries.

Feedback behavior:

- Correct: confirm the direction, then prompt the student to prove it by changing the graph.
- Incorrect: do not reveal the option immediately. Ask which curve changes when production becomes less costly and in which direction it shifts.
- On the second attempt, show the correct direction and a brief explanation. Preserve attempt count and first response for teacher insight.

### Step 3 — Test by shifting a curve

This is the signature interactive activity. The graph shows demand, supply, and the current equilibrium derived from the schedule. The student chooses a curve and moves it horizontally. The whole curve translates as a constrained economic model; the student never free-draws, bends, or rotates a line.

Required controls:

- **Direct graph interaction:** demand and supply each have a clearly labelled grab handle. Pointer users drag either entire curve left or right along the quantity axis. The curve snaps to exactly three positions: one 40-unit step left, unchanged, or one 40-unit step right.
- **Constrained adjustment:** a curve cannot be placed between steps or moved vertically. A visible track, snap preview, direction label, and **Reset graph** action make the model predictable rather than an arbitrary drawing tool.
- **Keyboard interaction:** each curve handle is focusable; Left/Right Arrow moves that curve by one snap point, Home returns it to unchanged, and Enter/Space confirms the current graph state.
- **Non-drag equivalent:** labelled **Demand** and **Supply** control groups each offer **Shift left**, **Unchanged**, and **Shift right** buttons or native radio choices. They update the graph through the exact same state action as dragging.
- **Table/value equivalent:** the schedule exposes the active quantity values after a shift, and a text summary states the curve, direction, and before/after equilibrium. A screen-reader or keyboard-only student receives the same resulting values and can complete the task without using the graphic.
- **Immediate result:** every snapped change updates the equilibrium marker, guide lines, schedule values, and a polite live status such as **Supply shifted right. New equilibrium: price $4, quantity 80 rentals.** The initial equilibrium remains visible in a quieter comparison label.

Feedback behavior:

- Let the student explore freely; record only the first committed graph state and subsequent checked states as attempts.
- A **Check this shift** action validates the chosen curve and direction. The target is supply right by one step.
- If demand is moved, say **The event changes producers’ costs. Which side of the market does that affect first?**
- If supply is shifted left, say **Lower costs make supplying each quantity easier. Would sellers offer less or more at each price?**
- Once correct, compare **Before: $6, 60 rentals** with **After: $4, 80 rentals**, then prompt for the causal explanation. Preserve the first curve, direction, resulting equilibrium, and attempt count for teacher insight.

### Reusable Economics graph-renderer contract

The implementation must not hard-code one supply/demand picture or fixed SVG pixel coordinates. Build a reusable renderer driven by a declarative scenario model. The first coded activity supplies one scenario configuration; additional configurations are test fixtures and future extension seams, not extra product screens.

Minimum scenario model:

- `id`, title, accessible summary, and learning purpose;
- x/y axis specifications: semantic labels, units, domain/range, scale type, preferred tick count/formatter, zero-line behavior, and label placement rules;
- curves: stable ID, direct label, semantic role, style token, equation specification or generated point set, valid domain, sampling rules, initial parameters, and allowed shift/state transformations;
- state: current shift/parameter values separate from the immutable scenario definition;
- equilibrium/intersections: calculation strategy, visible marker/guide-line rules, value formatter, and accessible before/after summary;
- annotations: label, anchor in data coordinates, priority, candidate placements, leader-line allowance, and collision behavior;
- interactions: which curves are adjustable, permitted axis/direction, discrete snap states, keyboard mapping, reset/check rules, and minimum hit-target size;
- style tokens: type sizes, line weights/patterns, marker shapes, focus treatment, contrast-safe colors, plot/background/border tokens, and minimum spacing.

Rendering pipeline:

1. Validate the scenario schema and state.
2. Measure the actual container and active typography.
3. Calculate outer label gutters and the plot rectangle; reserve space for axis titles, tick labels, curve labels, equilibrium values, legends, and controls before drawing geometry.
4. Generate scales, ticks, curve samples/points, intersections, shifted states, annotations, hit regions, and direct labels from data plus the measured plot rectangle.
5. Place labels using bounded candidate positions and collision checks. Move a label, add a leader line, reduce tick density, or move the legend outside the plot before allowing overlap or clipping.
6. Render curves inside a plot clip path while keeping axis titles, tick labels, focus rings, legends, and annotation text outside that clipping boundary.
7. On pointer, keyboard, button, or table action, mutate only scenario state, then recalculate and render the same pipeline. No interaction directly edits screen coordinates.
8. Recalculate through `ResizeObserver` or equivalent when the container, viewport, font metrics, zoom, or label content changes.

Layout requirements:

- Axis titles never sit on an axis line, tick, curve, handle, or plot-edge clip boundary. Use full **Quantity** on wider layouts; a shorter visible label such as **Qty** is acceptable only when the same full axis name remains programmatically available.
- Tick labels remain outside the plot rectangle with consistent baselines and padding.
- Curve labels attach near clear portions of their curve with a defined offset and may use a leader line; they must not collide with handles or plot boundaries.
- Equilibrium text uses a collision-tested annotation callout and never overlays either curve, the marker, guide lines, or another label.
- Legends belong in a reserved area outside the data plot on narrow layouts. They may not cover curves or data.
- On small screens, increase chart height/aspect ratio, reduce tick density, stack curve controls, and maintain readable text and 44×44 targets instead of uniformly shrinking the desktop graph.
- Long labels wrap or use reserved multi-line gutters without covering chart geometry or causing horizontal page scrolling.

### Step 4 — Explain

Short-answer prompt: **Explain why lower battery-assembly costs shift supply and how this changes the equilibrium. Use the before-and-after price and quantity.**

Provide a three-item self-check, not automated grading:

- I linked lower production costs to an increase in supply.
- I said supply shifted right, not demand.
- I compared the equilibrium price ($6 to $4) and quantity (60 to 80).

The answer is saved as **Ready for teacher review**. Do not produce an AI score, pretend to understand free text, or publish generated feedback.

### Step 5 — Reflect and hand back to the loop

Ask **How confident are you now?** with three text-labelled choices: **Not yet**, **Nearly**, **I can explain it**. Show a completion summary with:

- prediction result and attempt count;
- curve-shift and equilibrium status;
- explanation review status;
- a quiet private mastery indicator, **Market shifts · 4 of 5 evidence steps**, based on completed learning evidence rather than time spent;
- one next action: revisit the graph or finish the activity.

Completion means all structured responses are correct, an explanation exists, and confidence is selected. The state changes to **Submitted for review**, while remaining editable in the prototype with an explicit **Update response** action. The slice may award one private **Market shifter** badge only after the demonstrated curve action is correct and the teacher marks the causal explanation as meeting the rubric. It must not award points for elapsed time, daily streaks, or repeated low-value clicks.

## 4. Teacher insight and marking view

The teacher entry lands on **Supply shifts — learning evidence**, not a generic dashboard. Use a demo cohort of 12 synthetic students, with Maya’s local activity state reflected live.

### Overview signals

Show four evidence cards in this order:

1. **Progress:** started / submitted / not started.
2. **Prediction:** correct first try / correct after feedback / still unsure.
3. **Graph action:** supply right / demand moved / wrong direction / incomplete.
4. **Explanations to review:** count awaiting human marking.

Every count links or filters the student evidence list. Avoid celebratory league tables, class averages without context, and high-stakes labels such as “weak student.”

### Misconception insight

Highlight the most actionable pattern as a plain-language sentence, for example: **3 students moved demand when the event changed producers’ costs.** Include a suggested teacher move: **Re-model how a non-price supply determinant shifts the whole curve before the next question.** This is deterministic demo copy derived from structured response states, not AI.

### Student evidence list

Each row shows student name, progress state, attempts, graph-action status, confidence, and whether an explanation awaits review. Filters: **All**, **Needs attention**, **Ready to review**, **Not started**. “Needs attention” must be defined in helper text as an activity signal, not a judgement of the learner.

Selecting Maya opens an evidence panel with:

- first prediction and later response;
- first and final curve/direction, plus the resulting equilibrium;
- exact student explanation;
- confidence reflection;
- a compact attempt timeline;
- teacher marking controls.

### Human marking controls

Use a small, transparent rubric with three binary criteria matching the student self-check. The teacher can select criteria, enter feedback, and save **Reviewed**. Include a **Return for another try** choice. Save locally and reflect the result in the overview count. Do not generate feedback or auto-mark the explanation.

### Resource engagement evidence boundary

The future product may let teachers embed authorised YouTube videos and learning articles. Resource analytics must be disclosed as learning-engagement evidence, never as proof that a learner was attentive or understood the material.

Permitted event model:

- common events: resource opened, active foreground reading time, scroll/progress milestones, linked activity attempt, and submission;
- YouTube IFrame Player API events: player state changes, watched segments and milestones, completion, and playback speed;
- no raw browsing history outside Learning Loop, cross-site tracking, GPS, biometrics, camera/microphone monitoring, hidden idle monitoring, or surveillance-style attention scores;
- active reading time pauses when the LMS resource is backgrounded or inactive and is presented as an estimate;
- retain the minimum event detail for the shortest pilot period agreed by the school, aggregate where possible, and provide an explicit deletion/retention policy before production use.

Student UI requirements:

- every tracked resource shows **What progress is saved** before opening;
- a student can see their own milestones and the plain-language statement **Engagement shows what happened in the resource, not what you understood**;
- playback speed is treated as a preference, not a negative signal.

Teacher UI requirements:

- aggregate view shows opened, meaningful progress milestones, completion, and linked activity status;
- individual view shows the same disclosed events and watched/read segments without inferring attention or comprehension;
- pair engagement evidence with learning outcomes and explanations; never rank learners by time watched or time on page.

Implementation boundary for this slice: do not embed YouTube, articles, or a telemetry pipeline. The first draft should show the disclosure pattern and label existing activity events as **Saved learning evidence**; the coded slice records only its own attempts, curve state, explanation, confidence, submission, and review.

### Mastery-supporting gamification boundary

Gamification exists to clarify worthwhile learning progress, not to maximize screen time.

- optional patterns: learning quests, private mastery progress, outcome-linked badges, and teacher-configurable class challenges;
- teachers control availability, names, tone, and whether a challenge is used for a class;
- badges require demonstrated outcomes or teacher-confirmed evidence, not raw clicks or time spent;
- public rankings, default leaderboards, streak pressure, and time-spent rewards are excluded because they can penalise absences, accessibility needs, caregiving, or slower careful work and can incentivise gaming;
- students see private progress and the next evidence-based action; teachers see progress toward learning outcomes, not a behavioural score.

Implementation boundary for this slice: show only the modest private **Market shifts** evidence-step indicator and the optional teacher-confirmed **Market shifter** badge. Do not build quest management, class challenges, points, leaderboards, streaks, or rewards infrastructure.

## 5. Visual system and hierarchy

The brand should feel calm, curious, and evidence-led. Original trade dress only; do not mirror Canvas navigation, iconography, or layout.

- **Primary surface:** warm off-white canvas, deep ink text, and white activity panels.
- **Learning color:** teal for current/completed progress and constructive feedback.
- **Attention color:** amber for hints and unresolved evidence.
- **Error color:** brick red reserved for incorrect/invalid states; pair every color with text and icon treatment.
- **Accent:** soft coral used sparingly for the loop motif and primary action emphasis.
- **Typography:** highly legible system sans-serif; use weight, size, and spacing rather than decorative display fonts.
- **Shape:** medium-radius cards and controls; graph and evidence panels are structured, not playful bubbles.

Hierarchy within a student step:

1. learning goal and loop position;
2. question or task;
3. evidence (scenario, table, graph);
4. response controls;
5. feedback and next action.

Hierarchy within teacher view:

1. activity name and cohort progress;
2. actionable misconception;
3. filterable learner evidence;
4. individual response and marking controls.

Motion is limited to a short progress/feedback transition and must respect `prefers-reduced-motion`. Never animate the graph in a way that hides the underlying values.

## 6. Responsive behavior

### Student

- At 1024px and above, use a narrow loop/progress rail with a wide task area; the graph and schedule may sit side by side only when both remain readable.
- From 600–1023px, collapse to one main column and keep the progress steps as a horizontal, scroll-free strip.
- Below 600px, stack scenario, table, graph, controls, and feedback in that order. Use a compact sticky bottom action only if it does not cover feedback or browser controls.
- The schedule remains a real table and fits at 320px without horizontal page scrolling.
- The graph keeps readable axis labels, both curve handles, snap positions, and a minimum useful plot height; the alternative shift controls and equilibrium summary appear directly below it, not in a modal.

### Teacher

- Desktop uses overview cards followed by a list/detail split view.
- Tablet uses the full-width list with the evidence panel below or as an in-page expansion.
- Mobile places evidence cards in a two-column grid, filters in a horizontally scrollable control group with visible labels, and opens student evidence as a full-width in-page view with a clear Back to class action.

No information or action may exist only on hover.

## 7. Accessibility and interaction contract

- Meet WCAG 2.2 AA color contrast for text, controls, focus, and meaningful chart marks.
- All interactive targets are at least 44×44 CSS pixels where practical.
- Use semantic headings, landmarks, form labels, fieldsets, legends, table headers, buttons, and status regions.
- Keep visible 3px focus indicators and a logical focus order through evidence, response, feedback, and next action.
- Announce validation and feedback through a polite live region; move focus only for blocking errors or explicit navigation.
- The graph has a concise text description and an updating schedule table. Screen-reader users can perform the identical curve-left/unchanged/curve-right state change through native controls and hear the resulting equilibrium.
- Do not rely on color, position, motion, or dragging alone. Patterns, labels, and/or shapes distinguish supply, demand, selected values, correctness, and status.
- Support 200% browser zoom and a 320px viewport without content loss, overlap, or horizontal page scrolling.
- Honor reduced motion and increased text size. Avoid timed tasks.
- Preserve entered answers when validation fails, roles change, the page refreshes, or the viewport changes.

## 8. State model for the prototype

Use one versioned local state object with synthetic IDs and no sensitive data. Minimum learner evidence:

- role and active screen;
- current and completed loop steps;
- first and current prediction plus attempt count;
- demand and supply shift offsets, active curve, and current equilibrium;
- first committed and current curve/direction plus attempt count;
- explanation text and self-checks;
- confidence;
- submission status and timestamps suitable only for the local demo;
- private mastery-step status and teacher-confirmed badge eligibility;
- teacher rubric selections, feedback, review status, and return-for-retry state.

The interface must expose a **Reset demo data** control with a confirmation step. State schema changes must migrate or safely reset with an explanatory notice, not crash.

## 9. Acceptance criteria

The vertical slice is ready for implementation handoff when the following can be verified:

1. A first-time evaluator can enter as Maya, complete all five learning steps, receive staged feedback, refresh, and continue without losing work.
2. The activity uses only the original scenario and synthetic schedule in this brief.
3. Prediction, direct curve shift, before/after equilibrium, explanation, reflection, and submission states are represented.
4. A pointer user can directly drag either demand or supply horizontally; each curve snaps left/unchanged/right and cannot be arbitrarily drawn, bent, rotated, or moved vertically.
5. Every graph change immediately updates the equilibrium marker, schedule values, visual before/after comparison, and equivalent text/live status from one shared state action.
6. The same demand/supply left/unchanged/right action is fully completable with arrow keys and visible native buttons or radio controls, without pointer dragging.
7. Correctness feedback identifies the cause/curve/direction misconception; it does not merely say correct/incorrect or reveal the full reasoning on the first failed attempt.
8. The explanation is explicitly human-reviewed and never AI-scored.
9. Switching to Mr Rahman shows Maya’s current progress, first and final graph action, resulting equilibrium, attempts, misconception state, explanation, confidence, and review status.
10. Saving a rubric review updates the teacher overview and persists after refresh.
11. The demo-role boundary is visible on entry and within the app; no screen implies real authentication, cloud sync, or backend authorization.
12. At 1440×900, 768×1024, and 375×812, the primary flow is readable and operable with no clipped content or horizontal page scroll.
13. At 320px and 200% zoom, content reflows without loss of information or action.
14. Automated checks cover curve-shift/equilibrium rules, feedback rules, state persistence/migration, and the primary student-to-teacher state handoff.
15. Keyboard walkthrough confirms logical focus, visible focus, Left/Right/Home curve operation, non-drag completion, and accessible equilibrium/feedback announcements.
16. Reduced-motion and contrast checks pass, and teacher insight uses text labels rather than color alone.
17. The implementation stays within this vertical slice; roadmap-only roles, enrolment, attendance, future question types, AI, integrations, payments, and native apps remain documentation, not placeholder screens.
18. The student sees a plain-language **Saved learning evidence** disclosure and can inspect exactly which activity events are stored locally; the interface makes no claim to measure attention or comprehension.
19. Resource-engagement design guidance distinguishes disclosed LMS events from surveillance, treats time as an estimate, and excludes browsing outside Learning Loop; no YouTube/article telemetry is implemented in this slice.
20. The only gamification visible in the slice is private, outcome-linked mastery progress and an optional teacher-confirmed badge; there are no public rankings, streaks, time rewards, or points loops.
21. Teacher evidence never ranks learners by activity time and clearly separates engagement signals from assessed understanding.
22. The canvas role control is labelled **Preview as** with explanatory copy; production separation is explicit, and no product requirement suggests that a real student can switch into teacher/admin views.
23. At desktop, tablet, 375px, and 320px/200% zoom, axis titles, ticks, curves, direct labels, handles, equilibrium marker/value, guides, annotations, and legend are visibly aligned, legible, unclipped, and non-overlapping.
24. Automated geometry checks compare rendered bounding boxes for forbidden overlap pairs: axis-title/axis-line, tick-label/plot, equilibrium-label/curve-or-marker, curve-label/handle-or-plot-edge, legend/plot, and control/control. Include a small visual tolerance and fail on clipping outside the SVG/chart container.
25. The same renderer passes fixtures for at least: a supply shift, a demand shift with different ranges, a price-control annotation, and a non-linear or frontier-style curve. Fixtures verify scales, ticks, intersections/annotations, labels, and responsive layout without fixed scenario-specific screen coordinates.
26. A long-label fixture such as **Quantity of shared e-bike rentals per week** wraps/reserves space correctly at 375px and 200% zoom with no page-level horizontal scrolling.
27. Resize tests change chart containers across representative widths and confirm geometry is recalculated, label/tick density adapts, and state/equilibrium values remain correct.
28. Pointer drag, focused-handle Left/Right/Home/Enter/Space, native controls, and table/value alternatives dispatch the same scenario-state action and result in identical recalculated geometry and text.
29. All visible chart geometry, tick locations, hit regions, labels, and annotations are generated from scenario data plus measured dimensions; tests reject fixed viewbox coordinates tied to the e-bike example.
30. Architecture fixtures define versioned, typed, tenant-scoped MCP resources/tools and verify that MCP adapters use authorised domain services rather than direct database access; no live MCP server runs in this slice.
31. Permission tests deny agent publication, grading, attendance, enrolment, invitation, private-data export, or code execution without the exact scoped, audited, human-confirmed workflow.
32. Gemma/provider contracts keep credentials server-side, validate tenant/principal/role/action/object/purpose, minimise/redact inputs, enforce quotas/manual budget/confirmation before asynchronous invocation, and use fake hosted/private adapters in tests; no live Gemma call runs in this slice.
33. Premium-entitlement fixtures gate Gemma by organisation plan, feature flag, seat/school allowance, quota, and manual budget state without adding billing or provider-key entry to the vertical slice.
34. Authorised-context fixtures prove teachers receive only assigned-class resources, students only their own work, guardians only linked approved summaries, and administrators only scoped organisational data; ACL changes/revocation fail closed before prompt assembly.
35. Future AI drafts cite the permitted LMS sources used, declare missing evidence, and cannot infer, reveal, publish, share, grade, mark attendance, or enrol beyond the caller’s scoped, confirmation-gated authority.

## 10. Coding handoff decisions

- Build a client-side responsive web prototype with a small component and state boundary; do not scaffold a backend for this slice.
- Use native HTML semantics first. The graph is an accessible data visualization driven by discrete curve offsets; the updating schedule, native shift controls, and equilibrium text are authoritative equivalents.
- Separate the immutable declarative graph scenario, mutable scenario state, economics calculations, layout engine, and rendering adapter. Keep equilibrium/intersection, scale/tick, label-layout, collision, interaction, and feedback rules deterministic and unit-testable.
- The e-bike graph is configuration data consumed by the reusable renderer; do not embed its curve coordinates, tick positions, or annotation pixels inside view components.
- Keep student responses and teacher review in one versioned local demo store so the loop can be demonstrated without fabricated network behavior.
- Start on the student activity; add the teacher view only after the student state and feedback rules pass tests.
- Treat the acceptance criteria above as the implementation checklist and stop rather than expanding breadth.
- Keep AI/MCP/Gemma contracts in `docs/ARCHITECTURE_DECISIONS.md`; do not scaffold live providers, inference services, or an MCP server during the UI vertical slice.

## 11. Later feature — Teach-back Lab

Working title: **Teach-back Lab**. This is a post-pilot roadmap feature to explore only after the core student-feedback-teacher loop is validated.

Learning purpose: use learning-by-teaching to reveal the quality of a student’s explanation. A student teaches a clearly simulated learner that asks age-appropriate clarifying questions and presents carefully designed misconceptions. The student explains, notices and corrects the misconception, then reflects on how their explanation changed.

Required safeguards and evidence model:

- clearly state that the virtual learner is a simulation and does not truly understand, feel confused, or possess beliefs;
- use age-appropriate, transparent language and avoid emotional dependency, deception, or claims of human-like understanding;
- misconceptions are curriculum-aligned, bounded, and reviewed by a named teacher/content reviewer;
- feedback is rubric-aligned and separates explanation clarity, use of evidence, causal reasoning, correction quality, and reflection;
- AI output remains draft-only, passes schema/content validation, and is reviewable by a named human before any reusable activity is published;
- teachers can inspect the student explanation, simulated questions/misconceptions shown, corrections, reflection, and rubric evidence;
- the system flags evidence for teacher review rather than making a high-stakes autonomous judgement;
- collect only the minimum interaction evidence needed for learning and review, with the same disclosure and retention principles as other resources.

Implementation boundary: do not show Teach-back Lab as active navigation in the approval draft and do not scaffold it in the first coded vertical slice. It belongs in the documented roadmap after validation of the initial Economics loop.
