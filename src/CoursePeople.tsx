import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CoursePeopleProjection,
  CoursePersonProjection,
} from "./domain/people";

type AddableRole = "student" | "teaching-assistant";

function roleLabel(role: CoursePersonProjection["role"]): string {
  switch (role) {
    case "platform-owner":
      return "Platform owner";
    case "organization-administrator":
      return "Organisation administrator";
    case "teaching-assistant":
      return "Teaching assistant";
    case "parent-guardian":
      return "Parent / guardian";
    default:
      return role[0].toUpperCase() + role.slice(1);
  }
}

function membershipPresentation(
  status: CoursePersonProjection["membershipStatus"],
): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Active", className: "published" };
    case "invited":
      return { label: "Pending activation", className: "draft" };
    case "suspended":
      return { label: "Suspended", className: "scheduled" };
    case "ended":
      return { label: "Ended", className: "hidden" };
  }
}

export function CoursePeople({
  role,
  projection,
  onAddPerson,
}: {
  role: "teacher" | "student";
  projection: CoursePeopleProjection;
  onAddPerson?: (input: {
    displayName: string;
    role: AddableRole;
  }) => string | null;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AddableRole | "teacher">(
    "all",
  );
  const [showAdd, setShowAdd] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [newRole, setNewRole] = useState<AddableRole>("student");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAdd) nameRef.current?.focus();
  }, [showAdd]);

  const visiblePeople = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return projection.people.filter((person) => {
      const matchesQuery =
        !normalized ||
        person.displayName.toLocaleLowerCase().includes(normalized) ||
        (person.preferredName ?? "").toLocaleLowerCase().includes(normalized);
      const matchesRole = roleFilter === "all" || person.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [projection.people, query, roleFilter]);

  const closeAdd = () => {
    setShowAdd(false);
    setError("");
    setDisplayName("");
    addTriggerRef.current?.focus();
  };

  const submit = () => {
    if (!onAddPerson) return;
    const nextError = onAddPerson({ displayName, role: newRole });
    if (nextError) {
      setError(nextError);
      return;
    }
    setStatusMessage(
      `${displayName.trim()} was added as a local pending roster record.`,
    );
    closeAdd();
  };

  if (role === "student") {
    const person = projection.people[0];
    return (
      <main id="main-content" className="page-shell people-shell">
        <section className="people-hero student-people-hero">
          <div>
            <p className="eyebrow">My course profile</p>
            <h1>People</h1>
            <p className="hero-copy">
              Your course identity is private. This pilot does not expose a
              class directory or another learner&apos;s membership.
            </p>
          </div>
          {person && (
            <article className="my-course-profile">
              <span className="profile-avatar" aria-hidden="true">
                {person.displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div>
                <strong>{person.displayName}</strong>
                <span>{roleLabel(person.role)}</span>
                <small>Active course membership · synthetic profile</small>
              </div>
            </article>
          )}
        </section>
        <p className="privacy-note">
          Production profiles, recovery, and parent links require verified
          identity and backend permission checks. No email or phone is needed
          for this local pilot.
        </p>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell people-shell">
      <section className="people-hero">
        <div>
          <p className="eyebrow">Course membership</p>
          <h1>People</h1>
          <p className="hero-copy">
            See who belongs to this course and add a private local roster record
            without collecting student email addresses.
          </p>
        </div>
        {projection.capabilities.canAddPeople && (
          <button
            ref={addTriggerRef}
            className="button primary"
            type="button"
            aria-expanded={showAdd}
            aria-controls="add-person-panel"
            onClick={() => {
              setShowAdd((current) => !current);
              setError("");
            }}
          >
            {showAdd ? "Close Add people" : "+ Add people"}
          </button>
        )}
      </section>

      {showAdd && (
        <section
          id="add-person-panel"
          className="add-person-panel"
          aria-labelledby="add-person-title"
        >
          <div>
            <p className="eyebrow">Local roster record</p>
            <h2 id="add-person-title">Add one person</h2>
            <p>
              This creates a synthetic pending membership on this device. It
              does not create an account, send an invite, or generate a
              production activation code.
            </p>
          </div>
          <div className="add-person-fields">
            <label>
              Display name
              <input
                ref={nameRef}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Jordan Lee"
                autoComplete="off"
              />
            </label>
            <label>
              Course role
              <select
                value={newRole}
                onChange={(event) =>
                  setNewRole(event.target.value as AddableRole)
                }
              >
                <option value="student">Student</option>
                <option value="teaching-assistant">Teaching assistant</option>
              </select>
            </label>
          </div>
          {error && (
            <p className="field-note composer-error" role="alert">
              {error}
            </p>
          )}
          <div className="add-person-actions">
            <button className="button primary" type="button" onClick={submit}>
              Add pending record
            </button>
            <button className="button quiet" type="button" onClick={closeAdd}>
              Cancel
            </button>
          </div>
        </section>
      )}

      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      <section className="people-directory" aria-labelledby="roster-title">
        <div className="section-heading people-directory-heading">
          <div>
            <p className="eyebrow">Authorised roster</p>
            <h2 id="roster-title">{projection.people.length} course members</h2>
          </div>
          <span className="section-note">
            Synthetic identities · no contact details
          </span>
        </div>
        <div className="people-tools">
          <label>
            Search people
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name"
            />
          </label>
          <label>
            Role
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value as typeof roleFilter)
              }
            >
              <option value="all">All roles</option>
              <option value="teacher">Teachers</option>
              <option value="teaching-assistant">Teaching assistants</option>
              <option value="student">Students</option>
            </select>
          </label>
        </div>
        <div className="people-list" role="list">
          {visiblePeople.map((person) => (
            <article
              className="person-row"
              role="listitem"
              key={person.profileId}
            >
              <span className="profile-avatar" aria-hidden="true">
                {person.displayName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <div className="person-identity">
                <strong>{person.displayName}</strong>
                {person.preferredName &&
                  person.preferredName !== person.displayName && (
                    <small>Uses {person.preferredName}</small>
                  )}
              </div>
              <span>{roleLabel(person.role)}</span>
              <span
                className={`state-pill ${membershipPresentation(person.membershipStatus).className}`}
              >
                {membershipPresentation(person.membershipStatus).label}
              </span>
            </article>
          ))}
          {!visiblePeople.length && (
            <p className="people-empty">No roster records match this view.</p>
          )}
        </div>
      </section>
      <p className="privacy-note">
        Production onboarding will consume a private one-time activation code
        after the student confirms their name and chooses their own credentials.
        Teachers never set or see passwords. Recovery requires in-person
        verification and a fresh code.
      </p>
    </main>
  );
}
