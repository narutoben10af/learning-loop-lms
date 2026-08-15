# Interactive Template Authoring Contract

Status: planned product/domain contract; the public prototype has no template
builder or live AI provider

## Why this boundary exists

The current Economics activity demonstrates a reusable graph renderer through
one predefined **Supply and demand explorer** scenario. A teacher may edit the
module item's title and supporting text, but cannot yet change the interaction
rules. The interface must say so plainly. Learning Loop must not imply that an
AI assistant, Codex, or a developer manually creates every interactive lesson.

Ordinary authoring is self-service and deterministic. A teacher selects a
validated template, changes safe declarative parameters, previews the exact
student and accessible-equivalent experiences, and publishes a reviewed
version. This path works without AI, provider credentials, network access, or a
paid service.

## Authoring capability taxonomy

Every module item declares one teacher-visible authoring capability:

1. **Rich content** — authored text, page, instructions, or structured learning
   block.
2. **Configurable interactive template** — a registered renderer plus a
   validated declarative configuration, such as Supply and demand explorer.
3. **Imported/embed resource** — an authorised link, video, or media resource
   behind the resource/media permission boundary.
4. **AI-assisted draft** — optional, teacher-triggered proposed content with
   provider, provenance, validation, review, entitlement, and cost/availability
   state. It is never a publishable category by itself.

The future self-service builder produces category 2 items. Until that builder
exists, the current `supply-shock-activity` item is labelled **Prebuilt
interactive activity** and **Supply & demand pilot**. Its title and supporting
text are editable, while the validated graph family, curve rules, ranges,
feedback, and accessible alternatives are visibly locked. The pilot offers no
fake configuration control.

## Declarative model boundary

The future core model references a template rather than embedding renderer code
or arbitrary script in course content:

```text
InteractiveActivityVersion
  immutable id, version, owner organisation, author, audit
  templateId + compatible templateVersion
  title, instructions, question prompt
  parameter document
  feedback and misconception rules
  completion/release state
  validation result + named reviewer
  provenance (manual, imported, or AI-assisted draft)
```

The **template registry** owns an allowlisted schema, renderer capability,
accessible-equivalent capability, migration function, preview fixture, and
validation rules. The **activity version** owns only validated data. Renderers
receive the validated configuration and responsive dimensions; they never
receive arbitrary executable code.

For the Supply and demand explorer, safe parameters include:

- scenario title, instructions, and causal question prompt;
- axis labels, units, ranges, tick intent, curve equations or point generators,
  initial curve states, and constrained shifts;
- equilibrium and annotation policy;
- correct response and carefully designed misconception rules;
- feedback, hints, and reflection prompt;
- table values, labels, and the keyboard/button non-drag alternative;
- draft, review, scheduled, published, closed, or archived lifecycle.

The supported Economics template registry must grow beyond one market diagram.
Teachers select and configure a supported graph family—initially
**supply–demand, AS–AD, IS–LM, PPC/PPF, and budget
constraint/indifference-curve activities**—without AI. Each family owns a
declarative schema for axes, labels, ranges, curve geometry/equations or point
generators, starting state, constrained shifts, equilibrium/intersection,
frontier or attainable-choice annotations, correct/misconception rules, and the
keyboard/button/table equivalent. Utility-curve activities must have an explicit
learning purpose such as identifying an affordable choice, changed budget set,
or tangency—not decorative curves.

A shift view retains a legible baseline curve and renders the active curve
separately so learners can compare before/after states and market,
macroeconomic, production, or consumer-choice outcomes. The active adjustment
control cannot obscure either curve or result marker.

The first focused visual correction applies this baseline-versus-shifted
comparison to the current supply–demand pilot. The broader template-builder PR
then proves the same renderer contract across AS–AD, IS–LM, PPC/PPF, and
budget/indifference fixtures. If a teacher needs an unsupported visualisation,
the UI says it is unsupported and routes to a later explicit
template-authoring/developer extension path. It never silently depends on Codex
or an AI service to manufacture a one-off activity.

Interaction state mutates the declarative scenario and asks the reusable graph
engine to recalculate layout, equilibrium, labels, tables, and accessible text.
It does not fork a hard-coded picture per lesson.

## Publication and permission policy

- Template selection and draft editing are teacher/course-scoped operations.
- A configuration must validate against the exact template/schema version
  before preview or release.
- Preview and test attempts are isolated from student attempts and Gradebook.
- Publishing creates an auditable immutable activity version; editing a
  published version creates a draft revision and never silently changes the
  released learner experience.
- Student projection includes only the reviewed published configuration and
  learner-safe feedback. Teacher notes, validation diagnostics, local file
  handles, hidden answers, and unknown fields do not cross the boundary.
- Template plugins call typed LMS services and use the same tenant, course,
  role, purpose, rate-limit, revocation, and audit controls as other
  integrations. They cannot access the database directly.

## Optional AI-assisted drafts

AI can be useful for selected cases, but it is an optional import path into the
same validated draft model—not the authoring foundation.

- A named teacher triggers the request and sees premium entitlement,
  provider/local-model availability, quota, and expected cost state first.
- Web and Flutter clients never receive provider secrets. A later backend AI-job
  service uses a vendor-neutral adapter and authorised contextual retrieval.
- No live provider, key, billing, student-data ingestion, or paid call exists in
  this prototype. The system never relies on Codex being present.
- Student information, grades, attendance, private submissions, and personal
  data are excluded unless a separate authorised policy/consent decision allows
  the exact purpose and fields.
- Proposed content records provider/model, prompt/config version, bounded source
  citations where relevant, validation output, cost/latency metadata, and named
  human review. It remains visibly **AI-assisted draft** and cannot auto-publish.
- Any AI-proposed action is revalidated and executed by LMS domain services
  under the caller's permissions; models receive no direct database or arbitrary
  code-execution capability.

## Acceptance criteria for the focused implementation

1. A teacher can choose a registered template without AI and edit every
   allowlisted Supply and demand explorer parameter listed above.
2. Unknown fields, invalid ranges/equations, unsafe URLs/code, missing accessible
   alternatives, and incompatible template versions fail closed.
3. Preview renders student, keyboard/button, and table paths from the same saved
   configuration at 320px, 375px, desktop, and 200% reflow.
4. Pointer, keyboard, buttons, and table inputs produce equivalent scenario
   state, equilibrium, feedback, and evidence.
5. Draft revisions do not affect the published student projection; publish
   requires validation, explicit confirmation, and an audit event.
6. Configuration migrations preserve immutable identity and source provenance,
   reject unknown versions, and do not mutate the source record.
7. Template plugin replacement does not change course, module, assessment,
   submission, grade, or permission schemas.
8. AI is absent from the ordinary path. Fake-provider fixtures prove that an
   AI result remains a cited, reviewed draft and cannot publish itself.
9. Supply–demand, AS–AD, IS–LM, PPC/PPF, and budget/indifference fixtures share
   the same responsive renderer/layout contract; long labels and all supported
   curve states remain contained and collision-free.
10. After a curve shift, the baseline and active curve plus prior/new outcome
    markers are visually distinguishable and exposed in text/table form; no
    adjustment handle or label obscures them at required viewport/reflow states.
