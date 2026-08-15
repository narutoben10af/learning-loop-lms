export type CourseDestination =
  | "home"
  | "announcements"
  | "modules"
  | "assignments"
  | "quizzes"
  | "grades"
  | "people"
  | "pages"
  | "files"
  | "discussions"
  | "calendar"
  | "settings";

export const courseDestinations: Array<{
  id: CourseDestination;
  label: string;
  teacherOnly?: boolean;
}> = [
  { id: "home", label: "Home" },
  { id: "announcements", label: "Announcements" },
  { id: "modules", label: "Modules" },
  { id: "assignments", label: "Assignments" },
  { id: "quizzes", label: "Quizzes" },
  { id: "grades", label: "Grades" },
  { id: "people", label: "People" },
  { id: "pages", label: "Pages" },
  { id: "files", label: "Files" },
  { id: "discussions", label: "Discussions" },
  { id: "calendar", label: "Calendar" },
  { id: "settings", label: "Settings", teacherOnly: true },
];

export const courseDestinationLabel = (destination: CourseDestination) =>
  courseDestinations.find((candidate) => candidate.id === destination)?.label ??
  "Course";
