import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnnouncementAudience,
  AnnouncementProjectionItem,
  CourseAnnouncementsProjection,
} from "./domain/announcements";

interface AnnouncementDraft {
  title: string;
  body: string;
  audience: AnnouncementAudience;
}

const emptyDraft: AnnouncementDraft = {
  title: "",
  body: "",
  audience: "all-course-members",
};

function audienceLabel(audience: AnnouncementAudience): string {
  if (audience === "students-only") return "Students";
  if (audience === "staff-only") return "Course staff";
  return "Everyone in course";
}

function stateLabel(item: AnnouncementProjectionItem): string {
  if (item.state === "released") return "Published";
  return item.state[0].toUpperCase() + item.state.slice(1);
}

function dateTimeLabel(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

export function CourseAnnouncements({
  role,
  projection,
  onSave,
  onRelease,
  onArchive,
}: {
  role: "teacher" | "student";
  projection: CourseAnnouncementsProjection;
  onSave?: (input: AnnouncementDraft & { id?: string }) => string | null;
  onRelease?: (
    id: string,
    state: "published" | "scheduled",
    releaseAt?: string,
  ) => string | null;
  onArchive?: (id: string) => string | null;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("current");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AnnouncementDraft>(emptyDraft);
  const [scheduleById, setScheduleById] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [restoreFocusId, setRestoreFocusId] = useState<string | null>(null);
  const newTriggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const editTriggerRefs = useRef(new Map<string, HTMLButtonElement>());

  const editorOpen = editingId !== null;

  useEffect(() => {
    if (editorOpen) titleRef.current?.focus();
  }, [editorOpen, editingId]);

  useEffect(() => {
    if (!restoreFocusId || editorOpen) return;
    if (restoreFocusId === "new") {
      newTriggerRef.current?.focus();
    } else {
      const itemTrigger = editTriggerRefs.current.get(restoreFocusId);
      (itemTrigger ?? newTriggerRef.current)?.focus();
    }
    setRestoreFocusId(null);
  }, [editorOpen, projection.announcements, restoreFocusId]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return projection.announcements.filter((item) => {
      const matchesQuery =
        !normalized ||
        item.title.toLocaleLowerCase().includes(normalized) ||
        item.body.toLocaleLowerCase().includes(normalized);
      const matchesState =
        stateFilter === "all" ||
        (stateFilter === "current" && item.state !== "archived") ||
        item.state === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [projection.announcements, query, stateFilter]);

  const closeEditor = (restoreFocus = true) => {
    const priorId = editingId;
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
    if (restoreFocus) {
      setRestoreFocusId(priorId && priorId !== "new" ? priorId : "new");
    }
  };

  const openNew = () => {
    setDraft(emptyDraft);
    setEditingId("new");
    setError("");
  };

  const openEdit = (item: AnnouncementProjectionItem) => {
    setDraft({
      title: item.title,
      body: item.body,
      audience: item.audience,
    });
    setEditingId(item.id);
    setError("");
  };

  const save = () => {
    if (!onSave) return;
    const nextError = onSave({
      ...draft,
      id: editingId === "new" ? undefined : (editingId ?? undefined),
    });
    if (nextError) {
      setError(nextError);
      return;
    }
    setStatus(
      editingId === "new"
        ? "Announcement saved as a private draft."
        : "Changes saved as a private draft. Publish when they are ready.",
    );
    closeEditor();
  };

  const release = (
    item: AnnouncementProjectionItem,
    state: "published" | "scheduled",
  ) => {
    if (!onRelease) return;
    const nextError = onRelease(
      item.id,
      state,
      state === "scheduled" ? scheduleById[item.id] : undefined,
    );
    if (nextError) {
      setError(nextError);
      return;
    }
    setStatus(
      state === "published"
        ? `${item.title} is now visible to its chosen audience.`
        : `${item.title} is scheduled for release.`,
    );
    setError("");
    setScheduleById((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setRestoreFocusId(item.id);
  };

  if (role === "student") {
    return (
      <main id="main-content" className="page-shell announcements-shell">
        <section className="announcements-hero">
          <div>
            <p className="eyebrow">Course updates</p>
            <h1>Announcements</h1>
            <p className="hero-copy">
              Published updates for this course. Drafts, staff notes, and future
              releases stay private.
            </p>
          </div>
          <span className="announcement-count">
            {projection.announcements.length} available
          </span>
        </section>
        <section
          className="announcement-feed"
          aria-label="Course announcements"
        >
          {projection.announcements.length ? (
            projection.announcements.map((item) => (
              <article
                className="announcement-card student-announcement"
                key={item.id}
              >
                <div className="announcement-card-meta">
                  <span>{audienceLabel(item.audience)}</span>
                  {dateTimeLabel(item.releaseAt) && (
                    <time dateTime={item.releaseAt ?? undefined}>
                      {dateTimeLabel(item.releaseAt)}
                    </time>
                  )}
                </div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))
          ) : (
            <div className="announcement-empty">
              <h2>No published announcements</h2>
              <p>Your teacher has not released a course update yet.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell announcements-shell">
      <section className="announcements-hero">
        <div>
          <p className="eyebrow">Course communication</p>
          <h1>Announcements</h1>
          <p className="hero-copy">
            Write once, choose the audience, then deliberately publish or
            schedule. This local pilot does not send email or push alerts.
          </p>
        </div>
        {projection.capabilities.canAuthor && (
          <button
            ref={newTriggerRef}
            className="button primary"
            type="button"
            aria-expanded={editorOpen}
            aria-controls="announcement-editor"
            onClick={editorOpen ? () => closeEditor() : openNew}
          >
            {editorOpen ? "Close editor" : "+ New announcement"}
          </button>
        )}
      </section>

      {editorOpen && (
        <section
          id="announcement-editor"
          className="announcement-editor"
          aria-labelledby="announcement-editor-title"
        >
          <div>
            <p className="eyebrow">Private until released</p>
            <h2 id="announcement-editor-title">
              {editingId === "new" ? "New announcement" : "Edit announcement"}
            </h2>
            <p>
              Editing a published announcement withdraws that version and saves
              a private draft. Publish the revision when it is ready.
            </p>
          </div>
          <div className="announcement-editor-fields">
            <label>
              Title
              <input
                ref={titleRef}
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Audience
              <select
                value={draft.audience}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    audience: event.target.value as AnnouncementAudience,
                  }))
                }
              >
                <option value="all-course-members">Everyone in course</option>
                <option value="students-only">Students only</option>
                <option value="staff-only">Course staff only</option>
              </select>
            </label>
            <label className="announcement-body-field">
              Message
              <textarea
                rows={6}
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    body: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          {error && (
            <p className="composer-error" role="alert">
              {error}
            </p>
          )}
          <div className="announcement-editor-actions">
            <button className="button primary" type="button" onClick={save}>
              Save draft
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={() => closeEditor()}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {!editorOpen && error && (
        <p className="composer-error announcement-page-error" role="alert">
          {error}
        </p>
      )}

      <section
        className="announcement-library"
        aria-labelledby="announcement-library-title"
      >
        <div className="section-heading announcement-library-heading">
          <div>
            <p className="eyebrow">Release queue</p>
            <h2 id="announcement-library-title">
              {projection.announcements.length} announcements
            </h2>
          </div>
          <span className="section-note">Local synthetic content only</span>
        </div>
        <div className="announcement-tools">
          <label>
            Search announcements
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title or message"
            />
          </label>
          <label>
            Status
            <select
              value={stateFilter}
              onChange={(event) => setStateFilter(event.target.value)}
            >
              <option value="current">Current</option>
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="announcement-list">
          {visible.length ? (
            visible.map((item) => (
              <article className="announcement-card" key={item.id}>
                <div className="announcement-card-meta">
                  <span className={`item-status ${item.state}`}>
                    {stateLabel(item)}
                  </span>
                  <span>{audienceLabel(item.audience)}</span>
                  {dateTimeLabel(item.releaseAt) && (
                    <time dateTime={item.releaseAt ?? undefined}>
                      {dateTimeLabel(item.releaseAt)}
                    </time>
                  )}
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.state !== "archived" && (
                  <div className="announcement-card-actions">
                    <button
                      ref={(node) => {
                        if (node) editTriggerRefs.current.set(item.id, node);
                        else editTriggerRefs.current.delete(item.id);
                      }}
                      className="button quiet"
                      type="button"
                      disabled={editorOpen}
                      onClick={() => openEdit(item)}
                    >
                      {editingId === item.id ? "Editing" : "Edit"}
                    </button>
                    {item.state === "draft" && (
                      <button
                        className="button primary"
                        type="button"
                        disabled={editingId === item.id}
                        onClick={() => release(item, "published")}
                      >
                        Publish now
                      </button>
                    )}
                    {item.state === "draft" && (
                      <div className="announcement-schedule">
                        <label htmlFor={`schedule-${item.id}`}>
                          Schedule release
                        </label>
                        <div>
                          <input
                            id={`schedule-${item.id}`}
                            type="datetime-local"
                            value={scheduleById[item.id] ?? ""}
                            onChange={(event) => {
                              const value = event.target.value;
                              setScheduleById((current) => ({
                                ...current,
                                [item.id]: value,
                              }));
                            }}
                          />
                          <button
                            className="button quiet"
                            type="button"
                            disabled={editingId === item.id}
                            onClick={() => release(item, "scheduled")}
                          >
                            Schedule
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      className="button quiet danger-text"
                      type="button"
                      onClick={() => {
                        const nextError = onArchive?.(item.id);
                        if (nextError) setError(nextError);
                        else {
                          setError("");
                          setStatus(`${item.title} was archived.`);
                          setRestoreFocusId("new");
                        }
                      }}
                    >
                      Archive
                    </button>
                  </div>
                )}
              </article>
            ))
          ) : (
            <div className="announcement-empty">
              <h3>No announcements match</h3>
              <p>Clear the search or start a new announcement.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
