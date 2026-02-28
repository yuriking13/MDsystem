import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { AdminAuthProvider } from "./lib/AdminContext";
import { initFrontendObservability } from "./lib/observability";
import "./styles/index.css";
import "./styles/landing-animations.css";
// admin.css is now imported in AdminLayout (lazy loaded)
// flowbite is initialized lazily after DOM is ready
import "flowbite";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

initFrontendObservability();

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <App />
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
