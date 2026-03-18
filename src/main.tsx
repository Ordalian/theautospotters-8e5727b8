import { createRoot } from "react-dom/client";
import { installBrowserStorageFallbacks } from "./lib/browserStorage";
import { cleanupRuntimeRecoveryUrl, normalizeRuntimeErrorMessage, reloadForRuntimeRecovery } from "./lib/runtimeRecovery";
import "./index.css";

installBrowserStorageFallbacks();
cleanupRuntimeRecoveryUrl();

window.addEventListener("vite:preloadError", (event) => {
  if (reloadForRuntimeRecovery()) {
    event.preventDefault();
    return;
  }

  console.error("Vite preload error could not be auto-recovered.", event);
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

function renderBootstrapFallback(message: string) {
  const shell = document.createElement("div");
  shell.style.minHeight = "100vh";
  shell.style.display = "flex";
  shell.style.alignItems = "center";
  shell.style.justifyContent = "center";
  shell.style.padding = "24px";
  shell.style.background = "hsl(0 0% 4%)";
  shell.style.color = "hsl(40 6% 90%)";

  const card = document.createElement("div");
  card.style.width = "100%";
  card.style.maxWidth = "32rem";
  card.style.border = "1px solid hsl(40 3% 14%)";
  card.style.borderRadius = "1rem";
  card.style.padding = "1.5rem";
  card.style.background = "hsl(0 0% 7%)";
  card.style.boxShadow = "0 20px 40px hsl(0 0% 0% / 0.35)";

  const title = document.createElement("h1");
  title.textContent = "Unable to start the app";
  title.style.margin = "0 0 0.5rem";
  title.style.fontSize = "1.25rem";

  const description = document.createElement("p");
  description.textContent = "A startup error was detected. Reload the page to retry.";
  description.style.margin = "0";
  description.style.color = "hsl(40 3% 60%)";

  const details = document.createElement("p");
  details.textContent = message;
  details.style.margin = "1rem 0 0";
  details.style.padding = "0.75rem";
  details.style.borderRadius = "0.75rem";
  details.style.border = "1px solid hsl(40 3% 14%)";
  details.style.background = "hsl(0 0% 10%)";
  details.style.fontSize = "0.75rem";
  details.style.color = "hsl(40 3% 68%)";

  card.append(title, description, details);
  shell.append(card);
  rootElement.replaceChildren(shell);
}

async function bootstrap() {
  const appModule = await import("./App");
  const App = appModule?.default;

  if (!App) {
    throw new Error("App module loaded without a default export.");
  }

  createRoot(rootElement).render(<App />);
}

bootstrap().catch((error) => {
  if (reloadForRuntimeRecovery()) return;

  console.error("App bootstrap failed.", error);
  renderBootstrapFallback(normalizeRuntimeErrorMessage(error));
});
