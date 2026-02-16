import React, { useState, useEffect, type ReactNode } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import {
  BoxPlotController,
  BoxAndWiskers,
} from "@sgratzl/chartjs-chart-boxplot";

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BoxPlotController,
  BoxAndWiskers,
);

// Расширенные типы графиков
export type ChartType =
  | "bar" // Столбиковая диаграмма
  | "histogram" // Гистограмма
  | "stacked" // Внутристолбиковая (stacked bar)
  | "pie" // Секторная диаграмма
  | "line" // Линейная диаграмма
  | "boxplot" // Ящичная диаграмма
  | "scatter" // Диаграмма рассеяния
  | "doughnut"; // Кольцевая (сохраняем для совместимости)

// SVG иконки для графиков (Flowbite/Heroicons style)
const ChartBarIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const HistogramIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3v18h18M7 16v-4m4 4v-8m4 8v-6m4 6V7"
    />
  </svg>
);

const StackedBarIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 6h3v12H6V6zm4.5 4h3v8h-3v-8zm4.5-2h3v10h-3V8z"
    />
  </svg>
);

const PieChartIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z"
    />
  </svg>
);

const LineChartIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    />
  </svg>
);

const BoxPlotIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const ScatterIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6"
    />
  </svg>
);

const DoughnutIcon = () => (
  <svg
    className="chart-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

// Метаданные для каждого типа графика
export const CHART_TYPE_INFO: Record<
  ChartType,
  {
    name: string;
    icon: ReactNode;
    description: string;
    whenToUse: string;
    specialValue: string;
    dataTypes: string[];
    warnings?: string;
  }
> = {
  bar: {
    name: "Столбиковая диаграмма",
    icon: <ChartBarIcon />,
    description: "Сравнение значений между категориями",
    whenToUse: "Сравнение групп пациентов, сравнение средних, частот, долей",
    specialValue: "Наглядное сравнение дискретных категорий",
    dataTypes: ["Категориальные", "Группы", "Классы", "Варианты лечения"],
    warnings: "Не использовать для непрерывных данных",
  },
  histogram: {
    name: "Гистограмма",
    icon: <HistogramIcon />,
    description: "Распределение числовых (непрерывных) данных",
    whenToUse:
      "Проверка нормальности распределения, анализ вариабельности данных",
    specialValue: "Показывает форму распределения данных",
    dataTypes: [
      "Количественные",
      "Непрерывные",
      "Возраст",
      "Давление",
      "Уровень глюкозы",
    ],
    warnings: "Столбцы без промежутков, в отличие от столбиковой диаграммы",
  },
  stacked: {
    name: "Внутристолбиковая (Stacked Bar)",
    icon: <StackedBarIcon />,
    description: "Структура внутри категории",
    whenToUse: "Вклад подгрупп в общий результат, анализ составных показателей",
    specialValue: "Показывает одновременно целое и его части",
    dataTypes: ["Категориальные с подкатегориями", "Составные показатели"],
  },
  pie: {
    name: "Секторная диаграмма",
    icon: <PieChartIcon />,
    description: "Доли от целого",
    whenToUse: "Когда категорий ≤ 5-6, когда важны проценты",
    specialValue: "Интуитивное восприятие долей",
    dataTypes: ["Категориальные", "Доли", "Проценты"],
    warnings:
      "Не использовать при необходимости точного сравнения или при близких значениях",
  },
  line: {
    name: "Линейная диаграмма",
    icon: <LineChartIcon />,
    description: "Динамика во времени",
    whenToUse: "Временные ряды, мониторинг показателей",
    specialValue: "Показывает тренды и изменения",
    dataTypes: ["Временные данные", "Упорядоченные измерения"],
    warnings: "Требует упорядоченной оси X",
  },
  boxplot: {
    name: "Ящичная диаграмма (Box Plot)",
    icon: <BoxPlotIcon />,
    description: "Медиана, квартили, разброс, выбросы",
    whenToUse: "Сравнение распределений между группами, асимметричные данные",
    specialValue:
      "Устойчива к выбросам, показывает всю структуру распределения",
    dataTypes: ["Количественные", "Непрерывные", "Группы для сравнения"],
  },
  scatter: {
    name: "Диаграмма рассеяния (Scatter Plot)",
    icon: <ScatterIcon />,
    description: "Связь между двумя количественными переменными",
    whenToUse:
      "Корреляционный анализ, поиск линейных и нелинейных зависимостей",
    specialValue: "Визуализация корреляции и выбросов",
    dataTypes: ["Две количественные переменные", "Парные измерения"],
  },
  doughnut: {
    name: "Кольцевая диаграмма",
    icon: <DoughnutIcon />,
    description: "Доли от целого с центральным пространством",
    whenToUse:
      "Аналогично секторной, но с возможностью размещения текста в центре",
    specialValue: "Эстетический вариант секторной диаграммы",
    dataTypes: ["Категориальные", "Доли", "Проценты"],
    warnings: "Аналогичные секторной диаграмме",
  },
};

// Классификация статистических данных
export type DataClassification = {
  variableType: "quantitative" | "qualitative";
  subType: "continuous" | "discrete" | "nominal" | "dichotomous" | "ordinal";
  isNormalDistribution?: boolean;
};

// Рекомендации по типу графика на основе данных
export function getRecommendedChartTypes(
  classification: DataClassification,
): ChartType[] {
  const { variableType, subType, isNormalDistribution } = classification;

  if (variableType === "quantitative") {
    if (subType === "continuous") {
      // Для непрерывных данных
      const charts: ChartType[] = ["histogram", "boxplot", "line"];
      if (isNormalDistribution === false) {
        // Для ненормального распределения предпочтительны непараметрические
        return ["boxplot", "histogram"];
      }
      return charts;
    } else {
      // Для дискретных количественных
      return ["bar", "line"];
    }
  } else {
    // Качественные данные
    if (subType === "dichotomous") {
      return ["bar", "pie"];
    } else if (subType === "ordinal") {
      return ["bar", "stacked"];
    } else {
      // Номинальные
      return ["bar", "pie", "doughnut"];
    }
  }
}

// Рекомендация статистического метода
export function getRecommendedStatMethod(
  classification: DataClassification,
): string {
  const { variableType, subType, isNormalDistribution } = classification;

  if (variableType === "quantitative") {
    if (isNormalDistribution === true) {
      return "Параметрические (t-test, ANOVA)";
    } else if (isNormalDistribution === false) {
      return "Непараметрические (Mann-Whitney, Kruskal-Wallis)";
    }
    return "Требуется проверка нормальности распределения";
  } else {
    if (subType === "ordinal") {
      return "Непараметрические методы";
    }
    return "χ² (хи-квадрат), точный тест Фишера";
  }
}

export type TableData = {
  headers: string[];
  rows: string[][];
};

export type ChartConfig = {
  type: ChartType;
  title: string;
  labelColumn: number; // Индекс колонки для меток
  dataColumns: number[]; // Индексы колонок с данными
  colors?: string[];
  // Для scatter plot
  xColumn?: number;
  yColumn?: number;
  // Для гистограммы
  bins?: number;
  // Классификация данных
  dataClassification?: DataClassification;
  // Подписи осей
  xAxisLabel?: string;
  yAxisLabel?: string;
  // Цвет текста и осей (по умолчанию черный)
  textColor?: string;
  axisColor?: string;
};

type Props = {
  tableData: TableData;
  config: ChartConfig;
  width?: number;
  height?: number;
  // Тема для отображения: 'light' (черный текст) или 'dark' (белый текст)
  // По умолчанию 'light' для документов, в Статистике используется 'dark'
  theme?: "light" | "dark";
};

const DEFAULT_COLORS = [
  "rgba(75, 116, 255, 0.8)",
  "rgba(74, 222, 128, 0.8)",
  "rgba(255, 107, 107, 0.8)",
  "rgba(251, 191, 36, 0.8)",
  "rgba(168, 85, 247, 0.8)",
  "rgba(236, 72, 153, 0.8)",
  "rgba(34, 211, 238, 0.8)",
  "rgba(251, 146, 60, 0.8)",
];

export function parseTableFromHTML(html: string): TableData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const table = doc.querySelector("table");

  if (!table) return null;

  const headers: string[] = [];
  const rows: string[][] = [];

  // Парсим заголовки
  const headerRow = table.querySelector("tr");
  if (headerRow) {
    headerRow.querySelectorAll("th, td").forEach((cell) => {
      headers.push(cell.textContent?.trim() || "");
    });
  }

  // Парсим строки данных
  const dataRows = table.querySelectorAll("tr");
  dataRows.forEach((row, idx) => {
    if (idx === 0 && row.querySelector("th")) return; // Пропускаем заголовок

    const cells: string[] = [];
    row.querySelectorAll("td, th").forEach((cell) => {
      cells.push(cell.textContent?.trim() || "");
    });

    if (cells.length > 0) {
      rows.push(cells);
    }
  });

  return { headers, rows };
}

// Вычисление гистограммы
function calculateHistogram(
  values: number[],
  bins: number = 10,
): { labels: string[]; data: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / bins;

  const counts = new Array(bins).fill(0);
  const labels: string[] = [];

  for (let i = 0; i < bins; i++) {
    const start = min + i * binWidth;
    const end = min + (i + 1) * binWidth;
    labels.push(`${start.toFixed(1)}-${end.toFixed(1)}`);
  }

  values.forEach((v) => {
    let binIndex = Math.floor((v - min) / binWidth);
    if (binIndex >= bins) binIndex = bins - 1;
    if (binIndex < 0) binIndex = 0;
    counts[binIndex]++;
  });

  return { labels, data: counts };
}

// Вычисление статистики для boxplot
function calculateBoxplotStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0];
  const max = sorted[n - 1];
  const median =
    n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

  const q1Index = Math.floor(n / 4);
  const q3Index = Math.floor((3 * n) / 4);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;

  const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
  const upperWhisker = Math.min(max, q3 + 1.5 * iqr);

  const outliers = sorted.filter((v) => v < lowerWhisker || v > upperWhisker);

  return { min: lowerWhisker, q1, median, q3, max: upperWhisker, outliers };
}

export default function ChartFromTable({
  tableData,
  config,
  width,
  height,
  theme = "light",
}: Props) {
  const chartHeight = height ?? 300;
  const chartWidth = width;
  const chartContainerClassName =
    chartHeight <= 280
      ? "chart-from-table-container chart-from-table-container--compact"
      : "chart-from-table-container";
  const chartErrorClassName =
    chartHeight <= 280
      ? "chart-from-table-error chart-from-table-error--compact"
      : "chart-from-table-error";

  const renderChartError = (message: string) => (
    <div className={chartErrorClassName}>
      <div>{message}</div>
    </div>
  );

  // Проверка наличия данных
  if (!tableData || !tableData.headers || !tableData.rows) {
    return renderChartError("⚠️ Ошибка: данные таблицы отсутствуют");
  }

  if (!config || !config.type) {
    return renderChartError("⚠️ Ошибка: конфигурация графика отсутствует");
  }

  const {
    type,
    title,
    labelColumn,
    dataColumns,
    colors = DEFAULT_COLORS,
    bins = 10,
    xAxisLabel,
    yAxisLabel,
    textColor: configTextColor,
    axisColor: configAxisColor,
  } = config;

  // Определяем цвета в зависимости от темы
  // Для 'dark' темы (Статистика) используем белый текст, для 'light' (документы) - черный
  const textColor = theme === "dark" ? "#ffffff" : configTextColor || "#000000";
  const axisColor = theme === "dark" ? "#e2e8f0" : configAxisColor || "#000000";

  // Проверка валидности индексов колонок
  if (!dataColumns || dataColumns.length === 0) {
    return renderChartError("⚠️ Ошибка: не выбраны колонки данных");
  }

  // Базовые опции для всех графиков с кастомными цветами
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: textColor,
        },
      },
      title: {
        display: !!title,
        text: title,
        color: textColor,
        font: {
          size: 16,
        },
      },
    },
  };

  // Настройки осей с кастомными цветами и подписями
  const axisScales = {
    x: {
      ticks: { color: axisColor },
      grid: { color: "rgba(0,0,0,0.1)" },
      title: xAxisLabel
        ? {
            display: true,
            text: xAxisLabel,
            color: textColor,
            font: { size: 12 },
          }
        : undefined,
    },
    y: {
      ticks: { color: axisColor },
      grid: { color: "rgba(0,0,0,0.1)" },
      title: yAxisLabel
        ? {
            display: true,
            text: yAxisLabel,
            color: textColor,
            font: { size: 12 },
          }
        : undefined,
    },
  };

  // Обработка разных типов графиков
  if (type === "histogram") {
    // Гистограмма - берём все числовые значения из первой колонки данных
    const firstDataColumn = dataColumns[0];
    if (
      firstDataColumn === undefined ||
      firstDataColumn >= tableData.headers.length
    ) {
      return renderChartError("⚠️ Ошибка: неверный индекс колонки данных");
    }

    const values = tableData.rows
      .map((row) => {
        const val = row[firstDataColumn]?.replace(/[,\s]/g, "") || "0";
        return parseFloat(val);
      })
      .filter((v) => !isNaN(v));

    const { labels, data } = calculateHistogram(values, bins);

    const chartData = {
      labels,
      datasets: [
        {
          label: tableData.headers[firstDataColumn] || "Частота",
          data,
          backgroundColor: colors[0],
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
          barPercentage: 1.0,
          categoryPercentage: 1.0,
        },
      ],
    };

    return (
      <div className={chartContainerClassName}>
        <Bar
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          options={{
            ...baseOptions,
            scales: axisScales,
          }}
        />
      </div>
    );
  }

  if (type === "stacked") {
    // Stacked Bar - несколько серий данных
    const validLabelColumn =
      labelColumn >= 0 && labelColumn < tableData.headers.length
        ? labelColumn
        : 0;
    const labels = tableData.rows.map((row) => row[validLabelColumn] || "");

    const datasets = dataColumns
      .filter((colIdx) => colIdx >= 0 && colIdx < tableData.headers.length)
      .map((colIdx, i) => {
        const data = tableData.rows.map((row) => {
          const val = row[colIdx]?.replace(/[,\s]/g, "") || "0";
          return parseFloat(val) || 0;
        });

        return {
          label: tableData.headers[colIdx] || `Данные ${i + 1}`,
          data,
          backgroundColor: colors[i % colors.length],
          borderColor: "rgba(255, 255, 255, 0.2)",
          borderWidth: 1,
        };
      });

    const chartData = { labels, datasets };

    return (
      <div className={chartContainerClassName}>
        <Bar
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          options={{
            ...baseOptions,
            scales: {
              ...axisScales,
              x: { ...axisScales.x, stacked: true },
              y: { ...axisScales.y, stacked: true },
            },
          }}
        />
      </div>
    );
  }

  if (type === "boxplot") {
    // Box Plot
    const validDataColumns = dataColumns.filter(
      (colIdx) => colIdx >= 0 && colIdx < tableData.headers.length,
    );

    if (validDataColumns.length === 0) {
      return renderChartError("⚠️ Ошибка: нет валидных колонок для boxplot");
    }

    // Используем обычный Bar с визуализацией статистики, т.к. boxplot требует специальной библиотеки
    // Упрощённая визуализация - показываем min, q1, median, q3, max как stacked bar
    const boxData = validDataColumns.map((colIdx) => {
      const values = tableData.rows
        .map((row) => {
          const val = row[colIdx]?.replace(/[,\s]/g, "") || "0";
          return parseFloat(val);
        })
        .filter((v) => !isNaN(v));

      return calculateBoxplotStats(values);
    });

    const labels = validDataColumns.map(
      (i) => tableData.headers[i] || `Колонка ${i + 1}`,
    );

    // Создаём визуализацию box plot через комбинацию элементов
    const boxChartData = {
      labels,
      datasets: [
        {
          label: "Минимум - Q1",
          data: boxData.map((b) => b.q1 - b.min),
          backgroundColor: "rgba(100, 130, 200, 0.3)",
          borderWidth: 0,
          stack: "box",
        },
        {
          label: "Q1 - Медиана",
          data: boxData.map((b) => b.median - b.q1),
          backgroundColor: colors[0],
          borderWidth: 1,
          borderColor: "white",
          stack: "box",
        },
        {
          label: "Медиана - Q3",
          data: boxData.map((b) => b.q3 - b.median),
          backgroundColor: colors[1],
          borderWidth: 1,
          borderColor: "white",
          stack: "box",
        },
        {
          label: "Q3 - Максимум",
          data: boxData.map((b) => b.max - b.q3),
          backgroundColor: "rgba(100, 130, 200, 0.3)",
          borderWidth: 0,
          stack: "box",
        },
      ],
    };

    return (
      <div className={chartContainerClassName}>
        <Bar
          data={boxChartData}
          width={chartWidth}
          height={chartHeight}
          options={{
            ...baseOptions,
            indexAxis: "y" as const,
            scales: {
              ...axisScales,
              x: { ...axisScales.x, stacked: true },
              y: { ...axisScales.y, stacked: true },
            },
            plugins: {
              ...baseOptions.plugins,
              tooltip: {
                callbacks: {
                  label: function (context: TooltipItem<"bar">) {
                    const idx = context.dataIndex;
                    const stats = boxData[idx];
                    return [
                      `Мин: ${stats.min.toFixed(2)}`,
                      `Q1: ${stats.q1.toFixed(2)}`,
                      `Медиана: ${stats.median.toFixed(2)}`,
                      `Q3: ${stats.q3.toFixed(2)}`,
                      `Макс: ${stats.max.toFixed(2)}`,
                    ];
                  },
                },
              },
            },
          }}
        />
      </div>
    );
  }

  if (type === "scatter") {
    // Scatter Plot - берём две колонки как X и Y
    const xCol = config.xColumn ?? dataColumns[0] ?? 1;
    const yCol = config.yColumn ?? dataColumns[1] ?? 2;

    // Проверка валидности колонок
    if (
      xCol < 0 ||
      xCol >= tableData.headers.length ||
      yCol < 0 ||
      yCol >= tableData.headers.length
    ) {
      return renderChartError(
        "⚠️ Ошибка: неверные индексы колонок для scatter plot",
      );
    }

    const data = tableData.rows.map((row) => {
      const x = parseFloat(row[xCol]?.replace(/[,\s]/g, "") || "0") || 0;
      const y = parseFloat(row[yCol]?.replace(/[,\s]/g, "") || "0") || 0;
      return { x, y };
    });

    const chartData = {
      datasets: [
        {
          label: `${tableData.headers[xCol] || "X"} vs ${tableData.headers[yCol] || "Y"}`,
          data,
          backgroundColor: colors[0],
          borderColor: colors[0].replace("0.8", "1"),
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    };

    return (
      <div className={chartContainerClassName}>
        <Scatter
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          options={{
            ...baseOptions,
            scales: {
              x: {
                ...axisScales.x,
                title: {
                  display: true,
                  text: xAxisLabel || tableData.headers[xCol] || "X",
                  color: textColor,
                },
              },
              y: {
                ...axisScales.y,
                title: {
                  display: true,
                  text: yAxisLabel || tableData.headers[yCol] || "Y",
                  color: textColor,
                },
              },
            },
          }}
        />
      </div>
    );
  }

  // Стандартные типы графиков (bar, line, pie, doughnut)
  const validLabelColumn =
    labelColumn >= 0 && labelColumn < tableData.headers.length
      ? labelColumn
      : 0;
  const labels = tableData.rows.map((row) => row[validLabelColumn] || "");

  const validDataColumns = dataColumns.filter(
    (colIdx) => colIdx >= 0 && colIdx < tableData.headers.length,
  );

  if (validDataColumns.length === 0) {
    return renderChartError("⚠️ Ошибка: нет валидных колонок данных");
  }

  const datasets = validDataColumns.map((colIdx, i) => {
    const data = tableData.rows.map((row) => {
      const val = row[colIdx]?.replace(/[,\s]/g, "") || "0";
      return parseFloat(val) || 0;
    });

    return {
      label: tableData.headers[colIdx] || `Данные ${i + 1}`,
      data,
      backgroundColor:
        type === "pie" || type === "doughnut"
          ? colors.slice(0, data.length)
          : colors[i % colors.length],
      borderColor:
        type === "line"
          ? colors[i % colors.length]
          : "rgba(255, 255, 255, 0.2)",
      borderWidth: type === "line" ? 2 : 1,
      tension: 0.3,
      fill: type === "line" ? false : undefined,
    };
  });

  const chartData = {
    labels,
    datasets,
  };

  const options = {
    ...baseOptions,
    scales: type !== "pie" && type !== "doughnut" ? axisScales : undefined,
  };

  const ChartComponent =
    {
      bar: Bar,
      line: Line,
      pie: Pie,
      doughnut: Doughnut,
    }[type] || Bar;

  return (
    <div className={chartContainerClassName}>
      <ChartComponent
        data={chartData}
        options={options}
        width={chartWidth}
        height={chartHeight}
      />
    </div>
  );
}

// Компонент подсказки для типа графика
type ChartTypeHintProps = {
  type: ChartType;
  compact?: boolean;
};

export function ChartTypeHint({ type, compact = false }: ChartTypeHintProps) {
  const info = CHART_TYPE_INFO[type] ?? {
    name: String(type),
    icon: "📊",
    description: "",
    whenToUse: "",
    specialValue: "",
    dataTypes: [],
  };

  if (compact) {
    return (
      <div
        className="chart-hint-compact"
        title={`${info.description}\n\nКогда использовать: ${info.whenToUse}`}
      >
        <span className="chart-hint-icon">{info.icon}</span>
        <span className="chart-hint-name">{info.name}</span>
      </div>
    );
  }

  return (
    <div className="chart-hint">
      <div className="chart-hint-header">
        <span className="chart-hint-icon">{info.icon}</span>
        <span className="chart-hint-name">{info.name}</span>
      </div>
      <div className="chart-hint-description">{info.description}</div>
      <div className="chart-hint-section">
        <strong>Когда использовать:</strong> {info.whenToUse}
      </div>
      <div className="chart-hint-section">
        <strong>Особая ценность:</strong> {info.specialValue}
      </div>
      <div className="chart-hint-tags">
        {info.dataTypes.map((t, i) => (
          <span key={i} className="chart-hint-tag">
            {t}
          </span>
        ))}
      </div>
      {info.warnings && (
        <div className="chart-hint-warning">⚠️ {info.warnings}</div>
      )}
    </div>
  );
}

// Модальное окно для создания графика
type ChartModalProps = {
  tableHtml: string;
  onClose: () => void;
  onInsert: (chartHtml: string, chartId?: string) => void;
};

export function ChartCreatorModal({
  tableHtml,
  onClose,
  onInsert,
}: ChartModalProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [title, setTitle] = useState("");
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  const [showTypeInfo, setShowTypeInfo] = useState(false);
  const [bins, setBins] = useState(10);
  const [xColumn, setXColumn] = useState(1);
  const [yColumn, setYColumn] = useState(2);

  // Классификация данных
  const [variableType, setVariableType] = useState<
    "quantitative" | "qualitative"
  >("quantitative");
  const [subType, setSubType] =
    useState<DataClassification["subType"]>("continuous");
  const [isNormalDistribution, setIsNormalDistribution] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    const data = parseTableFromHTML(tableHtml);
    setTableData(data);
    if (data && data.headers.length > 1) {
      setDataColumns([1]);
      if (data.headers.length > 2) {
        setYColumn(2);
      }
    }
  }, [tableHtml]);

  // Получаем рекомендации
  const classification: DataClassification = {
    variableType,
    subType,
    isNormalDistribution,
  };
  const recommendedTypes = getRecommendedChartTypes(classification);
  const recommendedMethod = getRecommendedStatMethod(classification);

  if (!tableData) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-body">
            <p>Не удалось распарсить таблицу</p>
          </div>
          <div className="modal-footer">
            <button className="btn-primary" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleDataColumn = (idx: number) => {
    if (dataColumns.includes(idx)) {
      setDataColumns(dataColumns.filter((c) => c !== idx));
    } else {
      setDataColumns([...dataColumns, idx]);
    }
  };

  const config: ChartConfig = {
    type: chartType,
    title,
    labelColumn,
    dataColumns,
    bins,
    xColumn,
    yColumn,
    dataClassification: classification,
  };

  const handleInsert = () => {
    // Генерируем уникальный ID для графика
    const chartId = `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Генерируем HTML с данными для графика
    const chartDataJson = JSON.stringify({
      tableData,
      config,
      chartId,
    });

    const chartHtml = `
      <div class="chart-container" data-chart='${chartDataJson.replace(/'/g, "&#39;")}' data-chart-id="${chartId}">
        <div class="chart-placeholder">
          График: ${title || CHART_TYPE_INFO[chartType]?.name || "График"}
        </div>
      </div>
    `;

    onInsert(chartHtml, chartId);
  };

  const allChartTypes: ChartType[] = [
    "bar",
    "histogram",
    "stacked",
    "pie",
    "line",
    "boxplot",
    "scatter",
    "doughnut",
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content chart-creator-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">Создать график из таблицы</h3>
          <button className="modal-close" onClick={onClose}>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {/* Классификация данных */}
          <div className="card chart-creator-classification-card">
            <div className="row space chart-creator-classification-header">
              <strong className="chart-creator-classification-title">
                📊 Классификация данных
              </strong>
              <span className="muted chart-creator-classification-method">
                Рекомендуемый метод: {recommendedMethod}
              </span>
            </div>
            <div className="row gap chart-creator-classification-controls">
              <select
                value={variableType}
                onChange={(e) =>
                  setVariableType(
                    e.target.value as "quantitative" | "qualitative",
                  )
                }
                className="chart-creator-classification-select"
              >
                <option value="quantitative">Количественные</option>
                <option value="qualitative">Качественные</option>
              </select>
              <select
                value={subType}
                onChange={(e) =>
                  setSubType(e.target.value as DataClassification["subType"])
                }
                className="chart-creator-classification-select"
              >
                {variableType === "quantitative" ? (
                  <>
                    <option value="continuous">Непрерывные</option>
                    <option value="discrete">Дискретные</option>
                  </>
                ) : (
                  <>
                    <option value="nominal">Номинальные</option>
                    <option value="dichotomous">Дихотомические</option>
                    <option value="ordinal">Порядковые</option>
                  </>
                )}
              </select>
              {variableType === "quantitative" && (
                <select
                  value={
                    isNormalDistribution === undefined
                      ? ""
                      : isNormalDistribution
                        ? "yes"
                        : "no"
                  }
                  onChange={(e) => {
                    if (e.target.value === "")
                      setIsNormalDistribution(undefined);
                    else setIsNormalDistribution(e.target.value === "yes");
                  }}
                  className="chart-creator-classification-select"
                >
                  <option value="">Распределение неизвестно</option>
                  <option value="yes">Нормальное распределение</option>
                  <option value="no">Ненормальное распределение</option>
                </select>
              )}
            </div>
            {recommendedTypes.length > 0 && (
              <div className="chart-creator-recommended-types">
                <span className="muted">Рекомендуемые графики: </span>
                {recommendedTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartType(t)}
                    className={`id-badge chart-creator-recommended-chip ${chartType === t ? "stats-q3" : ""}`}
                  >
                    {CHART_TYPE_INFO[t].icon} {CHART_TYPE_INFO[t].name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="row gap chart-creator-settings-row">
            {/* Настройки */}
            <div className="chart-creator-settings-column">
              <label className="stack chart-creator-field-stack">
                <div className="row space">
                  <span>Тип графика</span>
                  <button
                    className="btn secondary chart-creator-toggle-info-btn"
                    onClick={() => setShowTypeInfo(!showTypeInfo)}
                  >
                    {showTypeInfo ? "Скрыть подсказки" : "❓ Подсказки"}
                  </button>
                </div>
                <div className="chart-creator-type-buttons-wrap">
                  {allChartTypes.map((t) => {
                    const info = CHART_TYPE_INFO[t] ?? {
                      name: String(t),
                      icon: "📊",
                      description: "",
                    };
                    return (
                      <button
                        key={t}
                        className={`btn chart-creator-type-btn ${
                          chartType === t ? "" : "secondary"
                        } ${
                          recommendedTypes.includes(t)
                            ? "chart-creator-type-btn--recommended"
                            : ""
                        }`}
                        onClick={() => setChartType(t)}
                        title={info.description}
                      >
                        {info.icon}{" "}
                        {t === "histogram"
                          ? "Гист."
                          : t === "stacked"
                            ? "Stacked"
                            : t === "boxplot"
                              ? "Box"
                              : t === "scatter"
                                ? "Scatter"
                                : t === "doughnut"
                                  ? "Кольцо"
                                  : t === "bar"
                                    ? "Столбцы"
                                    : t === "line"
                                      ? "Линия"
                                      : t === "pie"
                                        ? "Круг"
                                        : t}
                      </button>
                    );
                  })}
                </div>
              </label>

              {showTypeInfo && (
                <div className="chart-creator-type-hint-wrap">
                  <ChartTypeHint type={chartType} />
                </div>
              )}

              <label className="stack chart-creator-field-stack">
                <span>Заголовок графика</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Необязательно"
                />
              </label>

              {chartType === "scatter" ? (
                <>
                  <label className="stack chart-creator-field-stack">
                    <span>Ось X</span>
                    <select
                      value={xColumn}
                      onChange={(e) => setXColumn(Number(e.target.value))}
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stack chart-creator-field-stack">
                    <span>Ось Y</span>
                    <select
                      value={yColumn}
                      onChange={(e) => setYColumn(Number(e.target.value))}
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : chartType === "histogram" ? (
                <>
                  <label className="stack chart-creator-field-stack">
                    <span>Колонка данных</span>
                    <select
                      value={dataColumns[0] || 1}
                      onChange={(e) => setDataColumns([Number(e.target.value)])}
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="stack chart-creator-field-stack">
                    <span>Количество интервалов (bins): {bins}</span>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={bins}
                      onChange={(e) => setBins(Number(e.target.value))}
                      className="chart-creator-histogram-range"
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="stack chart-creator-field-stack">
                    <span>Колонка меток (X)</span>
                    <select
                      value={labelColumn}
                      onChange={(e) => setLabelColumn(Number(e.target.value))}
                    >
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Колонка ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="chart-creator-data-columns-section">
                    <span className="muted">Колонки данных (Y)</span>
                    <div className="row gap chart-creator-data-columns-wrap">
                      {tableData.headers.map(
                        (h, i) =>
                          i !== labelColumn && (
                            <label
                              key={i}
                              className="row gap chart-creator-data-column-label"
                            >
                              <input
                                type="checkbox"
                                checked={dataColumns.includes(i)}
                                onChange={() => toggleDataColumn(i)}
                                className="chart-creator-data-column-checkbox"
                              />
                              <span className="chart-creator-data-column-text">
                                {h || `Колонка ${i + 1}`}
                              </span>
                            </label>
                          ),
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Превью */}
            <div className="chart-creator-preview-panel">
              <div className="muted chart-creator-preview-title">
                Предпросмотр:
              </div>
              {chartType === "scatter" ||
              chartType === "histogram" ||
              dataColumns.length > 0 ? (
                <ChartFromTable
                  tableData={tableData}
                  config={config}
                  height={280}
                  theme="dark"
                />
              ) : (
                <div className="muted chart-creator-preview-empty">
                  Выберите хотя бы одну колонку данных
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn-primary"
            onClick={handleInsert}
            disabled={
              chartType !== "scatter" &&
              chartType !== "histogram" &&
              dataColumns.length === 0
            }
          >
            Вставить график
          </button>
        </div>
      </div>
    </div>
  );
}
