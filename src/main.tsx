// Entry point — mounts the React tree into <div id="root">.
//
// Strict mode is on. Any side effects in components fire twice in dev,
// once in prod — helpful for catching impure render logic.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
