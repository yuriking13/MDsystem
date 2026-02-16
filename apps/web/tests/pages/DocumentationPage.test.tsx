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
});
