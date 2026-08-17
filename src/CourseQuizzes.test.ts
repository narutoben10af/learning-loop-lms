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

function installLocalStorage(): void {
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
      setItem: (key: string, value: string) => values.set(key, value),
    } satisfies Storage,
  });
}

function openTeacherQuizzes(): void {
  fireEvent.click(
    screen.getByRole("button", { name: "Open course workspace" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Quizzes" }));
}

function openStudentQuizzes(): void {
  fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
  fireEvent.click(screen.getByRole("button", { name: "Open course" }));
  fireEvent.click(screen.getByRole("button", { name: "Quizzes" }));
}

describe("course quiz authoring and attempts", () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.history.replaceState({}, "", "#quiz-test");
    installLocalStorage();
  });

  it("keeps teacher authoring and student attempt controls role-separated", () => {
    render(createElement(App));
    openTeacherQuizzes();
    expect(
      screen.getByRole("heading", {
        name: "Quizzes that preserve learning evidence",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "+ Create quiz" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /start quiz/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Student courses" }));
    fireEvent.click(screen.getByRole("button", { name: "Open course" }));
    fireEvent.click(screen.getByRole("button", { name: "Quizzes" }));
    expect(
      screen.getByRole("heading", { name: "Check what you understand" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Start quiz" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "+ Create quiz" })).toBeNull();
    expect(screen.queryByText("Organisation review · QA demo")).toBeNull();
  });

  it("creates, reviews, and publishes an objective bank question", () => {
    render(createElement(App));
    openTeacherQuizzes();
    fireEvent.click(screen.getByRole("button", { name: "Question bank" }));
    fireEvent.click(screen.getByRole("button", { name: "+ New question" }));
    expect(screen.getByLabelText("Question type")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Question type"), {
      target: { value: "true-false" },
    });
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: {
        value: "A price ceiling below equilibrium can create a shortage.",
      },
    });
    fireEvent.change(screen.getByLabelText("Feedback when correct"), {
      target: {
        value: "Correct: quantity demanded exceeds quantity supplied.",
      },
    });
    fireEvent.change(
      screen.getByLabelText("Feedback after an incorrect response"),
      {
        target: { value: "Compare demand and supply at the controlled price." },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Save question draft" }),
    );
    const card = screen
      .getByText("A price ceiling below equilibrium can create a shortage.")
      .closest("article");
    expect(card).not.toBeNull();
    fireEvent.click(
      within(card as HTMLElement).getByRole("button", {
        name: "Request review",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Organisation review · QA demo" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Approve and publish" }),
    );
    expect(
      screen.getByRole("heading", { name: "Organisation review" }),
    ).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Question bank" }));
    const publishedCard = screen
      .getByText("A price ceiling below equilibrium can create a shortage.")
      .closest("article");
    expect(
      within(publishedCard as HTMLElement).getByText("Published"),
    ).toBeVisible();
  });

  it("starts, resumes, submits, and persists a private deterministic result", () => {
    const first = render(createElement(App));
    openStudentQuizzes();
    fireEvent.click(screen.getByRole("button", { name: "Start quiz" }));
    expect(
      screen.getByRole("heading", { name: "Market equilibrium check" }),
    ).toHaveFocus();
    fireEvent.click(screen.getByLabelText("A shortage"));
    fireEvent.click(screen.getByLabelText("True"));
    fireEvent.click(screen.getByRole("button", { name: "Submit attempt" }));
    expect(screen.getByRole("heading", { name: "3 / 3 points" })).toBeVisible();
    const result = screen
      .getByRole("heading", { name: "3 / 3 points" })
      .closest("section");
    expect(
      within(result as HTMLElement).getAllByText(/Question \d · Correct/),
    ).toHaveLength(2);

    first.unmount();
    render(createElement(App));
    openStudentQuizzes();
    fireEvent.click(screen.getByRole("button", { name: "View latest result" }));
    expect(screen.getByRole("heading", { name: "3 / 3 points" })).toBeVisible();
    expect(screen.queryByText(/other learner/i)).not.toBeInTheDocument();
  });
});
