import React, { useState, useEffect } from 'react';
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
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Scatter } from 'react-chartjs-2';
import {
  BoxPlotController,
  BoxAndWiskers,
} from '@sgratzl/chartjs-chart-boxplot';

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
  BoxAndWiskers
);

// Расширенные типы графиков
export type ChartType = 
  | 'bar'           // Столбиковая диаграмма
  | 'histogram'     // Гистограмма
  | 'stacked'       // Внутристолбиковая (stacked bar)
  | 'pie'           // Секторная диаграмма
  | 'line'          // Линейная диаграмма
  | 'boxplot'       // Ящичная диаграмма
  | 'scatter'       // Диаграмма рассеяния
  | 'doughnut';     // Кольцевая (сохраняем для совместимости)

// Метаданные для каждого типа графика
export const CHART_TYPE_INFO: Record<ChartType, {
  name: string;
  icon: string;
  description: string;
  whenToUse: string;
  specialValue: string;
  dataTypes: string[];
  warnings?: string;
}> = {
  bar: {
    name: 'Столбиковая диаграмма',
    icon: '📊',
    description: 'Сравнение значений между категориями',
    whenToUse: 'Сравнение групп пациентов, сравнение средних, частот, долей',
    specialValue: 'Наглядное сравнение дискретных категорий',
    dataTypes: ['Категориальные', 'Группы', 'Классы', 'Варианты лечения'],
    warnings: 'Не использовать для непрерывных данных',
  },
  histogram: {
    name: 'Гистограмма',
    icon: '📶',
    description: 'Распределение числовых (непрерывных) данных',
    whenToUse: 'Проверка нормальности распределения, анализ вариабельности данных',
    specialValue: 'Показывает форму распределения данных',
    dataTypes: ['Количественные', 'Непрерывные', 'Возраст', 'Давление', 'Уровень глюкозы'],
    warnings: 'Столбцы без промежутков, в отличие от столбиковой диаграммы',
  },
  stacked: {
    name: 'Внутристолбиковая (Stacked Bar)',
    icon: '📚',
    description: 'Структура внутри категории',
    whenToUse: 'Вклад подгрупп в общий результат, анализ составных показателей',
    specialValue: 'Показывает одновременно целое и его части',
    dataTypes: ['Категориальные с подкатегориями', 'Составные показатели'],
  },
  pie: {
    name: 'Секторная диаграмма',
    icon: '🥧',
    description: 'Доли от целого',
    whenToUse: 'Когда категорий ≤ 5-6, когда важны проценты',
    specialValue: 'Интуитивное восприятие долей',
    dataTypes: ['Категориальные', 'Доли', 'Проценты'],
    warnings: 'Не использовать при необходимости точного сравнения или при близких значениях',
  },
  line: {
    name: 'Линейная диаграмма',
    icon: '📈',
    description: 'Динамика во времени',
    whenToUse: 'Временные ряды, мониторинг показателей',
    specialValue: 'Показывает тренды и изменения',
    dataTypes: ['Временные данные', 'Упорядоченные измерения'],
    warnings: 'Требует упорядоченной оси X',
  },
  boxplot: {
    name: 'Ящичная диаграмма (Box Plot)',
    icon: '📦',
    description: 'Медиана, квартили, разброс, выбросы',
    whenToUse: 'Сравнение распределений между группами, асимметричные данные',
    specialValue: 'Устойчива к выбросам, показывает всю структуру распределения',
    dataTypes: ['Количественные', 'Непрерывные', 'Группы для сравнения'],
  },
  scatter: {
    name: 'Диаграмма рассеяния (Scatter Plot)',
    icon: '⚡',
    description: 'Связь между двумя количественными переменными',
    whenToUse: 'Корреляционный анализ, поиск линейных и нелинейных зависимостей',
    specialValue: 'Визуализация корреляции и выбросов',
    dataTypes: ['Две количественные переменные', 'Парные измерения'],
  },
  doughnut: {
    name: 'Кольцевая диаграмма',
    icon: '🍩',
    description: 'Доли от целого с центральным пространством',
    whenToUse: 'Аналогично секторной, но с возможностью размещения текста в центре',
    specialValue: 'Эстетический вариант секторной диаграммы',
    dataTypes: ['Категориальные', 'Доли', 'Проценты'],
    warnings: 'Аналогичные секторной диаграмме',
  },
};

// Классификация статистических данных
export type DataClassification = {
  variableType: 'quantitative' | 'qualitative';
  subType: 'continuous' | 'discrete' | 'nominal' | 'dichotomous' | 'ordinal';
  isNormalDistribution?: boolean;
};

// Рекомендации по типу графика на основе данных
export function getRecommendedChartTypes(classification: DataClassification): ChartType[] {
  const { variableType, subType, isNormalDistribution } = classification;
  
  if (variableType === 'quantitative') {
    if (subType === 'continuous') {
      // Для непрерывных данных
      const charts: ChartType[] = ['histogram', 'boxplot', 'line'];
      if (isNormalDistribution === false) {
        // Для ненормального распределения предпочтительны непараметрические
        return ['boxplot', 'histogram'];
      }
      return charts;
    } else {
      // Для дискретных количественных
      return ['bar', 'line'];
    }
  } else {
    // Качественные данные
    if (subType === 'dichotomous') {
      return ['bar', 'pie'];
    } else if (subType === 'ordinal') {
      return ['bar', 'stacked'];
    } else {
      // Номинальные
      return ['bar', 'pie', 'doughnut'];
    }
  }
}

// Рекомендация статистического метода
export function getRecommendedStatMethod(classification: DataClassification): string {
  const { variableType, subType, isNormalDistribution } = classification;
  
  if (variableType === 'quantitative') {
    if (isNormalDistribution === true) {
      return 'Параметрические (t-test, ANOVA)';
    } else if (isNormalDistribution === false) {
      return 'Непараметрические (Mann-Whitney, Kruskal-Wallis)';
    }
    return 'Требуется проверка нормальности распределения';
  } else {
    if (subType === 'ordinal') {
      return 'Непараметрические методы';
    }
    return 'χ² (хи-квадрат), точный тест Фишера';
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
};

type Props = {
  tableData: TableData;
  config: ChartConfig;
  width?: number;
  height?: number;
};

const DEFAULT_COLORS = [
  'rgba(75, 116, 255, 0.8)',
  'rgba(74, 222, 128, 0.8)',
  'rgba(255, 107, 107, 0.8)',
  'rgba(251, 191, 36, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(34, 211, 238, 0.8)',
  'rgba(251, 146, 60, 0.8)',
];

export function parseTableFromHTML(html: string): TableData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  
  if (!table) return null;
  
  const headers: string[] = [];
  const rows: string[][] = [];
  
  // Парсим заголовки
  const headerRow = table.querySelector('tr');
  if (headerRow) {
    headerRow.querySelectorAll('th, td').forEach(cell => {
      headers.push(cell.textContent?.trim() || '');
    });
  }
  
  // Парсим строки данных
  const dataRows = table.querySelectorAll('tr');
  dataRows.forEach((row, idx) => {
    if (idx === 0 && row.querySelector('th')) return; // Пропускаем заголовок
    
    const cells: string[] = [];
    row.querySelectorAll('td, th').forEach(cell => {
      cells.push(cell.textContent?.trim() || '');
    });
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  });
  
  return { headers, rows };
}

// Вычисление гистограммы
function calculateHistogram(values: number[], bins: number = 10): { labels: string[]; data: number[] } {
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
  
  values.forEach(v => {
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
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  const q1Index = Math.floor(n / 4);
  const q3Index = Math.floor(3 * n / 4);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
  const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
  
  const outliers = sorted.filter(v => v < lowerWhisker || v > upperWhisker);
  
  return { min: lowerWhisker, q1, median, q3, max: upperWhisker, outliers };
}

export default function ChartFromTable({ tableData, config, width, height }: Props) {
  // Проверка наличия данных
  if (!tableData || !tableData.headers || !tableData.rows) {
    return (
      <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
        <div>⚠️ Ошибка: данные таблицы отсутствуют</div>
      </div>
    );
  }
  
  if (!config || !config.type) {
    return (
      <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
        <div>⚠️ Ошибка: конфигурация графика отсутствует</div>
      </div>
    );
  }
  
  const { type, title, labelColumn, dataColumns, colors = DEFAULT_COLORS, bins = 10 } = config;
  
  // Проверка валидности индексов колонок
  if (!dataColumns || dataColumns.length === 0) {
    return (
      <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
        <div>⚠️ Ошибка: не выбраны колонки данных</div>
      </div>
    );
  }
  
  // Базовые опции для всех графиков
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e8eefc',
        },
      },
      title: {
        display: !!title,
        text: title,
        color: '#e8eefc',
        font: {
          size: 16,
        },
      },
    },
  };
  
  const axisScales = {
    x: {
      ticks: { color: '#a9b7da' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
    y: {
      ticks: { color: '#a9b7da' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
  };

  const style = {
    width: width || '100%',
    height: height || 300,
  };

  // Обработка разных типов графиков
  if (type === 'histogram') {
    // Гистограмма - берём все числовые значения из первой колонки данных
    const firstDataColumn = dataColumns[0];
    if (firstDataColumn === undefined || firstDataColumn >= tableData.headers.length) {
      return (
        <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
          <div>⚠️ Ошибка: неверный индекс колонки данных</div>
        </div>
      );
    }
    
    const values = tableData.rows
      .map(row => {
        const val = row[firstDataColumn]?.replace(/[,\s]/g, '') || '0';
        return parseFloat(val);
      })
      .filter(v => !isNaN(v));
    
    const { labels, data } = calculateHistogram(values, bins);
    
    const chartData = {
      labels,
      datasets: [{
        label: tableData.headers[firstDataColumn] || 'Частота',
        data,
        backgroundColor: colors[0],
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        barPercentage: 1.0,
        categoryPercentage: 1.0,
      }],
    };
    
    return (
      <div style={style}>
        <Bar 
          data={chartData} 
          options={{
            ...baseOptions,
            scales: axisScales,
          }} 
        />
      </div>
    );
  }
  
  if (type === 'stacked') {
    // Stacked Bar - несколько серий данных
    const validLabelColumn = labelColumn >= 0 && labelColumn < tableData.headers.length ? labelColumn : 0;
    const labels = tableData.rows.map(row => row[validLabelColumn] || '');
    
    const datasets = dataColumns
      .filter(colIdx => colIdx >= 0 && colIdx < tableData.headers.length)
      .map((colIdx, i) => {
        const data = tableData.rows.map(row => {
          const val = row[colIdx]?.replace(/[,\s]/g, '') || '0';
          return parseFloat(val) || 0;
        });
      
        return {
          label: tableData.headers[colIdx] || `Данные ${i + 1}`,
          data,
          backgroundColor: colors[i % colors.length],
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
        };
      });
    
    const chartData = { labels, datasets };
    
    return (
      <div style={style}>
        <Bar 
          data={chartData} 
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
  
  if (type === 'boxplot') {
    // Box Plot
    const validDataColumns = dataColumns.filter(colIdx => colIdx >= 0 && colIdx < tableData.headers.length);
    
    if (validDataColumns.length === 0) {
      return (
        <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
          <div>⚠️ Ошибка: нет валидных колонок для boxplot</div>
        </div>
      );
    }
    
    const datasets = validDataColumns.map((colIdx, i) => {
      const values = tableData.rows
        .map(row => {
          const val = row[colIdx]?.replace(/[,\s]/g, '') || '0';
          return parseFloat(val);
        })
        .filter(v => !isNaN(v));
      
      const stats = calculateBoxplotStats(values);
      
      return {
        label: tableData.headers[colIdx] || `Данные ${i + 1}`,
        data: [stats],
        backgroundColor: colors[i % colors.length],
        borderColor: colors[i % colors.length].replace('0.8', '1'),
        borderWidth: 1,
        outlierBackgroundColor: colors[i % colors.length],
      };
    });
    
    const chartData = {
      labels: validDataColumns.map(i => tableData.headers[i] || `Колонка ${i + 1}`),
      datasets,
    };
    
    // Используем обычный Bar с визуализацией статистики, т.к. boxplot требует специальной библиотеки
    // Упрощённая визуализация - показываем min, q1, median, q3, max как stacked bar
    const boxData = validDataColumns.map((colIdx) => {
      const values = tableData.rows
        .map(row => {
          const val = row[colIdx]?.replace(/[,\s]/g, '') || '0';
          return parseFloat(val);
        })
        .filter(v => !isNaN(v));
      
      return calculateBoxplotStats(values);
    });
    
    const labels = validDataColumns.map(i => tableData.headers[i] || `Колонка ${i + 1}`);
    
    // Создаём визуализацию box plot через комбинацию элементов
    const boxChartData = {
      labels,
      datasets: [
        {
          label: 'Минимум - Q1',
          data: boxData.map(b => b.q1 - b.min),
          backgroundColor: 'rgba(100, 130, 200, 0.3)',
          borderWidth: 0,
          stack: 'box',
        },
        {
          label: 'Q1 - Медиана',
          data: boxData.map(b => b.median - b.q1),
          backgroundColor: colors[0],
          borderWidth: 1,
          borderColor: 'white',
          stack: 'box',
        },
        {
          label: 'Медиана - Q3',
          data: boxData.map(b => b.q3 - b.median),
          backgroundColor: colors[1],
          borderWidth: 1,
          borderColor: 'white',
          stack: 'box',
        },
        {
          label: 'Q3 - Максимум',
          data: boxData.map(b => b.max - b.q3),
          backgroundColor: 'rgba(100, 130, 200, 0.3)',
          borderWidth: 0,
          stack: 'box',
        },
      ],
    };
    
    return (
      <div style={style}>
        <Bar 
          data={boxChartData} 
          options={{
            ...baseOptions,
            indexAxis: 'y' as const,
            scales: {
              ...axisScales,
              x: { ...axisScales.x, stacked: true },
              y: { ...axisScales.y, stacked: true },
            },
            plugins: {
              ...baseOptions.plugins,
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const idx = context.dataIndex;
                    const stats = boxData[idx];
                    return [
                      `Мин: ${stats.min.toFixed(2)}`,
                      `Q1: ${stats.q1.toFixed(2)}`,
                      `Медиана: ${stats.median.toFixed(2)}`,
                      `Q3: ${stats.q3.toFixed(2)}`,
                      `Макс: ${stats.max.toFixed(2)}`,
                    ];
                  }
                }
              }
            }
          }} 
        />
      </div>
    );
  }
  
  if (type === 'scatter') {
    // Scatter Plot - берём две колонки как X и Y
    const xCol = config.xColumn ?? dataColumns[0] ?? 1;
    const yCol = config.yColumn ?? dataColumns[1] ?? 2;
    
    // Проверка валидности колонок
    if (xCol < 0 || xCol >= tableData.headers.length || yCol < 0 || yCol >= tableData.headers.length) {
      return (
        <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
          <div>⚠️ Ошибка: неверные индексы колонок для scatter plot</div>
        </div>
      );
    }
    
    const data = tableData.rows.map(row => {
      const x = parseFloat(row[xCol]?.replace(/[,\s]/g, '') || '0') || 0;
      const y = parseFloat(row[yCol]?.replace(/[,\s]/g, '') || '0') || 0;
      return { x, y };
    });
    
    const chartData = {
      datasets: [{
        label: `${tableData.headers[xCol] || 'X'} vs ${tableData.headers[yCol] || 'Y'}`,
        data,
        backgroundColor: colors[0],
        borderColor: colors[0].replace('0.8', '1'),
        pointRadius: 6,
        pointHoverRadius: 8,
      }],
    };
    
    return (
      <div style={style}>
        <Scatter 
          data={chartData} 
          options={{
            ...baseOptions,
            scales: {
              x: {
                ...axisScales.x,
                title: {
                  display: true,
                  text: tableData.headers[xCol] || 'X',
                  color: '#a9b7da',
                },
              },
              y: {
                ...axisScales.y,
                title: {
                  display: true,
                  text: tableData.headers[yCol] || 'Y',
                  color: '#a9b7da',
                },
              },
            },
          }} 
        />
      </div>
    );
  }
  
  // Стандартные типы графиков (bar, line, pie, doughnut)
  const validLabelColumn = labelColumn >= 0 && labelColumn < tableData.headers.length ? labelColumn : 0;
  const labels = tableData.rows.map(row => row[validLabelColumn] || '');
  
  const validDataColumns = dataColumns.filter(colIdx => colIdx >= 0 && colIdx < tableData.headers.length);
  
  if (validDataColumns.length === 0) {
    return (
      <div style={{ width: width || '100%', height: height || 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b6b' }}>
        <div>⚠️ Ошибка: нет валидных колонок данных</div>
      </div>
    );
  }
  
  const datasets = validDataColumns.map((colIdx, i) => {
    const data = tableData.rows.map(row => {
      const val = row[colIdx]?.replace(/[,\s]/g, '') || '0';
      return parseFloat(val) || 0;
    });
    
    return {
      label: tableData.headers[colIdx] || `Данные ${i + 1}`,
      data,
      backgroundColor: type === 'pie' || type === 'doughnut' 
        ? colors.slice(0, data.length)
        : colors[i % colors.length],
      borderColor: type === 'line' 
        ? colors[i % colors.length]
        : 'rgba(255, 255, 255, 0.2)',
      borderWidth: type === 'line' ? 2 : 1,
      tension: 0.3,
      fill: type === 'line' ? false : undefined,
    };
  });
  
  const chartData = {
    labels,
    datasets,
  };
  
  const options = {
    ...baseOptions,
    scales: type !== 'pie' && type !== 'doughnut' ? axisScales : undefined,
  };
  
  const ChartComponent = {
    bar: Bar,
    line: Line,
    pie: Pie,
    doughnut: Doughnut,
  }[type] || Bar;
  
  return (
    <div style={style}>
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}

// Компонент подсказки для типа графика
type ChartTypeHintProps = {
  type: ChartType;
  compact?: boolean;
};

export function ChartTypeHint({ type, compact = false }: ChartTypeHintProps) {
  const info = CHART_TYPE_INFO[type] ?? { name: String(type), icon: '📊', description: '', whenToUse: '', specialValue: '', dataTypes: [] };
  
  if (compact) {
    return (
      <div className="chart-hint-compact" title={`${info.description}\n\nКогда использовать: ${info.whenToUse}`}>
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
          <span key={i} className="chart-hint-tag">{t}</span>
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

export function ChartCreatorModal({ tableHtml, onClose, onInsert }: ChartModalProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('');
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  const [showTypeInfo, setShowTypeInfo] = useState(false);
  const [bins, setBins] = useState(10);
  const [xColumn, setXColumn] = useState(1);
  const [yColumn, setYColumn] = useState(2);
  
  // Классификация данных
  const [variableType, setVariableType] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [subType, setSubType] = useState<DataClassification['subType']>('continuous');
  const [isNormalDistribution, setIsNormalDistribution] = useState<boolean | undefined>(undefined);
  
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
  const classification: DataClassification = { variableType, subType, isNormalDistribution };
  const recommendedTypes = getRecommendedChartTypes(classification);
  const recommendedMethod = getRecommendedStatMethod(classification);
  
  if (!tableData) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <p>Не удалось распарсить таблицу</p>
          <button className="btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    );
  }
  
  const toggleDataColumn = (idx: number) => {
    if (dataColumns.includes(idx)) {
      setDataColumns(dataColumns.filter(c => c !== idx));
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
          График: ${title || CHART_TYPE_INFO[chartType].name}
        </div>
      </div>
    `;
    
    onInsert(chartHtml, chartId);
  };
  
  const allChartTypes: ChartType[] = ['bar', 'histogram', 'stacked', 'pie', 'line', 'boxplot', 'scatter', 'doughnut'];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 900 }} onClick={e => e.stopPropagation()}>
        <div className="row space" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Создать график из таблицы</h3>
          <button className="btn secondary" onClick={onClose}>✕</button>
        </div>
        
        {/* Классификация данных */}
        <div className="card" style={{ marginBottom: 16, padding: 12 }}>
          <div className="row space" style={{ marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>📊 Классификация данных</strong>
            <span className="muted" style={{ fontSize: 11 }}>
              Рекомендуемый метод: {recommendedMethod}
            </span>
          </div>
          <div className="row gap" style={{ flexWrap: 'wrap', gap: 8 }}>
            <select
              value={variableType}
              onChange={e => setVariableType(e.target.value as any)}
              style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
            >
              <option value="quantitative">Количественные</option>
              <option value="qualitative">Качественные</option>
            </select>
            <select
              value={subType}
              onChange={e => setSubType(e.target.value as any)}
              style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
            >
              {variableType === 'quantitative' ? (
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
            {variableType === 'quantitative' && (
              <select
                value={isNormalDistribution === undefined ? '' : isNormalDistribution ? 'yes' : 'no'}
                onChange={e => {
                  if (e.target.value === '') setIsNormalDistribution(undefined);
                  else setIsNormalDistribution(e.target.value === 'yes');
                }}
                style={{ padding: '6px 10px', fontSize: 12, width: 'auto' }}
              >
                <option value="">Распределение неизвестно</option>
                <option value="yes">Нормальное распределение</option>
                <option value="no">Ненормальное распределение</option>
              </select>
            )}
          </div>
          {recommendedTypes.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11 }}>
              <span className="muted">Рекомендуемые графики: </span>
              {recommendedTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setChartType(t)}
                  className={`id-badge ${chartType === t ? 'stats-q3' : ''}`}
                  style={{ cursor: 'pointer', marginRight: 4 }}
                >
                  {CHART_TYPE_INFO[t].icon} {CHART_TYPE_INFO[t].name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="row gap" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
          {/* Настройки */}
          <div style={{ flex: 1 }}>
            <label className="stack" style={{ marginBottom: 12 }}>
              <div className="row space">
                <span>Тип графика</span>
                <button 
                  className="btn secondary" 
                  style={{ padding: '4px 8px', fontSize: 10 }}
                  onClick={() => setShowTypeInfo(!showTypeInfo)}
                >
                  {showTypeInfo ? 'Скрыть подсказки' : '❓ Подсказки'}
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {allChartTypes.map(t => (
                  <button
                    key={t}
                    className={`btn ${chartType === t ? '' : 'secondary'}`}
                    onClick={() => setChartType(t)}
                    style={{ 
                      padding: '6px 10px', 
                      fontSize: 11,
                      border: recommendedTypes.includes(t) ? '2px solid var(--success)' : undefined,
                    }}
                    title={CHART_TYPE_INFO[t].description}
                  >
                    {CHART_TYPE_INFO[t].icon} {t === 'histogram' ? 'Гист.' : 
                       t === 'stacked' ? 'Stacked' : 
                       t === 'boxplot' ? 'Box' : 
                       t === 'scatter' ? 'Scatter' : 
                       t === 'doughnut' ? 'Кольцо' :
                       t === 'bar' ? 'Столбцы' :
                       t === 'line' ? 'Линия' :
                       t === 'pie' ? 'Круг' : t}
                  </button>
                ))}
              </div>
            </label>
            
            {showTypeInfo && (
              <div style={{ marginBottom: 12 }}>
                <ChartTypeHint type={chartType} />
              </div>
            )}
            
            <label className="stack" style={{ marginBottom: 12 }}>
              <span>Заголовок графика</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Необязательно"
              />
            </label>
            
            {chartType === 'scatter' ? (
              <>
                <label className="stack" style={{ marginBottom: 12 }}>
                  <span>Ось X</span>
                  <select
                    value={xColumn}
                    onChange={e => setXColumn(Number(e.target.value))}
                  >
                    {tableData.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
                <label className="stack" style={{ marginBottom: 12 }}>
                  <span>Ось Y</span>
                  <select
                    value={yColumn}
                    onChange={e => setYColumn(Number(e.target.value))}
                  >
                    {tableData.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
              </>
            ) : chartType === 'histogram' ? (
              <>
                <label className="stack" style={{ marginBottom: 12 }}>
                  <span>Колонка данных</span>
                  <select
                    value={dataColumns[0] || 1}
                    onChange={e => setDataColumns([Number(e.target.value)])}
                  >
                    {tableData.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
                <label className="stack" style={{ marginBottom: 12 }}>
                  <span>Количество интервалов (bins): {bins}</span>
                  <input
                    type="range"
                    min={3}
                    max={20}
                    value={bins}
                    onChange={e => setBins(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="stack" style={{ marginBottom: 12 }}>
                  <span>Колонка меток (X)</span>
                  <select
                    value={labelColumn}
                    onChange={e => setLabelColumn(Number(e.target.value))}
                  >
                    {tableData.headers.map((h, i) => (
                      <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                    ))}
                  </select>
                </label>
                
                <div style={{ marginBottom: 12 }}>
                  <span className="muted">Колонки данных (Y)</span>
                  <div className="row gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {tableData.headers.map((h, i) => (
                      i !== labelColumn && (
                        <label key={i} className="row gap" style={{ alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={dataColumns.includes(i)}
                            onChange={() => toggleDataColumn(i)}
                            style={{ width: 'auto' }}
                          />
                          <span style={{ fontSize: 13 }}>{h || `Колонка ${i + 1}`}</span>
                        </label>
                      )
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Превью */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>Предпросмотр:</div>
            {(chartType === 'scatter' || chartType === 'histogram' || dataColumns.length > 0) ? (
              <ChartFromTable tableData={tableData} config={config} height={280} />
            ) : (
              <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                Выберите хотя бы одну колонку данных
              </div>
            )}
          </div>
        </div>
        
        <div className="row gap">
          <button
            className="btn"
            onClick={handleInsert}
            disabled={chartType !== 'scatter' && chartType !== 'histogram' && dataColumns.length === 0}
          >
            Вставить график
          </button>
          <button className="btn secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
