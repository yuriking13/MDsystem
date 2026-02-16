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
      </Routes>
    </MemoryRouter>,
  );
}

describe("documentation functional coverage contract", () => {
  it("keeps required top-level sections available in docs menu", () => {
    renderDocumentationPage();

    const expectedSections = [
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

    const sectionButtons = screen.getAllByRole("button", {
      name: new RegExp(expectedSections.join("|")),
    });

    expect(sectionButtons).toHaveLength(expectedSections.length);
    for (const sectionTitle of expectedSections) {
      expect(
        screen.getByRole("button", { name: sectionTitle }),
      ).toBeInTheDocument();
    }
  });

  it("keeps required feature topics documented for core project workflows", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const contracts: Array<{
      section: string;
      topic: string;
      expectedText: string;
    }> = [
      {
        section: "Файлы",
        topic: "Анализ файлов и импорт в статьи",
        expectedText:
          "Из загруженных документов можно извлекать библиографические данные и сразу добавлять их в базу статей.",
      },
      {
        section: "Статистика",
        topic: "Вставка в документы",
        expectedText:
          "Таблицы и графики вставляются в текст через кнопку «Статистика» в редакторе.",
      },
      {
        section: "Граф цитирований",
        topic: "AI-поиск и семантические функции",
        expectedText:
          "В графе доступны AI-поиск похожих работ, семантические кластеры и поиск пробелов в литературе.",
      },
      {
        section: "Команда",
        topic: "Роли и права",
        expectedText:
          "Выдавайте доступ строго под задачу участника, чтобы избежать случайных правок.",
      },
      {
        section: "Настройки проекта",
        topic: "Протокол и проверки качества",
        expectedText:
          "Вы можете включить методологические проверки по выбранному протоколу.",
      },
      {
        section: "API ключи",
        topic: "Какие провайдеры доступны",
        expectedText:
          "В настройках аккаунта/проекта можно хранить ключи нескольких источников.",
      },
    ];

    for (const { section, topic, expectedText } of contracts) {
      await user.click(screen.getByRole("button", { name: section }));
      await user.click(screen.getByRole("tab", { name: topic }));

      expect(
        screen.getByRole("heading", { level: 3, name: topic }),
      ).toBeInTheDocument();
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    }
  });
});
