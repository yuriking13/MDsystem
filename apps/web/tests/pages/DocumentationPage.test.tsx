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
      expect(screen.getByRole("button", { name: title })).toHaveAttribute(
        "type",
        "button",
      );
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
    expect(activeTab).toHaveAttribute("type", "button");
    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(controlsId).toBeTruthy();
    expect(panel).toHaveAttribute("id", controlsId);
    expect(panel).toHaveAttribute("aria-labelledby", activeTab.id);
  });

  it("supports keyboard navigation between submenu topics", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Настройки проекта" }));

    const firstTab = screen.getByRole("tab", {
      name: "Тип и подтип исследования",
    });
    firstTab.focus();
    expect(firstTab).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    const secondTab = screen.getByRole("tab", {
      name: "Протокол и проверки качества",
    });
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab).toHaveFocus();

    await user.keyboard("{End}");
    const lastTab = screen.getByRole("tab", {
      name: "Библиографический стиль и формат вывода",
    });
    expect(lastTab).toHaveAttribute("aria-selected", "true");
    expect(lastTab).toHaveFocus();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Библиографический стиль и формат вывода",
      }),
    ).toBeInTheDocument();

    await user.keyboard("{Home}");
    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstTab).toHaveFocus();
  });

  it("updates section aria-current and roving tabIndex after topic change", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const overviewSection = screen.getByRole("button", {
      name: "Обзор платформы",
    });
    const filesSection = screen.getByRole("button", { name: "Файлы" });

    expect(overviewSection).toHaveAttribute("aria-current", "page");
    expect(filesSection).not.toHaveAttribute("aria-current");

    await user.click(filesSection);

    expect(filesSection).toHaveAttribute("aria-current", "page");
    expect(overviewSection).not.toHaveAttribute("aria-current");

    const activeTab = screen.getByRole("tab", {
      name: "Загрузка и организация",
    });
    const inactiveTab = screen.getByRole("tab", {
      name: "Анализ файлов и импорт в статьи",
    });

    expect(activeTab).toHaveAttribute("tabindex", "0");
    expect(inactiveTab).toHaveAttribute("tabindex", "-1");

    activeTab.focus();
    expect(activeTab).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(activeTab).toHaveAttribute("tabindex", "-1");
    expect(inactiveTab).toHaveAttribute("tabindex", "0");
  });

  it("wraps keyboard navigation at submenu boundaries", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "API ключи" }));

    const firstTab = screen.getByRole("tab", {
      name: "Какие провайдеры доступны",
    });
    const lastTab = screen.getByRole("tab", {
      name: "Безопасность и типовые ошибки",
    });

    firstTab.focus();
    await user.keyboard("{ArrowUp}");
    expect(lastTab).toHaveAttribute("aria-selected", "true");
    expect(lastTab).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstTab).toHaveFocus();
  });

  it("supports horizontal arrow keys for submenu navigation parity", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Команда" }));

    const firstTab = screen.getByRole("tab", { name: "Роли и права" });
    const secondTab = screen.getByRole("tab", {
      name: "Приглашение участников",
    });
    const lastTab = screen.getByRole("tab", {
      name: "Синхронизация в реальном времени",
    });

    firstTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(secondTab).toHaveAttribute("aria-selected", "true");
    expect(secondTab).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstTab).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(lastTab).toHaveAttribute("aria-selected", "true");
    expect(lastTab).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(firstTab).toHaveFocus();
  });

  it("does not retain stale keyboard focus target after section switch", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Настройки проекта" }));

    const firstSettingsTab = screen.getByRole("tab", {
      name: "Тип и подтип исследования",
    });
    firstSettingsTab.focus();
    await user.keyboard("{ArrowDown}");

    const apiSection = screen.getByRole("button", { name: "API ключи" });
    await user.click(apiSection);

    expect(apiSection).toHaveFocus();
    expect(
      screen.getByRole("tab", { name: "Какие провайдеры доступны" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { level: 2, name: "API ключи" }),
    ).toBeInTheDocument();
  });

  it("keeps manual tab click priority after keyboard navigation sequence", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    await user.click(screen.getByRole("button", { name: "Настройки проекта" }));

    const firstTab = screen.getByRole("tab", {
      name: "Тип и подтип исследования",
    });
    const secondTab = screen.getByRole("tab", {
      name: "Протокол и проверки качества",
    });
    const thirdTab = screen.getByRole("tab", {
      name: "Библиографический стиль и формат вывода",
    });

    firstTab.focus();
    await user.keyboard("{ArrowDown}");
    expect(secondTab).toHaveAttribute("aria-selected", "true");

    await user.click(thirdTab);
    expect(thirdTab).toHaveAttribute("aria-selected", "true");
    expect(thirdTab).toHaveFocus();
    expect(secondTab).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: "Библиографический стиль и формат вывода",
      }),
    ).toBeInTheDocument();
  });

  it("keeps exactly one active submenu tab after section/topic switches", async () => {
    const user = userEvent.setup();
    renderDocumentationPage();

    const checkSingleActiveTab = () => {
      const tabs = screen.getAllByRole("tab");
      const activeTabs = tabs.filter(
        (tab) => tab.getAttribute("aria-selected") === "true",
      );
      expect(activeTabs).toHaveLength(1);

      for (const tab of tabs) {
        const isActive = tab === activeTabs[0];
        expect(tab).toHaveAttribute("tabindex", isActive ? "0" : "-1");
      }
    };

    checkSingleActiveTab();

    await user.click(screen.getByRole("button", { name: "База статей" }));
    checkSingleActiveTab();

    await user.click(
      screen.getByRole("tab", { name: "AI и автоматическое обогащение" }),
    );
    checkSingleActiveTab();

    await user.click(screen.getByRole("button", { name: "API ключи" }));
    checkSingleActiveTab();

    await user.click(
      screen.getByRole("tab", { name: "Безопасность и типовые ошибки" }),
    );
    checkSingleActiveTab();
  });

  it("keeps unique and paired tab/panel ids across every docs section", async () => {
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
      const tabIds = tabs.map((tab) => tab.id);
      const controlsIds = tabs.map((tab) => tab.getAttribute("aria-controls"));
      const uniqueTabIds = new Set(tabIds);
      const uniqueControlsIds = new Set(controlsIds);

      expect(uniqueTabIds.size).toBe(tabIds.length);
      expect(uniqueControlsIds.size).toBe(controlsIds.length);

      for (const tab of tabs) {
        const controlsId = tab.getAttribute("aria-controls");
        expect(controlsId).toBeTruthy();
        expect(controlsId).toBe(
          `docs-panel-${tab.id.replace("docs-tab-", "")}`,
        );
      }

      const activeTab = tabs.find(
        (tab) => tab.getAttribute("aria-selected") === "true",
      );
      expect(activeTab).toBeDefined();

      const panel = screen.getByRole("tabpanel");
      expect(panel).toHaveAttribute(
        "id",
        activeTab?.getAttribute("aria-controls"),
      );
      expect(panel).toHaveAttribute("aria-labelledby", activeTab?.id);
    }
  });

  it("keeps exactly one section marked with aria-current", async () => {
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

    const assertSingleCurrentSection = () => {
      const sectionButtons = sectionTitles.map((title) =>
        screen.getByRole("button", { name: title }),
      );
      const currentButtons = sectionButtons.filter(
        (button) => button.getAttribute("aria-current") === "page",
      );
      expect(currentButtons).toHaveLength(1);
    };

    assertSingleCurrentSection();

    for (const sectionTitle of sectionTitles.slice(1)) {
      await user.click(screen.getByRole("button", { name: sectionTitle }));
      assertSingleCurrentSection();
    }
  });

  it("keeps globally unique topic tab/panel ids across all sections", async () => {
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

    const seenTabIds = new Set<string>();
    const seenPanelIds = new Set<string>();

    for (const sectionTitle of sectionTitles) {
      await user.click(screen.getByRole("button", { name: sectionTitle }));

      const tabs = screen.getAllByRole("tab");
      for (const tab of tabs) {
        const tabId = tab.id;
        const panelId = tab.getAttribute("aria-controls");

        expect(tabId).toMatch(/^docs-tab-/);
        expect(panelId).toMatch(/^docs-panel-/);
        expect(seenTabIds.has(tabId)).toBe(false);
        expect(seenPanelIds.has(panelId ?? "")).toBe(false);

        seenTabIds.add(tabId);
        if (panelId) seenPanelIds.add(panelId);
      }
    }

    expect(seenTabIds.size).toBeGreaterThanOrEqual(25);
    expect(seenPanelIds.size).toBe(seenTabIds.size);
  });

  it("updates section intro text for every selected documentation section", async () => {
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

    const intros = new Set<string>();
    for (const sectionTitle of sectionTitles) {
      await user.click(screen.getByRole("button", { name: sectionTitle }));
      const intro = document.querySelector(".doc-intro");
      const introText = intro?.textContent?.trim() ?? "";
      expect(introText.length).toBeGreaterThan(20);
      intros.add(introText);
    }

    expect(intros.size).toBe(sectionTitles.length);
  });
});
