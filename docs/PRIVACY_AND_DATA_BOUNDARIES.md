# Privacy and Data Boundaries

## Prototype boundary

The current repository uses original synthetic Economics content, fictional learner names, and local browser storage. It must not receive real student records. Browser storage is for demo continuity, not a secure database or evidence record.

The People prototype stores only fictional display names, profile IDs, course roles, membership lifecycle, and audit metadata in a separately versioned local snapshot. Teachers may create a pending local roster record without email or phone, but this does not create an account, send an invitation, or issue a production activation code. Student projection returns only the signed-in demo learner's own profile; it never exposes the teacher roster.

The Announcements prototype stores original/synthetic notice text, explicit course and audience scope, release lifecycle, and audit metadata in a separately versioned local snapshot. Student projection excludes drafts, archived notices, staff-only notices, and future scheduled notices. The prototype sends no email, push notification, or external message and collects no recipient contact details.

Browser-selected image/file bytes remain on the device in the immediate course-shell milestone. The demo may retain allowlisted metadata and show an ephemeral same-session preview, but it must not claim that a file is uploaded, shared, backed up, or available to another device. Local paths, handles, object URLs, raw bytes, and unknown metadata never enter student projections or persistent local JSON.

## Pilot minimum

- No student email address or phone number is required.
- Enrolled identity comes from a teacher-created roster, not public registration or a shared course code.
- A private, per-student, one-time activation code lets the learner confirm their name and choose a username/password. The code is consumed after use.
- Teachers never create or see passwords. In-person verified recovery issues a fresh one-time code.
- Production access is tenant-, role-, course-, relationship-, object-, and purpose-scoped in backend services.

## Learning evidence

Collect only evidence needed for learning and teacher action: activity responses, structured attempts, explanations, feedback, rubric decisions, and disclosed resource-progress events. Set a short pilot retention period before collecting production evidence and support correction/deletion according to school policy.

Future article/video telemetry may record resource opened, active foreground reading time, progress milestones, activity attempts/submission, and disclosed YouTube player events. It must not capture raw browsing outside the LMS, hidden attention signals, GPS, biometrics, camera/microphone monitoring, or cross-site tracking. Engagement evidence is not proof of attention or comprehension.

## Future durable course media

Persistent school media requires a separately authorised backend and object-storage provider. Provider selection, account terms, region, cost, retention, backups, and incident ownership are explicit decisions. The backend must enforce tenant/course/object permissions, safe object keys, signed access, type/size allowlists, malware scanning, quotas, deletion/revocation, and audit. Provider secrets never appear in browser/mobile code, local storage, logs, screenshots, Git, or MCP resources.

## AI and agents

No live AI, model provider, content ingestion, or MCP server exists in the first slice. Later AI is a premium, optional, teacher-reviewed draft service. Authorised contextual retrieval may select only LMS resources the actor could already access, apply field-level redaction, cite sources, and honor access changes/revocation. An agent connection never broadens data access. Provider credentials remain server-side only.

Grades, attendance, enrolment, publication, invitation, permission changes, or file sharing remain explicitly authorised, confirmation-required, and audited. No model or MCP client receives direct database access or arbitrary code execution.
