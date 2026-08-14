import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("learning-loop prototype", () => {
  afterEach(cleanup);
  beforeEach(() => {
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
      screen.getByText("Author / QA only · student view"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Economics 10A" }),
    ).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    expect(
      screen.getByText("Author / QA only · teacher view"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Build the learning path, in context.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("How a supply shock changes equilibrium"),
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
    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Student course" }));
    expect(screen.getAllByText("Complete")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Open activity" }));

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
    expect(screen.getByText("2 items locked")).toBeInTheDocument();
    expect(
      screen.getByText("Available from 22 Aug · Your teacher sets release"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Module Composer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    expect(
      screen.getByRole("button", { name: "+ Add module" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Page" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open activity" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    expect(screen.getByDisplayValue("New page")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Publish" }).at(-1)!);
    expect(
      screen.getByDisplayValue("New page").closest("li"),
    ).toHaveTextContent("Published");
  });

  it("keeps authored module changes through student preview and return", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));

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
    const title = screen.getByRole("textbox", {
      name: "Title for Start here: reading a market graph",
    });
    fireEvent.change(title, { target: { value: "Market graph reading" } });
    fireEvent.blur(title);
    expect(
      screen.getByDisplayValue("Market graph reading"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    expect(screen.getByText("Market graph reading")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    expect(
      screen.getByDisplayValue("Market graph reading"),
    ).toBeInTheDocument();
  });

  it("allows an empty title draft while preserving the canonical saved title", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    const title = screen.getByRole("textbox", {
      name: "Title for Start here: reading a market graph",
    });
    fireEvent.change(title, { target: { value: "" } });
    expect(title).toHaveValue("");
    fireEvent.blur(title);
    expect(screen.getByRole("alert")).toHaveTextContent(/needs a title/);
    fireEvent.click(screen.getByRole("button", { name: "Student course" }));
    expect(
      screen.getByText("Start here: reading a market graph"),
    ).toBeInTheDocument();
  });

  it("allocates unique item identities after an author-preview round trip", () => {
    render(createElement(App));
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview as student" }));
    fireEvent.click(screen.getByRole("button", { name: "Teacher workspace" }));
    fireEvent.click(screen.getByRole("button", { name: "+ Page" }));

    expect(screen.getAllByDisplayValue("New page")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Student course" }));
    expect(
      screen.getByRole("heading", { name: "Economics 10A" }),
    ).toBeInTheDocument();
  });
});
