import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

export function Foundation() {
  return (
    <main>
      <p className="eyebrow">Economics pilot</p>
      <h1>Learning Loop LMS</h1>
      <p>
        The first interactive learning loop is being built through focused pull
        requests.
      </p>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <Foundation />
  </StrictMode>,
);
