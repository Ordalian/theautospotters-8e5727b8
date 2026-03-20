import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Minimum splash display time (ms) so the GIF is visible even on fast connections
const MIN_SPLASH_MS = 4400;
const splashStart = Date.now();

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide splash once React has painted + minimum time elapsed
requestAnimationFrame(() => {
  const elapsed = Date.now() - splashStart;
  const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.style.opacity = "0";
      splash.addEventListener("transitionend", () => splash.remove());
    }
  }, remaining);
});
