import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { PEOPLE_STORAGE_KEY } from "./domain/people";
import { ANNOUNCEMENTS_STORAGE_KEY } from "./domain/announcements";
import { MEDIA_STORAGE_KEY } from "./domain/media";

function openTeacherComposer(): void {
  if (!screen.queryByRole("heading", { name: "My workspace" })) {
    fireEvent.popState(window, {
      state: { learningLoopScreen: "teacher-dashboard" },
    });
  }
  fireEvent.click(
    screen.getByRole("button", { name: "Open course workspace" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Modules" }));
}

function openStudentCourse(): void {
  if (!screen.queryByRole("heading", { name: "My courses" })) {
    if (screen.queryByRole("button", { name: "Student courses" })) {
      fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    } else {
      fireEvent.popState(window, {
        state: { learningLoopScreen: "student-dashboard" },
      });
    }
  }
  fireEvent.click(screen.getByRole("button", { name: "Open course" }));
}

function openStudentActivity(): void {
  openStudentCourse();
  fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
}

describe("learning-loop prototype", () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.history.replaceState({}, "", "#test");
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        get length() {
          return values.size;
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
      } satisfies Storage,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:learning-loop-preview",
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: () => undefined,
    });
  });

  it("labels the demo entry and separates student and teacher surfaces", () => {
    render(createElement(App));
    expect(
      screen.getByText("Author / QA only · teacher view"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "My workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Economics 10A")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "+ Create course" }),
    ).toBeInTheDocument();

    openStudentCourse();
    expect(
      screen.queryByRole("button", { name: "Teacher workspace" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Demo entry")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Modules" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Private progress.")).toBeInTheDocument();
    expect(
      screen.queryByText("Week 3 · Data response"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
    expect(
      screen.getByRole("heading", {
        name: "How a supply shock changes equilibrium",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Predict").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );

    openTeacherComposer();
    expect(
      screen.getByText("Author / QA only · teacher view"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Build the learning path, in context.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "What will happen to equilibrium?",
      }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Grades" }));
    expect(
      screen.getByRole("heading", {
        name: "Supply shifts — learning evidence",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: "What will happen to equilibrium?",
      }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "attention" },
    });
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.queryByText("Jordan Lee")).not.toBeInTheDocument();
  });

  it("opens a recognisable course workspace with functional navigation", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );

    expect(screen.getByRole("main")).toHaveFocus();
    expect(
      screen.getByRole("heading", { name: "Economics 10A" }),
    ).toBeVisible();
    expect(screen.getByText("Next teaching action")).toBeVisible();
    const courseNav = screen.getByRole("navigation", {
      name: "Economics 10A course areas",
    });
    for (const label of [
      "Home",
      "Announcements",
      "Modules",
      "Assignments",
      "Quizzes",
      "Grades",
      "People",
      "Pages",
      "Files",
      "Discussions",
      "Calendar",
      "Settings",
    ]) {
      expect(courseNav).toHaveTextContent(label);
    }

    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    expect(
      screen.getByRole("heading", { name: "Announcements" }),
    ).toBeVisible();
    expect(screen.getByText("Welcome to Market Signals")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByText("Next teaching action")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByRole("heading", { name: "People" })).toBeVisible();
    expect(screen.getByRole("button", { name: "+ Add people" })).toBeVisible();
    expect(screen.getByText("6 course members")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Modules" }));
    expect(
      screen.getByRole("heading", {
        name: "Build the learning path, in context.",
      }),
    ).toBeVisible();
  });

  it("keeps the student course shell free of teacher-only settings", () => {
    render(createElement(App));
    openStudentCourse();

    expect(screen.getByRole("main")).toHaveFocus();
    const courseNav = screen.getByRole("navigation", {
      name: "Economics 10A course areas",
    });
    expect(courseNav).toHaveTextContent("Announcements");
    expect(courseNav).toHaveTextContent("Modules");
    expect(courseNav).not.toHaveTextContent("Settings");
    expect(screen.queryByText("Teacher course")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(
      screen.getByRole("heading", { name: "Files & media" }),
    ).toBeVisible();
    expect(
      screen.getByText("Price controls: synthetic guided reading"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /add resource/i })).toBeNull();
  });

  it("creates, validates, publishes, and projects an external resource", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add resource" }));
    expect(screen.getByLabelText("Title")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Elasticity data guide" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Synthetic course resource for interpreting data." },
    });
    fireEvent.change(screen.getByLabelText("HTTPS URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Only HTTPS/);
    fireEvent.change(screen.getByLabelText("HTTPS URL"), {
      target: { value: "https://example.edu/economics/elasticity" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const draftCard = screen
      .getByText("Elasticity data guide")
      .closest("article");
    expect(
      within(draftCard as HTMLElement).getByRole("button", {
        name: "Edit Elasticity data guide",
      }),
    ).toHaveFocus();
    fireEvent.click(
      within(draftCard as HTMLElement).getByRole("button", {
        name: "Publish Elasticity data guide",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    const studentResourceCard = screen
      .getByText("Elasticity data guide")
      .closest("article");
    expect(studentResourceCard).not.toBeNull();
    expect(
      within(studentResourceCard as HTMLElement).getByRole("link", {
        name: "Open Elasticity data guide (external resource)",
      }),
    ).toHaveAttribute("href", "https://example.edu/economics/elasticity");
  });

  it("stages only local file metadata and keeps it out of student projection", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add resource" }));
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "local-file" },
    });
    const file = new File(["synthetic image bytes"], "diagram.png", {
      type: "image/png",
      lastModified: 100,
    });
    fireEvent.change(screen.getByLabelText("Choose or replace local file"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove selection" }));
    expect(screen.getByLabelText("Choose or replace local file")).toHaveFocus();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Local file selection removed",
    );
    fireEvent.change(screen.getByLabelText("Choose or replace local file"), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A device-local draft diagram." },
    });
    fireEvent.change(screen.getByLabelText("Image alternative text"), {
      target: { value: "Synthetic market diagram" },
    });
    expect(screen.getByAltText("Synthetic market diagram")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const localCard = screen.getByText("diagram").closest("article");
    expect(localCard).not.toBeNull();
    expect(localCard).toHaveTextContent("Not uploaded · not student-visible");
    expect(localCard).toHaveTextContent("Needs durable storage before release");
    expect(
      within(localCard as HTMLElement).queryByRole("button", {
        name: "Publish",
      }),
    ).toBeNull();
    const persisted = window.localStorage.getItem(MEDIA_STORAGE_KEY) ?? "";
    expect(persisted).toContain("diagram.png");
    expect(persisted).not.toContain("synthetic image bytes");
    expect(persisted).not.toContain("blob:learning-loop-preview");

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    expect(screen.queryByText("diagram")).not.toBeInTheDocument();
  });

  it("keeps YouTube external until a learner explicitly loads the embed", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add resource" }));
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "youtube" },
    });
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Market adjustment explainer" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Teacher-selected external video resource." },
    });
    fireEvent.change(screen.getByLabelText("YouTube URL"), {
      target: { value: "https://youtu.be/abcdefghijk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const teacherCard = screen
      .getByText("Market adjustment explainer")
      .closest("article");
    fireEvent.click(
      within(teacherCard as HTMLElement).getByRole("button", {
        name: "Publish Market adjustment explainer",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    const studentCard = screen
      .getByText("Market adjustment explainer")
      .closest("article");
    expect(
      within(studentCard as HTMLElement).queryByTitle(
        "Market adjustment explainer",
      ),
    ).toBeNull();
    fireEvent.click(
      within(studentCard as HTMLElement).getByRole("button", {
        name: "Load YouTube embed for Market adjustment explainer",
      }),
    );
    expect(
      within(studentCard as HTMLElement).getByTitle(
        "Market adjustment explainer",
      ),
    ).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/abcdefghijk",
    );
    expect(
      within(studentCard as HTMLElement).getByTitle(
        "Market adjustment explainer",
      ),
    ).toHaveFocus();
  });

  it("makes archived resources read-only and discloses published edit withdrawal", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    const publishedCard = screen
      .getByText("Price controls: synthetic guided reading")
      .closest("article");
    fireEvent.click(
      within(publishedCard as HTMLElement).getByRole("button", {
        name: "Edit Price controls: synthetic guided reading",
      }),
    );
    expect(screen.getByText(/Saving changes withdraws/)).toBeVisible();
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Revised synthetic resource guidance." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Students no longer see this resource",
    );

    const revisedCard = screen
      .getByText("Price controls: synthetic guided reading")
      .closest("article");
    fireEvent.click(
      within(revisedCard as HTMLElement).getByRole("button", {
        name: "Archive Price controls: synthetic guided reading",
      }),
    );
    const archivedCard = screen
      .getByText("Price controls: synthetic guided reading")
      .closest("article");
    expect(archivedCard).toHaveTextContent("Archived · read-only");
    expect(
      within(archivedCard as HTMLElement).queryByRole("button", {
        name: /Edit|Archive/,
      }),
    ).toBeNull();
  });

  it("restores the complete teacher course route through browser history", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    const announcementsRoute = structuredClone(window.history.state);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    const homeRoute = structuredClone(window.history.state);
    fireEvent.click(screen.getByRole("button", { name: "Modules" }));

    fireEvent.popState(window, { state: homeRoute });
    expect(screen.getByText("Next teaching action")).toBeVisible();
    expect(screen.getByRole("main")).toHaveFocus();

    fireEvent.popState(window, { state: announcementsRoute });
    expect(
      screen.getByRole("heading", { name: "Announcements" }),
    ).toBeVisible();
    expect(screen.getByText("Welcome to Market Signals")).toBeVisible();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("keeps announcement drafts private until an explicit release", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    fireEvent.click(screen.getByRole("button", { name: "+ New announcement" }));
    expect(screen.getByLabelText("Title")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Bring your calculation notes" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "We will compare the before and after equilibria." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    expect(screen.getByText("Bring your calculation notes")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    expect(
      screen.queryByText("Bring your calculation notes"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new announcement/i }),
    ).toBeNull();

    fireEvent.popState(window, {
      state: {
        learningLoopScreen: "teacher-course-placeholder",
        learningLoopDestination: "announcements",
        learningLoopCourseId: "econ-10a",
      },
    });
    const draftCard = screen
      .getByText("Bring your calculation notes")
      .closest("article");
    expect(draftCard).not.toBeNull();
    fireEvent.click(
      within(draftCard as HTMLElement).getByRole("button", {
        name: "Publish now",
      }),
    );
    const publishedCard = screen
      .getByText("Bring your calculation notes")
      .closest("article");
    expect(
      within(publishedCard as HTMLElement).getByRole("button", {
        name: "Edit",
      }),
    ).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    expect(screen.getByText("Bring your calculation notes")).toBeVisible();
  });

  it("keeps schedule inputs independent and restores mutation focus", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));

    const addDraft = (title: string) => {
      fireEvent.click(
        screen.getByRole("button", { name: "+ New announcement" }),
      );
      fireEvent.change(screen.getByLabelText("Title"), {
        target: { value: title },
      });
      fireEvent.change(screen.getByLabelText("Message"), {
        target: { value: `${title} message` },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    };
    addDraft("First draft");
    addDraft("Second draft");

    const firstCard = screen.getByText("First draft").closest("article");
    const secondCard = screen.getByText("Second draft").closest("article");
    const firstSchedule = within(firstCard as HTMLElement).getByLabelText(
      "Schedule release",
    );
    const secondSchedule = within(secondCard as HTMLElement).getByLabelText(
      "Schedule release",
    );
    fireEvent.change(firstSchedule, {
      target: { value: "2099-08-16T09:00" },
    });
    expect(secondSchedule).toHaveValue("");
    fireEvent.click(
      within(firstCard as HTMLElement).getByRole("button", {
        name: "Schedule",
      }),
    );
    const scheduledCard = screen.getByText("First draft").closest("article");
    expect(
      within(scheduledCard as HTMLElement).getByRole("button", {
        name: "Edit",
      }),
    ).toHaveFocus();

    fireEvent.click(
      within(secondCard as HTMLElement).getByRole("button", {
        name: "Archive",
      }),
    );
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "+ New announcement" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toHaveFocus();
  });

  it("restores focus when a filtered mutation removes its card", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "published" },
    });
    const publishedCard = screen
      .getByText("Welcome to Market Signals")
      .closest("article");
    fireEvent.click(
      within(publishedCard as HTMLElement).getByRole("button", {
        name: "Edit",
      }),
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Revised Market Signals" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "draft" },
    });
    const draftCard = screen
      .getByText("Revised Market Signals")
      .closest("article");
    fireEvent.click(
      within(draftCard as HTMLElement).getByRole("button", {
        name: "Publish now",
      }),
    );
    expect(
      screen.getByRole("button", { name: "+ New announcement" }),
    ).toHaveFocus();
  });

  it("falls back from malformed announcement storage", () => {
    window.localStorage.setItem(
      ANNOUNCEMENTS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        organizationId: "learning-loop-demo-school",
        announcements: [{ secretRecipients: ["student-1"] }],
        revision: 1,
        audit: {
          createdBy: "owner-1",
          createdAt: "2026-08-15T09:00:00.000Z",
          updatedBy: "owner-1",
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
      }),
    );
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Announcements" }));
    expect(screen.getByText("Welcome to Market Signals")).toBeVisible();
    expect(screen.queryByText("student-1")).toBeNull();
  });

  it("restores student destinations without exposing stale teacher state", () => {
    render(createElement(App));
    openStudentCourse();
    fireEvent.click(screen.getByRole("button", { name: "Files" }));
    const filesRoute = structuredClone(window.history.state);
    fireEvent.click(screen.getByRole("button", { name: "Modules" }));
    const modulesRoute = structuredClone(window.history.state);
    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));

    fireEvent.popState(window, { state: modulesRoute });
    expect(screen.getByRole("heading", { name: "Modules" })).toHaveFocus();
    expect(screen.queryByText("Settings")).not.toBeInTheDocument();

    fireEvent.popState(window, { state: filesRoute });
    expect(
      screen.getByRole("heading", { name: "Files & media" }),
    ).toBeVisible();
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("adds and persists a profile-linked local roster membership", () => {
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Add people" }));
    expect(screen.getByLabelText("Display name")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Display name"), {
      target: { value: "Nadia Rahman" },
    });
    fireEvent.change(screen.getByLabelText("Course role"), {
      target: { value: "student" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add pending record" }));

    expect(screen.getByText("7 course members")).toBeVisible();
    expect(screen.getByText("Nadia Rahman")).toBeVisible();
    expect(screen.getByText("Pending activation")).toBeVisible();
    expect(screen.getByRole("button", { name: "+ Add people" })).toHaveFocus();

    cleanup();
    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByText("Nadia Rahman")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByText("Maya Chen")).toBeVisible();
    expect(screen.queryByText("Nadia Rahman")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add people/i })).toBeNull();
  });

  it("falls back from malformed people storage without leaking unknown fields", () => {
    window.localStorage.setItem(
      PEOPLE_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        organizationId: "learning-loop-demo-school",
        profiles: [
          {
            id: "student-1",
            organizationId: "learning-loop-demo-school",
            displayName: "Injected profile",
            preferredName: null,
            status: "active",
            revision: 1,
            audit: {
              createdBy: "owner-1",
              createdAt: "2026-08-15T09:00:00.000Z",
              updatedBy: "owner-1",
              updatedAt: "2026-08-15T09:00:00.000Z",
            },
            secretNote: "must not cross projection",
          },
        ],
        revision: 1,
        audit: {
          createdBy: "owner-1",
          createdAt: "2026-08-15T09:00:00.000Z",
          updatedBy: "owner-1",
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
      }),
    );

    render(createElement(App));
    fireEvent.click(
      screen.getByRole("button", { name: "Open course workspace" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByText("Maya Chen")).toBeVisible();
    expect(screen.queryByText("Injected profile")).not.toBeInTheDocument();
    expect(screen.queryByText("must not cross projection")).toBeNull();
  });

  it("discloses the prebuilt interactive boundary at author and learner entry points", () => {
    render(createElement(App));
    openStudentCourse();

    expect(screen.getByText("Prebuilt interactive activity")).toBeVisible();
    expect(screen.getByText("Supply and demand explorer")).toBeVisible();
    expect(
      screen.getByText(
        /this pilot interaction is predefined. self-service template configuration is planned next/i,
      ),
    ).toBeVisible();
    expect(
      screen.queryByText("Configurable interactive template"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
    expect(screen.getByText("Supply and demand explorer")).toBeVisible();

    openTeacherComposer();
    expect(screen.getByText("Supply and demand explorer")).toBeVisible();
    expect(screen.getByText(/editable now:/i)).toBeVisible();
    expect(screen.getByText(/locked in this validated pilot:/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /configure interactive/i }),
    ).not.toBeInTheDocument();
  });

  it("moves completed student evidence into the teacher review view", () => {
    render(createElement(App));
    openStudentActivity();
    fireEvent.click(screen.getByLabelText("Price falls and quantity rises"));
    fireEvent.click(screen.getByRole("button", { name: "Check prediction" }));
    const supplyControls = screen.getByRole("group", {
      name: "Supply position",
    });
    fireEvent.click(
      supplyControls.querySelectorAll<HTMLButtonElement>("button")[2],
    );
    fireEvent.click(screen.getByRole("button", { name: "Check this shift" }));
    fireEvent.change(
      screen.getByLabelText(/Explain why lower battery-assembly costs/),
      {
        target: {
          value:
            "Lower costs increase supply, reducing price from $6 to $4 and raising quantity from 60 to 80.",
        },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "I can explain it" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Submit for teacher review" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "← Economics 10A" }));
    expect(screen.getAllByText("Complete")).toHaveLength(2);
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "Grades" }));
    expect(
      screen.getByText(/Price falls and quantity rises · 1 attempt/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Supply right · \$4, 80 rentals/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Lower costs increase supply/)).toBeInTheDocument();
  });

  it("offers the same constrained shift through the graph keyboard control", () => {
    render(createElement(App));
    openStudentActivity();
    const supplyCurve = screen.getByRole("slider", {
      name: "Supply curve shift control",
    });

    fireEvent.keyDown(supplyCurve, { key: "ArrowRight" });

    expect(supplyCurve).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getAllByText("$4 · 80 rentals")).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Right →", pressed: true }),
    ).toBeInTheDocument();

    fireEvent.keyDown(supplyCurve, { key: "Enter" });
    expect(screen.getByText("Supply shifted right.")).toBeInTheDocument();
  });

  it("identifies a demand-shift misconception through the same graph control", () => {
    render(createElement(App));
    openStudentActivity();
    const demandCurve = screen.getByRole("slider", {
      name: "Demand curve shift control",
    });

    fireEvent.keyDown(demandCurve, { key: "ArrowRight" });
    fireEvent.keyDown(demandCurve, { key: "Enter" });

    expect(screen.getByText("Revisit the producer clue.")).toBeInTheDocument();
    expect(
      screen.getByText(/Which side of the market does that affect first/),
    ).toBeInTheDocument();
  });

  it("shows readable shift controls and a before/now market comparison", () => {
    render(createElement(App));
    openStudentActivity();

    expect(screen.getAllByText("Shift")).toHaveLength(2);
    expect(document.querySelectorAll(".curve-handle")).toHaveLength(2);
    expect(document.querySelectorAll(".equilibrium-point")).toHaveLength(1);
    const supplyControl = screen.getByRole("slider", {
      name: "Supply curve shift control",
    });
    expect(supplyControl).toHaveAttribute("aria-valuetext", "unchanged");

    fireEvent.keyDown(supplyControl, { key: "ArrowRight" });

    expect(document.querySelectorAll(".curve-baseline")).toHaveLength(1);
    expect(document.querySelectorAll(".equilibrium-point")).toHaveLength(2);
    expect(
      document.querySelector(".baseline-equilibrium-point"),
    ).not.toBeNull();
    expect(document.querySelector(".current-equilibrium-point")).not.toBeNull();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Dashed curve and hollow amber point = before",
    );
  });

  it("shows release state and teacher composer actions without crossing role surfaces", () => {
    render(createElement(App));
    openStudentCourse();
    expect(screen.getByText("1 item locked")).toBeInTheDocument();
    expect(
      screen.getByText("Available from 22 Aug · Your teacher sets release"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Module Composer")).not.toBeInTheDocument();

    openTeacherComposer();
    expect(
      screen.getByRole("button", { name: "+ Add module" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Page" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open activity" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "New page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(screen.getByText("New page").closest("li")).toHaveTextContent(
      "Published",
    );
  }, 10_000);

  it("keeps authored module changes through student preview and return", () => {
    render(createElement(App));
    openTeacherComposer();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Move Week 1 · Market signals down",
      }),
    );
    expect(
      screen.getByRole("button", {
        name: "Move Week 1 · Market signals up",
      }),
    ).toBeEnabled();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit content" })[0]);
    const title = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(title, { target: { value: "Market graph reading" } });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    expect(screen.getByText("Market graph reading")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(screen.getByText("Market graph reading")).toBeInTheDocument();
    openTeacherComposer();
    expect(screen.getByText("Market graph reading")).toBeInTheDocument();
  });

  it("requires saved learner content before a new item can publish", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));

    expect(
      screen.getByRole("button", { name: "Save content first" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(screen.queryByText("New page")).not.toBeInTheDocument();
  });

  it("keeps an unsaved editor draft through author preview and restores focus", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Drafted reading" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(screen.queryByText("Drafted reading")).not.toBeInTheDocument();
    openTeacherComposer();

    const editButtons = screen.getAllByRole("button", { name: "Edit content" });
    fireEvent.click(editButtons[editButtons.length - 1]);
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue(
      "Drafted reading",
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(editButtons[editButtons.length - 1]).toHaveFocus();
  });

  it("keeps publish blocked while a preserved draft differs from saved content", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Stable page" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));

    const firstEditButtons = screen.getAllByRole("button", {
      name: "Edit content",
    });
    fireEvent.click(firstEditButtons[firstEditButtons.length - 1]);
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "An unsaved revision should not release yet." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    openTeacherComposer();

    expect(
      screen.getByRole("button", { name: "Save content first" }),
    ).toBeDisabled();
    const resumedEditButtons = screen.getAllByRole("button", {
      name: "Edit content",
    });
    fireEvent.click(resumedEditButtons[resumedEditButtons.length - 1]);
    expect(screen.getByLabelText("Body")).toHaveValue(
      "An unsaved revision should not release yet.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(
      screen.getByText("An unsaved revision should not release yet."),
    ).toBeInTheDocument();
  });

  it("allows an empty title draft while preserving the canonical saved title", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getAllByRole("button", { name: "Edit content" })[0]);
    const title = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(title, { target: { value: "" } });
    expect(title).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/needs a title/);
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(
      screen.getByText("Start here: reading a market graph"),
    ).toBeInTheDocument();
  });

  it("allocates unique item identities after an author-preview round trip", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));

    expect(
      Array.from(document.querySelectorAll(".composer-item-title")).filter(
        (element) => element.textContent === "New page",
      ),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(
      screen.getByRole("heading", { name: "Economics 10A" }),
    ).toBeInTheDocument();
  });

  it("creates, edits, publishes, and renders a learner-facing page", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Why markets adjust" },
    });
    fireEvent.change(screen.getByLabelText("Body"), {
      target: {
        value:
          "Read the graph, identify the changed determinant, and explain the new equilibrium.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));

    expect(screen.getByText("Why markets adjust")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Read the graph, identify the changed determinant, and explain the new equilibrium.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Edit content")).not.toBeInTheDocument();
  });

  it("validates a resource and exposes its saved description to students", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Resource" }));
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/description/);

    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "A short article about supply determinants." },
    });
    fireEvent.change(screen.getByLabelText("Link URL"), {
      target: { value: "https://example.edu/supply" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));

    expect(
      screen.getByText("A short article about supply determinants. · link"),
    ).toBeInTheDocument();
  });

  it("keeps local file selection as metadata-only resource evidence", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Resource" }));
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A teacher-provided graph handout." },
    });
    fireEvent.change(screen.getByLabelText("Resource type"), {
      target: { value: "file" },
    });
    const file = new File(["synthetic"], "market-graph.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText(/Select a local file/), {
      target: { files: [file] },
    });
    expect(screen.getByText("market-graph.pdf")).toBeInTheDocument();
    expect(screen.getByText(/local metadata only/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(
      screen.getByText("A teacher-provided graph handout. · file"),
    ).toBeInTheDocument();
  });

  it("keeps assignments as explicit draft handoffs without phantom release", () => {
    render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Assignment" }));
    expect(screen.getByText("Assignment draft only")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Explain a supply shock" },
    });
    fireEvent.change(screen.getByLabelText("Instructions"), {
      target: {
        value: "Use the graph to explain the price and quantity change.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    expect(
      screen.getByRole("button", { name: "Builder required" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(
      screen.queryByText("Explain a supply shock"),
    ).not.toBeInTheDocument();
  });

  it("falls back safely when persisted course content is malformed", () => {
    window.localStorage.setItem(
      "learning-loop-course-model-v1",
      JSON.stringify({ course: { id: "broken" }, modules: [], items: [] }),
    );
    render(createElement(App));
    expect(
      screen.getByRole("heading", { name: "Economics 10A" }),
    ).toBeInTheDocument();
    openTeacherComposer();
    expect(screen.getAllByText("Week 1 · Market signals")).not.toHaveLength(0);
  });

  it("creates a private course draft, persists it, and keeps it out of the student workspace", () => {
    const view = render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "+ Create course" }));
    expect(screen.getByLabelText("Course title")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Course title"), {
      target: { value: "Environmental Economics 10B" },
    });
    fireEvent.change(screen.getByLabelText("Course code"), {
      target: { value: "ECON-10B" },
    });
    fireEvent.change(screen.getByLabelText("Class / section"), {
      target: { value: "10B" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create private draft" }),
    );

    expect(
      screen.getByRole("heading", { name: "Environmental Economics 10B" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Start here")).not.toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "← My workspace" }));
    expect(
      screen.getByRole("heading", { name: "Environmental Economics 10B" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Private draft")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    expect(
      screen.queryByText("Environmental Economics 10B"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "+ Create course" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Modules").closest("div")).toHaveTextContent("2");
    expect(screen.queryByText("In preparation")).not.toBeInTheDocument();

    view.unmount();
    render(createElement(App));
    expect(
      screen.getByRole("heading", { name: "Environmental Economics 10B" }),
    ).toBeInTheDocument();
  });

  it("validates required course setup before creating a course", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "+ Create course" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create private draft" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /complete the title, subject, course code, class, and term/i,
    );
    expect(screen.getByRole("heading", { name: "My workspace" })).toBeVisible();
  });

  it("restores focus when course creation is cancelled", () => {
    render(createElement(App));
    const trigger = screen.getByRole("button", { name: "+ Create course" });
    fireEvent.click(trigger);
    expect(screen.getByLabelText("Course title")).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(trigger).toHaveFocus();
    expect(screen.queryByLabelText("Course title")).not.toBeInTheDocument();
  });

  it("fails closed when history requests an unauthorised student course", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "+ Create course" }));
    fireEvent.change(screen.getByLabelText("Course title"), {
      target: { value: "Private Teacher Draft" },
    });
    fireEvent.change(screen.getByLabelText("Course code"), {
      target: { value: "PRIVATE-1" },
    });
    fireEvent.change(screen.getByLabelText("Class / section"), {
      target: { value: "Staff" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create private draft" }),
    );
    expect(
      screen.getByRole("heading", { name: "Private Teacher Draft" }),
    ).toBeInTheDocument();

    fireEvent.popState(window, {
      state: { learningLoopScreen: "student-course" },
    });

    expect(screen.getByRole("heading", { name: "My courses" })).toBeVisible();
    expect(screen.queryByText("Private Teacher Draft")).not.toBeInTheDocument();
    expect(screen.queryByText("Demo entry")).not.toBeInTheDocument();
  });

  it("reloads saved authored content from the versioned local model", () => {
    const view = render(createElement(App));
    openTeacherComposer();
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Persisted lesson note" },
    });
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "This saved content survives a reload." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save content" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    view.unmount();

    render(createElement(App));
    openTeacherComposer();
    expect(screen.getByText("Persisted lesson note")).toBeInTheDocument();
    expect(
      screen.getByText("This saved content survives a reload."),
    ).toBeInTheDocument();
  });
});
