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

  it("keeps each docs section with multi-topic submenu and explanatory summary", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const sections = [
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

    for (const section of sections) {
      await user.click(screen.getByRole("button", { name: section }));
      expect(
        screen.getByRole("heading", { level: 2, name: section }),
      ).toBeInTheDocument();

      const tabs = screen.getAllByRole("tab");
      expect(tabs.length).toBeGreaterThanOrEqual(3);
      expect(
        tabs.some((tab) => tab.getAttribute("aria-selected") === "true"),
      ).toBe(true);

      const summary = document.querySelector(".docs-topic-summary");
      expect(summary?.textContent?.trim().length ?? 0).toBeGreaterThan(20);
    }
  });

  it("keeps submenu tablist and topic panel semantics wired for each section", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const sections = [
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

    for (const section of sections) {
      await user.click(screen.getByRole("button", { name: section }));

      const tablist = screen.getByRole("tablist");
      expect(tablist).toHaveAttribute("aria-orientation", "vertical");

      const activeTab = screen
        .getAllByRole("tab")
        .find((tab) => tab.getAttribute("aria-selected") === "true");
      expect(activeTab).toBeDefined();

      const panel = screen.getByRole("tabpanel");
      expect(panel).toHaveAttribute("aria-labelledby", activeTab?.id);
      expect(panel).toHaveAttribute(
        "id",
        activeTab?.getAttribute("aria-controls") ?? "",
      );
    }
  });

  it("keeps settings guidance for protocols, checks, and bibliography styles", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Настройки проекта" }));
    await user.click(
      screen.getByRole("tab", { name: "Протокол и проверки качества" }),
    );

    expect(
      screen.getByText(
        "Протоколы: CARE, STROBE, CONSORT, PRISMA и другие (по доступности).",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI-проверки помогают увидеть пропущенные разделы, риски ошибок I/II рода и слабые места дизайна.",
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("tab", {
        name: "Библиографический стиль и формат вывода",
      }),
    );

    expect(
      screen.getByText("Поддерживаются стили: ГОСТ, APA, Vancouver."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Если журнал требует другой стиль, переключите его до финального экспорта.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps every submenu topic with actionable content depth", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const sections = [
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

    for (const section of sections) {
      await user.click(screen.getByRole("button", { name: section }));

      const topicNames = screen
        .getAllByRole("tab")
        .map((tab) => tab.textContent?.trim())
        .filter((name): name is string => Boolean(name));

      expect(topicNames.length).toBeGreaterThanOrEqual(3);

      for (const topicName of topicNames) {
        await user.click(screen.getByRole("tab", { name: topicName }));

        expect(
          screen.getByRole("heading", { level: 3, name: topicName }),
        ).toBeInTheDocument();

        const summary = document.querySelector(".docs-topic-summary");
        expect(summary?.textContent?.trim().length ?? 0).toBeGreaterThan(20);

        const topicContent = document.querySelector(".docs-topic-content");
        expect(topicContent?.textContent?.trim().length ?? 0).toBeGreaterThan(
          80,
        );

        const listItems = topicContent?.querySelectorAll("li") ?? [];
        expect(listItems.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
