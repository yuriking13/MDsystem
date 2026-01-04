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
} from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';

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
  Legend
);

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

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

export default function ChartFromTable({ tableData, config, width, height }: Props) {
  const { type, title, labelColumn, dataColumns, colors = DEFAULT_COLORS } = config;
  
  // Извлекаем метки из указанной колонки
  const labels = tableData.rows.map(row => row[labelColumn] || '');
  
  // Извлекаем данные из указанных колонок
  const datasets = dataColumns.map((colIdx, i) => {
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
    };
  });
  
  const chartData = {
    labels,
    datasets,
  };
  
  const options = {
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
    scales: type !== 'pie' && type !== 'doughnut' ? {
      x: {
        ticks: { color: '#a9b7da' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        ticks: { color: '#a9b7da' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
    } : undefined,
  };
  
  const style = {
    width: width || '100%',
    height: height || 300,
  };
  
  const ChartComponent = {
    bar: Bar,
    line: Line,
    pie: Pie,
    doughnut: Doughnut,
  }[type];
  
  return (
    <div style={style}>
      <ChartComponent data={chartData} options={options} />
    </div>
  );
}

// Модальное окно для создания графика
type ChartModalProps = {
  tableHtml: string;
  onClose: () => void;
  onInsert: (chartHtml: string) => void;
};

export function ChartCreatorModal({ tableHtml, onClose, onInsert }: ChartModalProps) {
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [title, setTitle] = useState('');
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  
  useEffect(() => {
    const data = parseTableFromHTML(tableHtml);
    setTableData(data);
    if (data && data.headers.length > 1) {
      setDataColumns([1]);
    }
  }, [tableHtml]);
  
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
  };
  
  const handleInsert = () => {
    // Генерируем HTML с данными для графика
    const chartDataJson = JSON.stringify({
      tableData,
      config,
    });
    
    const chartHtml = `
      <div class="chart-container" data-chart='${chartDataJson.replace(/'/g, "&#39;")}'>
        <div class="chart-placeholder">
          📊 График: ${title || chartType}
        </div>
      </div>
    `;
    
    onInsert(chartHtml);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
        <div className="row space" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Создать график из таблицы</h3>
          <button className="btn secondary" onClick={onClose}>✕</button>
        </div>
        
        <div className="row gap" style={{ marginBottom: 16 }}>
          {/* Настройки */}
          <div style={{ flex: 1 }}>
            <label className="stack" style={{ marginBottom: 12 }}>
              <span>Тип графика</span>
              <div className="row gap">
                {(['bar', 'line', 'pie', 'doughnut'] as ChartType[]).map(t => (
                  <button
                    key={t}
                    className={`btn ${chartType === t ? '' : 'secondary'}`}
                    onClick={() => setChartType(t)}
                    style={{ padding: '6px 12px', fontSize: 12 }}
                  >
                    {t === 'bar' && '📊 Столбцы'}
                    {t === 'line' && '📈 Линия'}
                    {t === 'pie' && '🥧 Круговая'}
                    {t === 'doughnut' && '🍩 Кольцо'}
                  </button>
                ))}
              </div>
            </label>
            
            <label className="stack" style={{ marginBottom: 12 }}>
              <span>Заголовок графика</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Необязательно"
              />
            </label>
            
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
          </div>
          
          {/* Превью */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>Предпросмотр:</div>
            {dataColumns.length > 0 ? (
              <ChartFromTable tableData={tableData} config={config} height={250} />
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
            disabled={dataColumns.length === 0}
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
