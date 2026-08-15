import { useEffect, useMemo, useRef, useState } from "react";
import {
  isAllowedLocalFileMimeType,
  type CourseMediaProjection,
  type MediaProjectionItem,
  type MediaSource,
} from "./domain/media";

type EditorKind = MediaSource["kind"];

interface MediaDraft {
  title: string;
  description: string;
  altText: string;
  kind: EditorKind;
  url: string;
  localSource: Extract<MediaSource, { kind: "local-file" }> | null;
}

const emptyDraft: MediaDraft = {
  title: "",
  description: "",
  altText: "",
  kind: "link",
  url: "",
  localSource: null,
};

function sourceLabel(source: MediaSource): string {
  if (source.kind === "youtube") return "YouTube resource";
  if (source.kind === "local-file") return "Device-local file draft";
  return "External link";
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function YouTubeResource({ item }: { item: MediaProjectionItem }) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (loaded) frameRef.current?.focus();
  }, [loaded]);
  if (item.source.kind !== "youtube") return null;
  return loaded ? (
    <div className="youtube-frame-wrap">
      <iframe
        ref={frameRef}
        src={`https://www.youtube-nocookie.com/embed/${item.source.videoId}`}
        title={item.title}
        allow="accelerometer; encrypted-media; picture-in-picture"
        allowFullScreen
      />
      <p>External YouTube media is now loaded under YouTube&apos;s policies.</p>
    </div>
  ) : (
    <button
      className="button quiet"
      type="button"
      aria-label={`Load YouTube embed for ${item.title}`}
      onClick={() => setLoaded(true)}
    >
      Load YouTube embed
    </button>
  );
}

export function CourseFiles({
  role,
  projection,
  onSave,
  onPublish,
  onArchive,
}: {
  role: "teacher" | "student";
  projection: CourseMediaProjection;
  onSave?: (input: {
    id?: string;
    title: string;
    description: string;
    altText: string | null;
    source: MediaSource;
  }) => { error: string | null; id: string | null };
  onPublish?: (id: string) => string | null;
  onArchive?: (id: string) => string | null;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MediaDraft>(emptyDraft);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [previewById, setPreviewById] = useState<Record<string, string>>({});
  const [editorPreview, setEditorPreview] = useState<string | null>(null);
  const [restoreFocusId, setRestoreFocusId] = useState<string | null>(null);
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editRefs = useRef(new Map<string, HTMLButtonElement>());
  const previewUrlsRef = useRef(new Set<string>());
  const editorOpen = editingId !== null;
  const editingItem = projection.assets.find((item) => item.id === editingId);

  useEffect(() => {
    if (editorOpen) titleRef.current?.focus();
  }, [editorOpen, editingId]);

  useEffect(() => {
    if (!restoreFocusId || editorOpen) return;
    const target =
      restoreFocusId === "new"
        ? addTriggerRef.current
        : (editRefs.current.get(restoreFocusId) ?? addTriggerRef.current);
    target?.focus();
    setRestoreFocusId(null);
  }, [editorOpen, projection.assets, restoreFocusId]);

  useEffect(
    () => () => {
      for (const url of previewUrlsRef.current) URL.revokeObjectURL?.(url);
    },
    [],
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return projection.assets.filter((item) => {
      const matchesText =
        !normalized ||
        item.title.toLocaleLowerCase().includes(normalized) ||
        item.description.toLocaleLowerCase().includes(normalized);
      return (
        matchesText && (kindFilter === "all" || item.source.kind === kindFilter)
      );
    });
  }, [kindFilter, projection.assets, query]);

  const clearEditorPreview = () => {
    if (editorPreview) {
      URL.revokeObjectURL?.(editorPreview);
      previewUrlsRef.current.delete(editorPreview);
    }
    setEditorPreview(null);
  };

  const closeEditor = () => {
    const priorId = editingId;
    clearEditorPreview();
    setDraft(emptyDraft);
    setEditingId(null);
    setError("");
    setRestoreFocusId(priorId && priorId !== "new" ? priorId : "new");
  };

  const openNew = () => {
    clearEditorPreview();
    setDraft(emptyDraft);
    setEditingId("new");
    setError("");
  };

  const openEdit = (item: MediaProjectionItem) => {
    clearEditorPreview();
    setDraft({
      title: item.title,
      description: item.description,
      altText: item.altText ?? "",
      kind: item.source.kind,
      url: item.source.kind === "local-file" ? "" : item.source.url,
      localSource: item.source.kind === "local-file" ? item.source : null,
    });
    setEditingId(item.id);
    setError("");
  };

  const chooseFile = (file: File | undefined) => {
    clearEditorPreview();
    if (!file) {
      setDraft((current) => ({ ...current, localSource: null }));
      return;
    }
    if (!isAllowedLocalFileMimeType(file.type)) {
      setError(
        "Choose a PNG, JPEG, GIF, WebP, PDF, text, CSV, Word, PowerPoint, or Excel file.",
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setError("");
    setDraft((current) => ({
      ...current,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
      localSource: {
        kind: "local-file",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        lastModified: file.lastModified,
      },
    }));
    if (file.type.startsWith("image/") && URL.createObjectURL) {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.add(url);
      setEditorPreview(url);
    }
  };

  const save = () => {
    if (!onSave) return;
    let source: MediaSource;
    if (draft.kind === "local-file") {
      if (!draft.localSource) {
        setError("Choose a local file before saving this metadata draft.");
        return;
      }
      source = draft.localSource;
    } else if (draft.kind === "youtube") {
      source = {
        kind: "youtube",
        url: draft.url,
        videoId: "pending-url-validation",
      };
    } else {
      source = { kind: "link", url: draft.url };
    }
    const result = onSave({
      id: editingId === "new" ? undefined : (editingId ?? undefined),
      title: draft.title,
      description: draft.description,
      altText: draft.altText || null,
      source,
    });
    if (result.error || !result.id) {
      setError(result.error ?? "The resource could not be saved.");
      return;
    }
    if (editorPreview) {
      const priorPreview = previewById[result.id];
      if (priorPreview && priorPreview !== editorPreview) {
        URL.revokeObjectURL?.(priorPreview);
        previewUrlsRef.current.delete(priorPreview);
      }
      setPreviewById((current) => ({
        ...current,
        [result.id as string]: editorPreview,
      }));
      setEditorPreview(null);
    } else if (source.kind !== "local-file" && previewById[result.id]) {
      const priorPreview = previewById[result.id];
      URL.revokeObjectURL?.(priorPreview);
      previewUrlsRef.current.delete(priorPreview);
      setPreviewById((current) => {
        const next = { ...current };
        delete next[result.id as string];
        return next;
      });
    }
    setStatus(
      editingItem?.state === "published"
        ? "Changes saved as a private draft. Students no longer see this resource until you publish it again."
        : "Resource saved as a private draft.",
    );
    setDraft(emptyDraft);
    setEditingId(null);
    setRestoreFocusId(result.id);
  };

  const publish = (item: MediaProjectionItem) => {
    const nextError = onPublish?.(item.id);
    if (nextError) {
      setError(nextError);
      return;
    }
    setError("");
    setStatus(`${item.title} is now available to enrolled course members.`);
    setRestoreFocusId(item.id);
  };

  const archive = (item: MediaProjectionItem) => {
    const nextError = onArchive?.(item.id);
    if (nextError) {
      setError(nextError);
      return;
    }
    const preview = previewById[item.id];
    if (preview) {
      URL.revokeObjectURL?.(preview);
      previewUrlsRef.current.delete(preview);
      setPreviewById((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
    }
    setError("");
    setStatus(`${item.title} was archived.`);
    setRestoreFocusId("new");
  };

  if (role === "student") {
    return (
      <main id="main-content" className="page-shell files-shell">
        <section className="files-hero">
          <div>
            <p className="eyebrow">Course resources</p>
            <h1>Files &amp; media</h1>
            <p className="hero-copy">
              Published links and videos selected for this course. External
              media loads only when you choose it.
            </p>
          </div>
          <span className="media-count">
            {projection.assets.length} available
          </span>
        </section>
        <section
          className="student-media-grid"
          aria-label="Published course resources"
        >
          {projection.assets.length ? (
            projection.assets.map((item) => (
              <article className="media-card student-media-card" key={item.id}>
                <div className="media-kind-row">
                  <span>{sourceLabel(item.source)}</span>
                </div>
                <h2>{item.title}</h2>
                <p>{item.description}</p>
                {item.source.kind === "link" && (
                  <a
                    className="button quiet"
                    href={item.source.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${item.title} (external resource)`}
                  >
                    Open external resource
                  </a>
                )}
                <YouTubeResource item={item} />
              </article>
            ))
          ) : (
            <div className="media-empty">
              <h2>No published resources</h2>
              <p>Your teacher has not released a course resource yet.</p>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell files-shell">
      <section className="files-hero">
        <div>
          <p className="eyebrow">Permissioned course resources</p>
          <h1>Files &amp; media</h1>
          <p className="hero-copy">
            Curate links and YouTube resources for learners, or stage private
            device-local file metadata without pretending it has been uploaded.
          </p>
        </div>
        <button
          ref={addTriggerRef}
          className="button primary"
          type="button"
          aria-expanded={editorOpen}
          aria-controls="media-editor"
          onClick={editorOpen ? closeEditor : openNew}
        >
          {editorOpen ? "Close editor" : "+ Add resource"}
        </button>
      </section>

      {editorOpen && (
        <section
          id="media-editor"
          className="media-editor"
          aria-labelledby="media-editor-title"
        >
          <div className="media-editor-intro">
            <p className="eyebrow">Save a private draft first</p>
            <h2 id="media-editor-title">
              {editingId === "new" ? "Add course resource" : "Edit resource"}
            </h2>
            <p>
              Links can be published after validation. Browser files remain
              device-local drafts: bytes and object URLs are never saved or
              shown to students.
            </p>
            {editingItem?.state === "published" && (
              <p className="field-note">
                Saving changes withdraws this published resource from students
                until you review and publish the new draft.
              </p>
            )}
          </div>
          <div className="media-editor-fields">
            <label>
              Resource type
              <select
                value={draft.kind}
                onChange={(event) => {
                  clearEditorPreview();
                  setDraft((current) => ({
                    ...current,
                    kind: event.target.value as EditorKind,
                    url: "",
                    localSource: null,
                  }));
                }}
              >
                <option value="link">External HTTPS link</option>
                <option value="youtube">YouTube resource</option>
                <option value="local-file">Device-local file draft</option>
              </select>
            </label>
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
            <label className="media-description-field">
              Description
              <textarea
                rows={4}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            {draft.kind === "local-file" ? (
              <div className="local-file-chooser">
                <label>
                  Choose or replace local file
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                    onChange={(event) => chooseFile(event.target.files?.[0])}
                  />
                </label>
                {draft.localSource && (
                  <div className="local-file-preview">
                    {editorPreview ? (
                      <img
                        src={editorPreview}
                        alt={draft.altText || "Local image preview"}
                      />
                    ) : (
                      <span className="file-preview-icon" aria-hidden="true">
                        FILE
                      </span>
                    )}
                    <div>
                      <strong>{draft.localSource.fileName}</strong>
                      <small>
                        {draft.localSource.mimeType} ·{" "}
                        {fileSize(draft.localSource.sizeBytes)}
                      </small>
                      <button
                        className="button quiet"
                        type="button"
                        onClick={() => {
                          chooseFile(undefined);
                          if (fileRef.current) fileRef.current.value = "";
                          setStatus(
                            "Local file selection removed. Choose another file or close the editor.",
                          );
                          fileRef.current?.focus();
                        }}
                      >
                        Remove selection
                      </button>
                    </div>
                  </div>
                )}
                {draft.localSource?.mimeType.startsWith("image/") && (
                  <label>
                    Image alternative text
                    <input
                      value={draft.altText}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          altText: event.target.value,
                        }))
                      }
                    />
                  </label>
                )}
                <p className="field-note">
                  Demo/local only · selected bytes disappear when this browser
                  session ends.
                </p>
              </div>
            ) : (
              <label className="media-url-field">
                {draft.kind === "youtube" ? "YouTube URL" : "HTTPS URL"}
                <input
                  type="url"
                  value={draft.url}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      url: event.target.value,
                    }))
                  }
                  placeholder={
                    draft.kind === "youtube"
                      ? "https://www.youtube.com/watch?v=…"
                      : "https://…"
                  }
                />
              </label>
            )}
          </div>
          {error && (
            <p className="composer-error" role="alert">
              {error}
            </p>
          )}
          <div className="media-editor-actions">
            <button className="button primary" type="button" onClick={save}>
              Save draft
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={closeEditor}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {!editorOpen && error && (
        <p className="composer-error media-page-error" role="alert">
          {error}
        </p>
      )}

      <section className="media-library" aria-labelledby="media-library-title">
        <div className="section-heading media-library-heading">
          <div>
            <p className="eyebrow">Course library</p>
            <h2 id="media-library-title">
              {projection.assets.length} resources
            </h2>
          </div>
          <span className="section-note">
            Synthetic/local demo · no cloud storage
          </span>
        </div>
        <div className="media-tools">
          <label>
            Search resources
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title or description"
            />
          </label>
          <label>
            Type
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="link">Links</option>
              <option value="youtube">YouTube</option>
              <option value="local-file">Local drafts</option>
            </select>
          </label>
        </div>
        <div className="media-grid">
          {visible.length ? (
            visible.map((item) => (
              <article className="media-card" key={item.id}>
                {previewById[item.id] && item.source.kind === "local-file" ? (
                  <img
                    className="media-card-preview"
                    src={previewById[item.id]}
                    alt={item.altText || "Local image preview"}
                  />
                ) : (
                  <div
                    className={`media-card-art ${item.source.kind}`}
                    aria-hidden="true"
                  >
                    {item.source.kind === "youtube"
                      ? "VIDEO"
                      : item.source.kind === "local-file"
                        ? "LOCAL"
                        : "LINK"}
                  </div>
                )}
                <div className="media-kind-row">
                  <span>{sourceLabel(item.source)}</span>
                  <span className={`item-status ${item.state}`}>
                    {item.state}
                  </span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.source.kind === "local-file" && (
                  <p className="media-storage-note">
                    <strong>{item.source.fileName}</strong> ·{" "}
                    {fileSize(item.source.sizeBytes)}
                    <br />
                    Not uploaded · not student-visible
                  </p>
                )}
                <div className="media-card-actions">
                  {item.state === "archived" ? (
                    <span className="media-publish-boundary">
                      Archived · read-only
                    </span>
                  ) : (
                    <>
                      <button
                        ref={(node) => {
                          if (node) editRefs.current.set(item.id, node);
                          else editRefs.current.delete(item.id);
                        }}
                        className="button quiet"
                        type="button"
                        aria-label={`Edit ${item.title}`}
                        disabled={editorOpen}
                        onClick={() => openEdit(item)}
                      >
                        {editingId === item.id ? "Editing" : "Edit"}
                      </button>
                      {item.state === "draft" &&
                        item.source.kind !== "local-file" && (
                          <button
                            className="button primary"
                            type="button"
                            aria-label={`Publish ${item.title}`}
                            disabled={editingId === item.id}
                            onClick={() => publish(item)}
                          >
                            Publish
                          </button>
                        )}
                      {item.source.kind === "local-file" && (
                        <span className="media-publish-boundary">
                          Needs durable storage before release
                        </span>
                      )}
                      <button
                        className="button quiet danger-text"
                        type="button"
                        aria-label={`Archive ${item.title}`}
                        disabled={editingId === item.id}
                        onClick={() => archive(item)}
                      >
                        Archive
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="media-empty">
              <h3>No resources match</h3>
              <p>Clear the filters or add a course resource.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
