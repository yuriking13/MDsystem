import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/AuthContext";
import { AdminAuthProvider } from "./lib/AdminContext";
import "./styles/index.css";
import "./styles/admin.css";
import "flowbite";
import "./debug-css"; // Диагностика CSS

console.log("MDsystem is loading...");
console.log("React version:", React.version);
console.log("CSS imported from: ./styles/index.css");

const rootElement = document.getElementById("root");
console.log("Root element found:", !!rootElement);

if (!rootElement) {
  console.error("ERROR: Root element not found!");
  throw new Error("Root element not found");
}

try {
  console.log("Creating React root...");
  const root = ReactDOM.createRoot(rootElement);

  console.log("React root created successfully");
  console.log("Rendering app...");

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

  console.log("App rendered successfully");

  // Дополнительная проверка
  setTimeout(() => {
    console.log("Post-render check:");
    console.log(`  Root children: ${rootElement.children.length}`);
    console.log(`  Root innerHTML length: ${rootElement.innerHTML.length}`);
    if (rootElement.children.length === 0) {
      console.error("  ERROR: Root is still empty after render!");
    }
  }, 100);
} catch (error) {
  console.error("CRITICAL ERROR during rendering:", error);
  throw error;
}
