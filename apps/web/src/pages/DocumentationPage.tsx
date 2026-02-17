import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconArchive,
  IconBookOpen,
  IconChartBar,
  IconChevronDown,
  IconDocumentText,
  IconFolderOpen,
  IconKey,
  IconSettings,
  IconShare,
  IconUsers,
} from "../components/FlowbiteIcons";

type DocSectionId =
  | "overview"
  | "articles"
  | "documents"
  | "files"
  | "statistics"
  | "graph"
  | "team"
  | "settings"
  | "api-keys";

type DocTopic = {
  id: string;
  title: string;
  summary: string;
  content: React.ReactNode;
};

type DocSection = {
  id: DocSectionId;
  title: string;
  description: string;
  icon: React.ReactNode;
  topics: DocTopic[];
};

function DocIcon({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Обзор платформы",
    description:
      "Коротко о том, как устроена работа в системе: от создания проекта до готового отчёта.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "overview-workflow",
        title: "Основной сценарий работы",
        summary:
          "Если вы используете платформу впервые, начните с этого порядка действий.",
        content: (
          <ol className="docs-list docs-list--ordered">
            <li>Создайте проект и задайте его тему.</li>
            <li>Соберите статьи в разделе «База статей».</li>
            <li>Отберите релевантные публикации в «Отобранные».</li>
            <li>Напишите главы в разделе «Документы».</li>
            <li>Добавьте таблицы/графики из раздела «Статистика».</li>
            <li>Проверьте связи через «Граф цитирований».</li>
            <li>Экспортируйте результат в Word/PDF.</li>
          </ol>
        ),
      },
      {
        id: "overview-sections",
        title: "Что делает каждый раздел",
        summary:
          "Быстрое объяснение всех вкладок, чтобы вы сразу понимали, где выполнять нужную задачу.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>База статей:</strong> поиск, фильтрация, перевод и отбор
              литературы.
            </li>
            <li>
              <strong>Документы:</strong> написание текста, цитаты, структура
              глав.
            </li>
            <li>
              <strong>Файлы:</strong> хранение PDF, изображений и других
              материалов.
            </li>
            <li>
              <strong>Статистика:</strong> таблицы и графики для вставки в
              документы.
            </li>
            <li>
              <strong>Граф цитирований:</strong> поиск связей и дополнительных
              публикаций.
            </li>
            <li>
              <strong>Настройки:</strong> команда, роли, тип исследования,
              библиография, AI-функции.
            </li>
          </ul>
        ),
      },
      {
        id: "overview-best-practice",
        title: "Практические советы",
        summary:
          "Рекомендации, которые помогают не потерять данные и быстрее получить результат.",
        content: (
          <ul className="docs-list">
            <li>
              Сначала создавайте «Кандидатов», а в «Отобранные» переносите
              только проверенные статьи.
            </li>
            <li>
              Добавляйте в проект ключевые файлы (протокол, таблицы, скриншоты)
              сразу, а не в конце работы.
            </li>
            <li>
              Используйте единый стиль библиографии с самого начала проекта.
            </li>
            <li>
              Перед экспортом откройте граф и проверьте, нет ли важных статей,
              которые вы пропустили.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "articles",
    title: "База статей",
    description:
      "Главный рабочий раздел для поиска, отбора и анализа научных публикаций.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "articles-search",
        title: "Поиск и фильтры",
        summary:
          "Вы можете искать статьи в нескольких источниках и сразу ограничивать результаты по нужным условиям.",
        content: (
          <>
            <ul className="docs-list">
              <li>
                <strong>Запрос:</strong> ключевые слова, фразы, логика AND/OR.
              </li>
              <li>
                <strong>Источники:</strong> PubMed, DOAJ, Wiley.
              </li>
              <li>
                <strong>Период:</strong> предустановки или свой диапазон лет.
              </li>
              <li>
                <strong>Тип публикации:</strong> РКИ, обзор, мета-анализ и др.
              </li>
              <li>
                <strong>Объём выдачи:</strong> от 10 до всех найденных.
              </li>
            </ul>
            <p className="docs-inline-note">
              Для серии похожих запросов используйте мультипоиск — это экономит
              время и даёт более полное покрытие темы.
            </p>
          </>
        ),
      },
      {
        id: "articles-statuses",
        title: "Статусы и массовые действия",
        summary:
          "Статусы помогают быстро разделить полезные и неполезные статьи без потери истории.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>Кандидаты:</strong> новые или сомнительные публикации для
              проверки.
            </li>
            <li>
              <strong>Отобранные:</strong> финальные статьи для написания
              работы.
            </li>
            <li>
              <strong>Исключённые:</strong> нерелевантные записи (с причиной
              исключения).
            </li>
            <li>
              <strong>Корзина:</strong> временно удалённые материалы с
              возможностью восстановить.
            </li>
            <li>
              <strong>Групповые операции:</strong> перенос между статусами,
              удаление, AI-обработка выделенного списка.
            </li>
          </ul>
        ),
      },
      {
        id: "articles-ai",
        title: "AI и автоматическое обогащение",
        summary:
          "Платформа может автоматически переводить и улучшать метаданные статей.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>Перевод:</strong> заголовки и аннотации на русский язык.
            </li>
            <li>
              <strong>Crossref/метаданные:</strong> DOI, журнал, цитируемость и
              другие поля.
            </li>
            <li>
              <strong>Статистические индикаторы:</strong> обнаружение p-value и
              связанных показателей.
            </li>
            <li>
              <strong>Подсветка важного:</strong> визуальное выделение статей с
              сильными статистическими результатами.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "documents",
    title: "Документы",
    description:
      "Раздел для написания текста работы, цитирования и итогового экспорта.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "documents-create",
        title: "Создание структуры работы",
        summary:
          "Документы можно использовать как главы: введение, методы, результаты и т.д.",
        content: (
          <ul className="docs-list">
            <li>Создавайте отдельные документы под каждую часть работы.</li>
            <li>Меняйте порядок документов — это влияет на общий экспорт.</li>
            <li>
              Давайте понятные названия (например: «1. Введение», «2. Методы»).
            </li>
          </ul>
        ),
      },
      {
        id: "documents-editor",
        title: "Редактор, цитаты и ссылки",
        summary:
          "Редактор поддерживает научный формат: заголовки, таблицы, ссылки, цитирование.",
        content: (
          <ul className="docs-list">
            <li>
              Базовое форматирование: заголовки, списки, таблицы, выделения.
            </li>
            <li>
              Вставка цитаты по кнопке «Цитата» из списка отобранных статей.
            </li>
            <li>
              Автоматическая нумерация ссылок вида <strong>[1], [2]</strong>.
            </li>
            <li>
              При удалении цитаты нумерация пересчитывается автоматически.
            </li>
          </ul>
        ),
      },
      {
        id: "documents-export",
        title: "Экспорт и библиография",
        summary:
          "Вы можете экспортировать как отдельные главы, так и целую работу одним файлом.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>Word по главам:</strong> выбираете только нужные
              документы.
            </li>
            <li>
              <strong>Word общий:</strong> все документы в одном файле.
            </li>
            <li>
              <strong>PDF:</strong> печатная версия через браузер.
            </li>
            <li>
              Библиография формируется автоматически на основании фактических
              цитирований в тексте.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "files",
    title: "Файлы",
    description:
      "Хранилище материалов проекта: статьи в PDF, изображения, таблицы и вспомогательные документы.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "files-upload",
        title: "Загрузка и организация",
        summary:
          "Файлы можно загружать вручную, фильтровать по категориям и быстро находить в списке.",
        content: (
          <ul className="docs-list">
            <li>
              Поддерживаются популярные форматы: PDF, DOCX, XLSX, изображения,
              аудио/видео.
            </li>
            <li>
              Для порядка назначайте категории и используйте фильтр по
              категории.
            </li>
            <li>
              В карточке файла доступны действия: предпросмотр, скачивание,
              удаление.
            </li>
          </ul>
        ),
      },
      {
        id: "files-analyze",
        title: "Анализ файлов и импорт в статьи",
        summary:
          "Из загруженных документов можно извлекать библиографические данные и сразу добавлять их в базу статей.",
        content: (
          <ul className="docs-list">
            <li>
              Команда «Анализ» извлекает заголовок, DOI/PMID и другие метаданные
              из PDF/документа.
            </li>
            <li>
              После анализа можно импортировать найденные материалы в
              «Кандидаты» или «Отобранные».
            </li>
            <li>
              Это удобно, если у вас уже есть локальная подборка литературы.
            </li>
          </ul>
        ),
      },
      {
        id: "files-documents",
        title: "Использование файлов в тексте",
        summary:
          "Изображения и другие материалы можно вставлять в документы проекта.",
        content: (
          <ul className="docs-list">
            <li>
              В редакторе документа используйте вставку файла из библиотеки
              проекта.
            </li>
            <li>
              Для рисунков автоматически формируется подпись (например, «Рисунок
              1»).
            </li>
            <li>
              При необходимости сначала откройте файл в предпросмотре и
              проверьте качество перед вставкой.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "statistics",
    title: "Статистика",
    description:
      "Инструменты для создания таблиц и графиков, которые можно вставлять прямо в научный текст.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "statistics-create",
        title: "Создание таблиц и графиков",
        summary:
          "Можно создавать статистику с нуля или быстро запускать типовые шаблоны.",
        content: (
          <ul className="docs-list">
            <li>Создайте запись статистики и заполните таблицу данных.</li>
            <li>
              Выберите формат визуализации: bar, line, scatter, pie, boxplot и
              другие.
            </li>
            <li>Настройте подписи, легенду, цвета и отображаемые колонки.</li>
          </ul>
        ),
      },
      {
        id: "statistics-manage",
        title: "Управление и поддержка актуальности",
        summary:
          "Раздел позволяет редактировать, копировать и удалять статистические блоки, не ломая документ.",
        content: (
          <ul className="docs-list">
            <li>
              Любую таблицу/график можно открыть снова и обновить без создания с
              нуля.
            </li>
            <li>
              Доступны быстрые действия: дублирование, удаление, очистка
              временных данных.
            </li>
            <li>
              Проверяйте, к каким документам привязан график, чтобы не удалить
              нужный элемент.
            </li>
          </ul>
        ),
      },
      {
        id: "statistics-insert",
        title: "Вставка в документы",
        summary:
          "Таблицы и графики вставляются в текст через кнопку «Статистика» в редакторе.",
        content: (
          <ul className="docs-list">
            <li>
              В Word-экспорте таблицы сохраняются как таблицы, а графики
              вставляются как изображения.
            </li>
            <li>
              При обновлении исходной статистики рекомендуется обновить вставку
              в документе.
            </li>
            <li>
              Используйте понятные заголовки графиков — это важно для финальной
              публикации.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "graph",
    title: "Граф цитирований",
    description:
      "Визуальный инструмент для поиска новых статей через связи цитирования и AI-подсказки.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "graph-build",
        title: "Построение графа и глубина",
        summary:
          "Граф строится на основе ваших статей и цепочек их цитирований.",
        content: (
          <ul className="docs-list">
            <li>
              Запустите загрузку связей — система соберёт references и citing
              статьи.
            </li>
            <li>
              Переключайте глубину, чтобы видеть только ближайшие или более
              дальние связи.
            </li>
            <li>
              Используйте фильтры по статусу, источнику, году и другим
              параметрам.
            </li>
          </ul>
        ),
      },
      {
        id: "graph-nodes",
        title: "Работа с узлами",
        summary:
          "Каждый узел — это статья. По клику открывается карточка с действиями.",
        content: (
          <ul className="docs-list">
            <li>
              Из карточки можно добавить статью в «Кандидаты» или «Отобранные».
            </li>
            <li>Доступны DOI/PMID-ссылки для быстрого перехода к оригиналу.</li>
            <li>
              В легенде отображаются типы узлов (в проекте, ссылки, цитирующие,
              исключённые и т.д.).
            </li>
          </ul>
        ),
      },
      {
        id: "graph-ai",
        title: "AI-поиск и семантические функции",
        summary:
          "В графе доступны AI-поиск похожих работ, семантические кластеры и поиск пробелов в литературе.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>AI Assistant:</strong> запрос естественным языком и
              рекомендации статей.
            </li>
            <li>
              <strong>Семантические кластеры:</strong> группировка статей по
              смыслу, а не только по ссылкам.
            </li>
            <li>
              <strong>Gap analysis:</strong> поиск перспективных, но
              недооценённых направлений.
            </li>
            <li>
              Кнопка «+ Добавить все» для статей с p-value ускоряет отбор.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "team",
    title: "Команда",
    description:
      "Совместная работа: приглашения, роли, контроль доступа и синхронизация изменений.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "team-roles",
        title: "Роли и права",
        summary:
          "Выдавайте доступ строго под задачу участника, чтобы избежать случайных правок.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>Owner:</strong> полный контроль проекта и участников.
            </li>
            <li>
              <strong>Editor:</strong> рабочий доступ к статьям, документам,
              графу и статистике.
            </li>
            <li>
              <strong>Viewer:</strong> только просмотр без редактирования.
            </li>
          </ul>
        ),
      },
      {
        id: "team-invite",
        title: "Приглашение участников",
        summary: "Добавляйте коллег по email и сразу выбирайте им роль.",
        content: (
          <ol className="docs-list docs-list--ordered">
            <li>Откройте настройки проекта → блок команды.</li>
            <li>Введите email участника.</li>
            <li>Выберите роль (Owner/Editor/Viewer).</li>
            <li>Подтвердите приглашение.</li>
          </ol>
        ),
      },
      {
        id: "team-live",
        title: "Синхронизация в реальном времени",
        summary:
          "Изменения коллег приходят автоматически, поэтому команда работает как в одном общем рабочем пространстве.",
        content: (
          <ul className="docs-list">
            <li>Индикатор Live показывает, что синхронизация активна.</li>
            <li>
              При потере соединения изменения сохраняются локально и
              синхронизируются после восстановления.
            </li>
            <li>
              Для важных разделов используйте договорённость по ответственным
              редакторам.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "settings",
    title: "Настройки проекта",
    description:
      "Параметры исследования, стиль библиографии и AI-проверки качества.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "settings-research",
        title: "Тип и подтип исследования",
        summary:
          "Эти параметры влияют на рекомендации, подсказки AI и структуру проверки работы.",
        content: (
          <ul className="docs-list">
            <li>
              Выберите тип: наблюдательное, экспериментальное, обзорное и др.
            </li>
            <li>
              Уточните подтип для большей точности (например, когортное, РКИ).
            </li>
            <li>
              При смене дизайна исследования обновите параметр, чтобы AI не
              давал нерелевантные подсказки.
            </li>
          </ul>
        ),
      },
      {
        id: "settings-protocol",
        title: "Протокол и проверки качества",
        summary:
          "Вы можете включить методологические проверки по выбранному протоколу.",
        content: (
          <ul className="docs-list">
            <li>
              Протоколы: CARE, STROBE, CONSORT, PRISMA и другие (по
              доступности).
            </li>
            <li>
              AI-проверки помогают увидеть пропущенные разделы, риски ошибок
              I/II рода и слабые места дизайна.
            </li>
            <li>
              Используйте проверки как помощника, но финальное решение
              оставляйте за исследователем.
            </li>
          </ul>
        ),
      },
      {
        id: "settings-style",
        title: "Библиографический стиль и формат вывода",
        summary:
          "Один проект = один базовый стиль ссылок, чтобы избежать хаоса в финальном документе.",
        content: (
          <ul className="docs-list">
            <li>Поддерживаются стили: ГОСТ, APA, Vancouver.</li>
            <li>
              Стиль влияет на отображение ссылок и итогового списка литературы.
            </li>
            <li>
              Если журнал требует другой стиль, переключите его до финального
              экспорта.
            </li>
          </ul>
        ),
      },
    ],
  },
  {
    id: "api-keys",
    title: "API ключи",
    description:
      "Подключение внешних сервисов для поиска, анализа и AI-функций платформы.",
    icon: (
      <DocIcon>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818"
        />
      </DocIcon>
    ),
    topics: [
      {
        id: "api-providers",
        title: "Какие провайдеры доступны",
        summary:
          "В настройках аккаунта/проекта можно хранить ключи нескольких источников.",
        content: (
          <ul className="docs-list">
            <li>
              <strong>PubMed:</strong> расширение лимитов/инструментов поиска.
            </li>
            <li>
              <strong>DOAJ:</strong> доступ к открытым журналам.
            </li>
            <li>
              <strong>Wiley:</strong> доступ к публикациям издательства Wiley.
            </li>
            <li>
              <strong>OpenRouter:</strong> AI-функции (перевод, помощники,
              семантический анализ).
            </li>
          </ul>
        ),
      },
      {
        id: "api-openrouter",
        title: "Настройка OpenRouter",
        summary:
          "OpenRouter нужен для большинства интеллектуальных функций платформы.",
        content: (
          <ol className="docs-list docs-list--ordered">
            <li>
              Зарегистрируйтесь на{" "}
              <a
                href="https://openrouter.ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                openrouter.ai
              </a>
              .
            </li>
            <li>Создайте API ключ в личном кабинете.</li>
            <li>Вставьте ключ в разделе API ключей и сохраните настройки.</li>
            <li>
              Проверьте работу: например, запустите перевод аннотации статьи.
            </li>
          </ol>
        ),
      },
      {
        id: "api-security",
        title: "Безопасность и типовые ошибки",
        summary:
          "Ключи не должны попадать в публичные документы и чаты. Если что-то не работает — начните с базовой проверки.",
        content: (
          <ul className="docs-list">
            <li>Не публикуйте API-ключи в тексте документов и скриншотах.</li>
            <li>
              Если запросы не выполняются — проверьте срок действия ключа и
              лимиты провайдера.
            </li>
            <li>
              После обновления ключа повторите проблемное действие (поиск,
              перевод, AI-анализ).
            </li>
          </ul>
        ),
      },
    ],
  },
];

const DOC_SECTION_ICON_COMPONENTS: Record<
  DocSectionId,
  React.ComponentType<{ className?: string }>
> = {
  overview: IconBookOpen,
  articles: IconArchive,
  documents: IconDocumentText,
  files: IconFolderOpen,
  statistics: IconChartBar,
  graph: IconShare,
  team: IconUsers,
  settings: IconSettings,
  "api-keys": IconKey,
};

export default function DocumentationPage(): React.JSX.Element {
  const [activeSectionId, setActiveSectionId] = useState<DocSectionId>(
    DOC_SECTIONS[0].id,
  );

  const activeSection = useMemo(
    () =>
      DOC_SECTIONS.find((section) => section.id === activeSectionId) ??
      DOC_SECTIONS[0],
    [activeSectionId],
  );

  const [activeTopicId, setActiveTopicId] = useState<string>(
    DOC_SECTIONS[0].topics[0].id,
  );
  const [pendingFocusTopicId, setPendingFocusTopicId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const sectionHasTopic = activeSection.topics.some(
      (topic) => topic.id === activeTopicId,
    );
    if (!sectionHasTopic) {
      setActiveTopicId(activeSection.topics[0].id);
    }
  }, [activeSection, activeTopicId]);

  useEffect(() => {
    if (!pendingFocusTopicId) return;
    if (pendingFocusTopicId !== activeTopicId) {
      setPendingFocusTopicId(null);
      return;
    }

    const tab = document.getElementById(
      `docs-tab-${pendingFocusTopicId}`,
    ) as HTMLButtonElement | null;
    tab?.focus();
    setPendingFocusTopicId(null);
  }, [activeTopicId, pendingFocusTopicId]);

  const activeTopic = useMemo(
    () =>
      activeSection.topics.find((topic) => topic.id === activeTopicId) ??
      activeSection.topics[0],
    [activeSection, activeTopicId],
  );

  const activateTopicByIndex = (topicIndex: number): void => {
    const topic = activeSection.topics[topicIndex];
    if (!topic) return;

    setActiveTopicId(topic.id);
    setPendingFocusTopicId(topic.id);
  };

  const handleTopicTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    topicIndex: number,
  ): void => {
    const lastIndex = activeSection.topics.length - 1;
    if (lastIndex < 0) return;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight": {
        event.preventDefault();
        const nextIndex = topicIndex >= lastIndex ? 0 : topicIndex + 1;
        activateTopicByIndex(nextIndex);
        break;
      }
      case "ArrowUp":
      case "ArrowLeft": {
        event.preventDefault();
        const nextIndex = topicIndex <= 0 ? lastIndex : topicIndex - 1;
        activateTopicByIndex(nextIndex);
        break;
      }
      case "Home": {
        event.preventDefault();
        activateTopicByIndex(0);
        break;
      }
      case "End": {
        event.preventDefault();
        activateTopicByIndex(lastIndex);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="container docs-page">
      <div className="row space docs-page-header">
        <div className="row gap">
          <Link to="/projects" className="btn secondary">
            ← К проектам
          </Link>
          <h1 className="docs-page-title">
            <IconBookOpen
              size="lg"
              className="docs-icon-accent"
              aria-hidden="true"
            />
            Документация
          </h1>
        </div>
      </div>

      <div className="docs-layout">
        <div className="docs-sidebar">
          <div className="card docs-sidebar-card">
            <nav className="docs-nav" aria-label="Разделы документации">
              {DOC_SECTIONS.map((section) => {
                const isSectionActive = activeSection.id === section.id;
                const SectionIcon = DOC_SECTION_ICON_COMPONENTS[section.id];

                return (
                  <div
                    key={section.id}
                    className={`docs-nav-group ${isSectionActive ? "active" : ""}`}
                  >
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => {
                        setPendingFocusTopicId(null);
                        setActiveSectionId(section.id);
                        setActiveTopicId(section.topics[0].id);
                      }}
                      className={`doc-nav-item ${isSectionActive ? "active" : ""}`}
                      aria-current={isSectionActive ? "page" : undefined}
                      aria-expanded={isSectionActive}
                      aria-controls={`docs-subnav-${section.id}`}
                    >
                      <span className="doc-nav-item-icon">
                        <SectionIcon className="doc-nav-icon-svg" />
                      </span>
                      <span className="doc-nav-item-label">
                        {section.title}
                      </span>
                      <IconChevronDown
                        className={`doc-nav-item-chevron ${isSectionActive ? "expanded" : ""}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isSectionActive && (
                      <div
                        id={`docs-subnav-${section.id}`}
                        className="docs-subnav"
                      >
                        <div
                          className="docs-subnav-list"
                          role="tablist"
                          aria-orientation="vertical"
                        >
                          {activeSection.topics.map((topic, topicIndex) => (
                            <button
                              key={topic.id}
                              type="button"
                              className={`docs-subnav-item ${activeTopic.id === topic.id ? "active" : ""}`}
                              onClick={() => {
                                setPendingFocusTopicId(null);
                                setActiveTopicId(topic.id);
                              }}
                              onKeyDown={(event) =>
                                handleTopicTabKeyDown(event, topicIndex)
                              }
                              role="tab"
                              id={`docs-tab-${topic.id}`}
                              aria-controls={`docs-panel-${topic.id}`}
                              aria-selected={activeTopic.id === topic.id}
                              tabIndex={activeTopic.id === topic.id ? 0 : -1}
                            >
                              {topic.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="docs-content">
          <div className="card docs-content-card">
            <section className="doc-section">
              <h2>{activeSection.title}</h2>
              <p className="doc-intro">{activeSection.description}</p>

              <div className="doc-tip doc-tip--info">
                Откройте нужный пункт в меню слева, затем выберите подпункт в
                подменю, чтобы получить пошаговое объяснение.
              </div>

              <article
                id={`docs-panel-${activeTopic.id}`}
                className="docs-topic-card"
                role="tabpanel"
                aria-labelledby={`docs-tab-${activeTopic.id}`}
              >
                <h3 className="docs-topic-title">{activeTopic.title}</h3>
                <p className="docs-topic-summary">{activeTopic.summary}</p>
                <div className="docs-topic-content">{activeTopic.content}</div>
              </article>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
