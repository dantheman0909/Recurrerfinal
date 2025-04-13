import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add Google Fonts import for Manrope font family
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap";
document.head.appendChild(link);

// Add title
const title = document.createElement("title");
title.textContent = "Recurrer: Customer Success OS";
document.head.appendChild(title);

// Add favicon
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔄</text></svg>";
document.head.appendChild(favicon);

createRoot(document.getElementById("root")!).render(<App />);
