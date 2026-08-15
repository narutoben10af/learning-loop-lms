import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

function openTeacherComposer(): void {
  if (!screen.queryByRole("heading", { name: "My workspace" })) {
    fireEvent.popState(window, {
      state: { learningLoopScreen: "teacher-dashboard" },
    });
  }
  fireEvent.click(
    screen.getByRole("button", { name: "Open course workspace" }),
  );
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

    fireEvent.click(screen.getByRole("button", { name: "Evidence & marking" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Evidence & marking" }));
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
      name: "Supply curve adjustment handle",
    });

    fireEvent.keyDown(supplyCurve, { key: "ArrowRight" });

    expect(supplyCurve).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("$4 · 80 rentals")).toBeInTheDocument();
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
      name: "Demand curve adjustment handle",
    });

    fireEvent.keyDown(demandCurve, { key: "ArrowRight" });
    fireEvent.keyDown(demandCurve, { key: "Enter" });

    expect(screen.getByText("Revisit the producer clue.")).toBeInTheDocument();
    expect(
      screen.getByText(/Which side of the market does that affect first/),
    ).toBeInTheDocument();
  });

  it("makes adjustment handles distinct from the single equilibrium result point", () => {
    render(createElement(App));
    openStudentActivity();

    expect(screen.getAllByText("Adjust")).toHaveLength(2);
    expect(document.querySelectorAll(".curve-handle")).toHaveLength(2);
    expect(document.querySelectorAll(".equilibrium-point")).toHaveLength(1);
    expect(
      screen.getByRole("slider", {
        name: "Supply curve adjustment handle",
      }),
    ).toHaveAttribute("aria-valuetext", "unchanged");
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
  });

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

    expect(screen.getByText("Environmental Economics 10B")).toBeInTheDocument();
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
    expect(screen.getByText("Private Teacher Draft")).toBeInTheDocument();

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
