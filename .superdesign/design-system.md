# Learning Loop Design System

Status: Phase 0/Phase 1 visual direction for Superdesign approval  
Primary style source: Superdesign library prompt `mosaic-grid-architecture-style`  
Adaptation: Technical Minimalist structure tuned for a calm, accessible learning application rather than a landing page

## Product context

Learning Loop is a learning-first LMS pilot for one Economics class. Student understanding, practice, feedback, reflection, and teacher action form one co-equal loop. The first vertical slice is a responsive web activity in which a student predicts the effect of lower production costs, directly shifts a supply or demand curve, observes the new equilibrium, explains the causal chain, and submits evidence for human review. A role-aware teacher view shows attempts, misconceptions, explanation evidence, and marking controls.

This is a prototype, not production authentication or a generic LMS dashboard. Use original branding and synthetic Economics content. Do not resemble Canvas.

## Jobs to be done

### Student

- Understand the learning goal and current step immediately.
- Make a prediction before feedback.
- Manipulate a constrained Economics model rather than draw arbitrary lines.
- See cause and effect in the equilibrium immediately.
- Receive evidence-led hints and improve.
- Explain reasoning in their own words and understand what is saved.
- See private mastery progress without pressure, ranking, or streaks.

### Teacher

- See who has started, submitted, or needs a specific teaching response.
- Distinguish a wrong curve, wrong direction, and incomplete work.
- Inspect first attempt, final action, equilibrium result, explanation, and confidence.
- Apply a transparent human rubric and return work for another try.
- Treat engagement events as context, not proof of attention or comprehension.

## Core screens and architecture

### Production role separation and canvas preview

- Production students see only student learning screens. Production teachers see only teacher controls/evidence. Platform, organisation, administrator, teaching-assistant, and future guardian surfaces have separately enforced permissions.
- The Superdesign canvas/local prototype may expose both perspectives only through a clearly labelled **Preview as** author/QA control.
- Choices: **Student activity** and **Teacher evidence**.
- Persistent support: **Student completes the activity · Teacher reviews evidence and marks the same activity.**
- Tooltip/helper: **Demo and author review only. In production, each user sees only the workspace permitted for their account.**
- Never present this as authentication or a real student control. Store only synthetic demo data locally.

### Student activity

- Five labelled steps: Notice, Predict, Test, Explain, Reflect.
- Activity: **How a supply shock changes equilibrium**.
- Scenario: a new battery-assembly process lowers the cost of supplying shared e-bikes.
- Initial market schedule: price 2/4/6/8/10, demand 100/80/60/40/20, supply 20/40/60/80/100.
- Initial equilibrium: price $6, quantity 60.
- Correct shift: supply right by 40 quantity units at each price.
- New equilibrium: price $4, quantity 80.

### Teacher insight

- Activity-specific heading: **Supply shifts — learning evidence**.
- Evidence summaries: progress, prediction, graph action, explanations awaiting review.
- Primary misconception sentence with a suggested teacher move.
- Student list and selected learner evidence/marking panel.
- No league table, opaque score, or broad administration dashboard.

## Signature curve-shift interaction

- Show demand and supply as clear, labelled lines on a conventional price/quantity graph.
- Each curve has a generous labelled grab handle.
- Pointer drag translates the entire curve only horizontally and snaps to exactly three positions: left 40, unchanged, or right 40.
- Never allow free drawing, bending, rotation, vertical movement, or between-step placement.
- On drag, show the target snap track and a direction label before release.
- Every snapped action immediately updates the equilibrium marker, guide lines, active schedule values, and the text/live status.
- Keep the original equilibrium visible as a quiet comparison.
- Native equivalents sit directly below the graph: Demand Left/Unchanged/Right and Supply Left/Unchanged/Right.
- Curve handles respond to Left Arrow, Right Arrow, Home, Enter, and Space.
- The updating schedule and summary provide the complete non-visual equivalent.
- One deterministic state action drives drag, keyboard, native controls, table, and equilibrium results.

### Graph layout and responsive quality

- The graph is a reusable data-driven renderer, not a fixed illustration. Its scenario configuration defines axes/ranges/labels, curve equations or point generators, shifts, intersections/equilibrium, annotations, style tokens, and interaction constraints.
- Calculate the plot rectangle from the actual container after reserving measured gutters for axis titles, tick labels, curve labels, equilibrium values, annotations, and the legend.
- Generate curve geometry, ticks, labels, annotations, and hit targets from data and measured dimensions; do not use e-bike-specific fixed pixel coordinates.
- Quantity/QTY must sit beyond the x-axis with a clear gap, not touch or cross the line. Price must have its own top/left gutter.
- Place equilibrium value text in a collision-tested callout offset from both curves, the marker, and guide lines.
- Keep curve labels clear of handles and boundaries; use leader lines when needed.
- Move the before/after legend into a reserved area outside the data plot, especially on mobile.
- Mobile is not a uniformly shrunken desktop SVG: increase plot height, adapt tick density, keep readable labels, stack Demand/Supply control groups, and preserve 44×44 targets.
- At 320px, 375px, 768px, and desktop, no axis title, tick, curve label, equilibrium marker/value, guide, annotation, legend, or control may overlap, clip, or cause horizontal page scrolling.
- Support long labels through wrapping/reserved gutters and expose full programmatic axis names when visible abbreviations are used.

## Feedback language

- Constructive, brief, and causal; never merely “wrong”.
- Wrong curve: **The event changes producers’ costs. Which side of the market does that affect first?**
- Wrong supply direction: **Lower costs make supplying each quantity easier. Would sellers offer less or more at each price?**
- Correct comparison: **Before: $6, 60 rentals · After: $4, 80 rentals.**
- Do not reveal the full reasoning on the first failed attempt.
- Short explanations are always human-reviewed; no live AI or simulated auto-marking.

## Learning-resource engagement pattern

Future resources may include authorised YouTube embeds and articles. The design may show the pattern, but the first coded slice does not implement those integrations or a telemetry pipeline.

- Before a resource opens, show **What progress is saved**.
- Permitted disclosed evidence: resource opened, active foreground reading estimate, scroll/progress milestones, linked activity attempt/submission; for YouTube IFrame Player API, player state, watched segments/milestones, completion, and playback speed.
- Student copy: **Engagement shows what happened in the resource, not what you understood.**
- Teacher aggregate and individual views pair resource progress with outcome evidence and explanations.
- Playback speed is a preference, never a negative signal.
- No raw browsing outside Learning Loop, cross-site tracking, GPS, biometrics, camera/microphone monitoring, hidden idle monitoring, or attention scores.
- Use minimum retention, aggregate where possible, and disclose deletion/retention before production.
- First draft application: a compact **Saved learning evidence** disclosure listing only activity attempts, curve state, explanation, confidence, submission, and review.

## Mastery-supporting gamification

- Default is private mastery progress tied to meaningful learning evidence.
- First draft shows only **Market shifts · 4 of 5 evidence steps** and an optional teacher-confirmed **Market shifter** badge after the correct curve action plus rubric-confirmed explanation.
- Teacher controls future availability and language for quests, badges, and class challenges.
- Never default to public rankings, leaderboards, streak pressure, time-spent rewards, or points for low-value activity.
- Do not visually overpower the task with confetti, trophy motifs, or game chrome.

## Later roadmap — Teach-back Lab

Teach-back Lab is a future learning-by-teaching experience to consider only after the initial learning loop is validated. It is not active navigation and is not part of the first coded slice.

- A student teaches a clearly simulated learner that asks clarifying questions and surfaces teacher-reviewed misconceptions.
- The student explains, corrects the simulated learner, and reflects.
- Rubric-aligned feedback covers explanation clarity, evidence, causal reasoning, correction quality, and reflection; evidence is flagged for teacher review.
- Never claim the virtual learner truly understands, believes, feels confused, or has human awareness.
- Use age-appropriate, transparent interaction language with no emotional-dependency design.
- Misconceptions and reusable activities require named human/content review; any future AI remains draft-only and schema/content validated before publication.
- Keep only minimum disclosed evidence and do not make high-stakes autonomous judgements.

## Visual language

The source style is Technical Minimalist: paper surfaces, structural hairlines, high negative space, flat color blocks, and compact technical metadata. Adapt it to be humane and instructional.

### Color tokens

- `paper`: `#F7F7F5` — app canvas.
- `surface`: `#FFFFFF` — activity and evidence panels.
- `forest`: `#1A3C2B` — brand, primary action, heading, completed/current learning state.
- `ink`: `#1F2723` — body text.
- `grid`: `#3A3A38` at 20% — borders and dividers.
- `coral`: `#E96F51` — limited loop/accent emphasis; never body text on paper.
- `mint`: `#9EFFBF` — constructive feedback background with forest/ink text.
- `gold`: `#F4D35E` — hints and unresolved evidence with dark ink text.
- `brick`: `#A43E32` — errors, paired with text and icon/shape.
- `sky`: `#DDECF4` — neutral information and privacy disclosure.

All combinations must meet WCAG 2.2 AA. Never encode supply/demand or status by color alone; add line pattern, direct label, and shape.

### Typography

- Headers: `Space Grotesk`, fallback `Arial`, sans-serif; tight but readable, never below 1.1 line height in application screens.
- Body: `General Sans`, fallback system sans-serif; 16–18px and 1.5 line height.
- Labels, saved-state metadata, graph values: `JetBrains Mono`, fallback `ui-monospace`; 11–13px with moderate tracking, never used for paragraphs.
- App title: 32–44px desktop, 28–36px mobile. Avoid the 64–96px landing-page scale from the source prompt.

### Shape, borders, and depth

- 1px hairlines using grid/20%.
- 0–2px radii for structural panels; 4px maximum for inputs and buttons where touch affordance benefits.
- No box shadows and no gradients.
- Use section-wide dividers and flat bento-like evidence modules, not floating cards.
- Keep the page mosaic extremely subtle or restrict it to entry/empty margin areas so it never reduces graph or text clarity.

### Icons and chart marks

- Use a consistent accessible icon set; no emoji as interface icons.
- Supply line: solid forest with a square handle and direct `S` label.
- Demand line: dark ink dashed or contrasting patterned stroke with a circular handle and direct `D` label.
- Initial equilibrium: hollow marker; active equilibrium: solid forest marker with price/quantity text.

## Layout and hierarchy

### Student

1. product/role/prototype disclosure;
2. learning goal and loop position;
3. task prompt;
4. scenario/table/graph evidence;
5. response controls;
6. feedback and next action;
7. saved-evidence disclosure and quiet mastery progress.

Desktop uses a narrow learning-loop rail and a wide task canvas. Tablet collapses to one main column. Mobile stacks prompt, graph, alternative controls, schedule, feedback, and action; no horizontal page scrolling.

### Teacher

1. activity and cohort progress;
2. actionable misconception;
3. filterable learner evidence;
4. individual evidence and rubric;
5. compact engagement-evidence boundary note.

Desktop may use list/detail split view. Tablet expands detail in page. Mobile uses an in-page learner detail with a clear Back to class action.

## Responsive and accessibility contract

- Key checks: 1440×900, 768×1024, 375×812, plus 320px and 200% browser zoom.
- Semantic headings, landmarks, fieldsets, legends, form labels, table headers, buttons, and polite status regions.
- Visible 3px focus rings and logical evidence → response → feedback → action order.
- Controls at least 44×44 CSS pixels where practical.
- No hover-only information and no drag-only action.
- Preserve answers and graph state across refresh, role changes, and viewport changes.
- Honor reduced motion and increased text size; no timed task.
- Motion is limited to a 160–220ms snap/feedback transition and disabled/reduced under `prefers-reduced-motion`.

## Prototype state and trust language

- Persist one versioned local demo store with synthetic IDs only.
- Confirm persistence as **Saved on this device**; never imply cloud sync.
- Provide **Reset demo data** with confirmation.
- Show **Saved learning evidence** in plain language.
- Role switch always states **Prototype — permissions are not enforced by a backend**.
- AI is absent. Future AI remains draft-only and requires schema validation plus named human review before publication.
- Future AI assistance is optional and visibly identified. Connecting an authorised agent never expands tenant/course/role/purpose scope or permits student data to leave that boundary.
- The first slice has no live MCP server, hosted/private Gemma provider, AI assistant, or simulated AI output; those remain architecture contracts only.

## Draft generation requirements

- Generate one polished, interactive desktop-first responsive web app draft with a working **Preview as** author/QA switch and all core states accessible.
- The preview control must explain **Student completes the activity · Teacher reviews evidence and marks the same activity** and state that production users see only their permitted workspace.
- Make the student curve-shift task the visual center of gravity.
- Make both curve handles directly draggable and constrained; include keyboard instructions and native controls below.
- Update the equilibrium, table, and status text immediately from the shift state.
- Correct all graph spacing defects: inspect axis/tick/title alignment, curve labels, handles, equilibrium marker/value, guides, legend placement, and mobile controls visually. Quantity/QTY must not overlap the x-axis, and equilibrium text must not sit on a curve or marker.
- Show the graph as if produced by the declarative renderer contract: responsive reserved gutters, generated ticks/labels, collision-safe annotations, and a chart aspect/layout that adapts rather than merely scales down.
- Include the student explanation/self-check/reflection path and the teacher evidence/rubric path.
- Include the modest private mastery indicator and saved-evidence disclosure without distracting from learning.
- Resource analytics appear only as transparent design language/teacher evidence context; do not invent a surveillance dashboard.
- Do not add Teach-back Lab to active navigation or the first vertical slice; preserve it only in roadmap documentation.
- No marketing hero, fake course library, payments, AI assistant, attendance, parent portal, or broad admin shell.
