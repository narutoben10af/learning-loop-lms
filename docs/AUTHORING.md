# Module Composer authoring slice

The teacher-only Module Composer is the contextual authoring path for the pilot. A teacher selects a module, chooses **Quick add**, and is taken directly into an inline editor for the new item. Existing items keep a visible **Edit content** action.

## Supported now

- Pages, learning blocks, discussions, and other text items: title plus learner-facing body.
- Resources: title, description, article/link URL, or local file metadata. Selecting a file never uploads bytes; `browser-demo` metadata is local prototype state only.
- Videos: title, description, and an external URL. Engagement telemetry is not active in this slice.
- Assignments and quizzes: title, instructions, optional due date and points as an explicit draft record. The disabled **Continue to assessment builder (next slice)** affordance explains that question banks, attempts, grade columns, and live assessment release are not implemented here.

## State and role boundary

Saving a published item creates a new draft revision and removes that item from the student projection until the teacher publishes it again. Assignment and quiz drafts cannot be published from this slice, so they cannot create phantom gradebook records. Student screens receive only the minimised `projectCourse(..., "student")` content projection; authoring controls never appear there. All current persistence is synthetic, local browser state with version validation and safe fallback to the pilot fixture.

## Next handoff

The following assessment/question-bank PR will add canonical assessment identity, parts/attempts, taxonomy, validation, and release gates. A future backend will replace local metadata with permissioned storage and enforce tenant/role permissions server-side.
