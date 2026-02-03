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

console.log("🚀 MDsystem загружается...");
console.log("📦 React версия:", React.version);
console.log("🎨 CSS импортирован из:", "./styles/index.css");

const rootElement = document.getElementById("root");
console.log("📍 Root элемент найден:", !!rootElement);

if (!rootElement) {
  console.error("❌ ОШИБКА: Root элемент не найден!");
  throw new Error("Root element not found");
}

try {
  console.log("🔄 Создание React root...");
  const root = ReactDOM.createRoot(rootElement);

  console.log("✅ React root создан успешно");
  console.log("🎬 Рендеринг приложения...");

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

  console.log("✅ Приложение отрендерено успешно");
} catch (error) {
  console.error("❌ КРИТИЧЕСКАЯ ОШИБКА при рендеринге:", error);
  throw error;
}
