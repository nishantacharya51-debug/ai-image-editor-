import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { BRAND } from "./lib/config";
import { prepareAuthCallback } from "./auth/callback";
prepareAuthCallback();
document.title = `${BRAND.full} — Your vision. Refined.`;
createRoot(document.getElementById("root")!).render(<App />);
