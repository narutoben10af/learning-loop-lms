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

  it("labels the role switch as demo-only and separates teacher evidence", () => {
    render(createElement(App));
    expect(screen.getByText("Demo and author review only")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "How a supply shock changes equilibrium",
      }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Teacher evidence" }));
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
  });

  it("moves completed student evidence into the teacher review view", () => {
    render(createElement(App));
    fireEvent.click(screen.getByLabelText("Price falls and quantity rises"));
    fireEvent.click(screen.getByRole("button", { name: "Check prediction" }));
    fireEvent.click(screen.getByRole("button", { name: "Shift right →" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Teacher evidence" }));
    expect(
      screen.getByText(/Price falls and quantity rises · 1 attempt/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Supply right · \$4, 80 rentals/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Lower costs increase supply/)).toBeInTheDocument();
  });
});
