import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// --- LES IMPORTS MAGIQUES DE BOOTSTRAP ---
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import "./index.css"; // (Assure-toi d'avoir vidé ce fichier comme vu juste avant !)
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
