import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { BRAND } from "./lib/config";
document.title = `${BRAND.full} — Your vision. Refined.`;
createRoot(document.getElementById("root")!).render(<App />);
