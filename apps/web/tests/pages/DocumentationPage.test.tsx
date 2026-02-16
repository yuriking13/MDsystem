import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import DocumentationPage from "../../src/pages/DocumentationPage";

function renderDocumentationPage() {
  return render(
    <MemoryRouter
      initialEntries={["/docs"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/projects" element={<div>Projects route</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("DocumentationPage menu + submenu", () => {
  it("renders all major documentation sections in sidebar menu", () => {
    renderDocumentationPage();

    const sectionTitles = [
      "Обзор платформы",
      "База статей",
      "Документы",
      "Файлы",
      "Статистика",
      "Граф цитирований",
      "Команда",
      "Настройки проекта",
      "API ключи",
    ];

    for (const title of sectionTitles) {
      expect(screen.getByRole("button", { name: title })).toBeInTheDocument();
    }
  });

  it("renders default overview section and first subtopic", () => {
    renderDocumentationPage();

    expect(screen.getByText("Документация")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Обзор платформы" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Основной сценарий работы",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Если вы используете платформу впервые, начните с этого порядка действий.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Обзор платформы" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("switches section and updates submenu/content", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "База статей" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "База статей" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Поиск и фильтры" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Запрос:")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Поиск и фильтры" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("allows selecting submenu items inside a section", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "База статей" }));
    await user.click(
      screen.getByRole("tab", { name: "AI и автоматическое обогащение" }),
    );

    expect(
      screen.getByText(
        "Платформа может автоматически переводить и улучшать метаданные статей.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Crossref/метаданные:")).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "AI и автоматическое обогащение" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("resets submenu to first topic when switching sections", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "База статей" }));
    await user.click(
      screen.getByRole("tab", { name: "AI и автоматическое обогащение" }),
    );
    expect(
      screen.getByRole("tab", { name: "AI и автоматическое обогащение" }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "Документы" }));

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Создание структуры работы",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Создание структуры работы" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("tab", { name: "Экспорт и библиография" }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("keeps first submenu topic active for every section after section switch", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const sectionToFirstTopic: Record<string, string> = {
      "Обзор платформы": "Основной сценарий работы",
      "База статей": "Поиск и фильтры",
      Документы: "Создание структуры работы",
      Файлы: "Загрузка и организация",
      Статистика: "Создание таблиц и графиков",
      "Граф цитирований": "Построение графа и глубина",
      Команда: "Роли и права",
      "Настройки проекта": "Тип и подтип исследования",
      "API ключи": "Какие провайдеры доступны",
    };

    for (const [sectionTitle, firstTopicTitle] of Object.entries(
      sectionToFirstTopic,
    )) {
      await user.click(screen.getByRole("button", { name: sectionTitle }));

      expect(
        screen.getByRole("heading", { level: 2, name: sectionTitle }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: firstTopicTitle }),
      ).toHaveAttribute("aria-selected", "true");
    }
  });

  it("documents all API providers and OpenRouter setup steps", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "API ключи" }));

    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Какие провайдеры доступны",
      }),
    ).toBeInTheDocument();

    const providers = ["PubMed:", "DOAJ:", "Wiley:", "OpenRouter:"];
    for (const provider of providers) {
      expect(screen.getByText(provider)).toBeInTheDocument();
    }

    await user.click(screen.getByRole("tab", { name: "Настройка OpenRouter" }));
    expect(screen.getByRole("link", { name: "openrouter.ai" })).toHaveAttribute(
      "href",
      "https://openrouter.ai",
    );
    expect(
      screen.getByText(
        "Проверьте работу: например, запустите перевод аннотации статьи.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps submenu depth comprehensive for each top-level section", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const sectionTitles = [
      "Обзор платформы",
      "База статей",
      "Документы",
      "Файлы",
      "Статистика",
      "Граф цитирований",
      "Команда",
      "Настройки проекта",
      "API ключи",
    ];

    for (const sectionTitle of sectionTitles) {
      await user.click(screen.getByRole("button", { name: sectionTitle }));
      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThanOrEqual(3);
      expect(
        tabs.some((tab) => tab.getAttribute("aria-selected") === "true"),
      ).toBe(true);
    }
  });

  it("navigates back to projects route from docs header action", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("link", { name: "← К проектам" }));

    expect(screen.getByText("Projects route")).toBeInTheDocument();
  });

  it("connects active submenu tab with topic panel semantics", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Граф цитирований" }));
    await user.click(screen.getByRole("tab", { name: "Работа с узлами" }));

    const activeTab = screen.getByRole("tab", { name: "Работа с узлами" });
    const panel = screen.getByRole("tabpanel");
    const controlsId = activeTab.getAttribute("aria-controls");

    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(controlsId).toBeTruthy();
    expect(panel).toHaveAttribute("id", controlsId);
    expect(panel).toHaveAttribute("aria-labelledby", activeTab.id);
  });
});
