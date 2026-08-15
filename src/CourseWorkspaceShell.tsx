import type { ReactNode } from "react";
import type { WorkspaceCourseProjection } from "./domain/workspace";
import {
  courseDestinationLabel,
  courseDestinations,
  type CourseDestination,
} from "./courseNavigation";

export function CourseWorkspaceShell({
  role,
  course,
  activeDestination,
  onNavigate,
  onExit,
  children,
}: {
  role: "teacher" | "student";
  course: WorkspaceCourseProjection;
  activeDestination: CourseDestination;
  onNavigate: (destination: CourseDestination) => void;
  onExit: () => void;
  children: ReactNode;
}) {
  const visibleDestinations = courseDestinations.filter(
    (destination) => role === "teacher" || !destination.teacherOnly,
  );
  return (
    <div className="course-workspace-frame">
      <aside className="course-workspace-rail">
        <button
          className="course-workspace-back"
          type="button"
          onClick={onExit}
        >
          ← {role === "teacher" ? "My workspace" : "My courses"}
        </button>
        <div className="course-workspace-identity">
          <span>{course.code}</span>
          <strong>{course.title}</strong>
          <small>
            {course.section} · {course.term}
          </small>
        </div>
        <nav aria-label={`${course.title} course areas`}>
          {visibleDestinations.map((destination) => (
            <button
              key={destination.id}
              type="button"
              aria-current={
                activeDestination === destination.id ? "page" : undefined
              }
              onClick={() => onNavigate(destination.id)}
            >
              {destination.label}
            </button>
          ))}
        </nav>
        <p className="course-workspace-boundary">
          {role === "teacher"
            ? "Teacher workspace · synthetic local data"
            : "Student course · published access only"}
        </p>
      </aside>
      <div className="course-workspace-stage">
        <div className="course-workspace-mobile-nav">
          <button type="button" onClick={onExit}>
            ← {role === "teacher" ? "Workspace" : "Courses"}
          </button>
          <label htmlFor="course-area-select">Course area</label>
          <select
            id="course-area-select"
            value={activeDestination}
            onChange={(event) =>
              onNavigate(event.target.value as CourseDestination)
            }
          >
            {visibleDestinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.label}
              </option>
            ))}
          </select>
          <span className={`state-pill ${course.lifecycle}`}>
            {course.lifecycle === "active" ? "Active" : "Private draft"}
          </span>
        </div>
        <div className="course-context-strip">
          <span>
            {role === "teacher" ? "Teacher course" : "Student course"} ·{" "}
            {course.subject}
          </span>
          <strong>{courseDestinationLabel(activeDestination)}</strong>
          <span className={`state-pill ${course.lifecycle}`}>
            {course.lifecycle === "active" ? "Active" : "Private draft"}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
