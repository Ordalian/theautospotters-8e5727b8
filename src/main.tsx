import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { cleanupRuntimeRecoveryUrl, reloadForRuntimeRecovery } from "./lib/runtimeRecovery";
import "./index.css";

cleanupRuntimeRecoveryUrl();

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();

  if (!reloadForRuntimeRecovery()) {
    console.error("Vite preload error could not be auto-recovered.", event);
  }
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(<App />);
