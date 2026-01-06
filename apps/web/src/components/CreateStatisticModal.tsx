import React, { useState } from 'react';
import ChartFromTable, { 
  CHART_TYPE_INFO, 
  type ChartType, 
  type ChartConfig,
  type TableData,
  type DataClassification,
  getRecommendedChartTypes,
  getRecommendedStatMethod,
} from './ChartFromTable';
import { apiCreateStatistic, type ProjectStatistic } from '../lib/api';

type Props = {
  projectId: string;
  onClose: () => void;
  onCreated: (statistic: ProjectStatistic) => void;
};

const DEFAULT_TABLE_DATA: TableData = {
  headers: ['Категория', 'Значение'],
  rows: [
    ['Группа 1', '10'],
    ['Группа 2', '25'],
    ['Группа 3', '15'],
  ],
};

export default function CreateStatisticModal({ projectId, onClose, onCreated }: Props) {
  const [title, setTitle] = useState('Новый график');
  const [description, setDescription] = useState('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [tableData, setTableData] = useState<TableData>(DEFAULT_TABLE_DATA);
  const [labelColumn, setLabelColumn] = useState(0);
  const [dataColumns, setDataColumns] = useState<number[]>([1]);
  const [bins, setBins] = useState(10);
  const [xColumn, setXColumn] = useState(0);
  const [yColumn, setYColumn] = useState(1);
  
  // Data classification
  const [variableType, setVariableType] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [subType, setSubType] = useState<DataClassification['subType']>('continuous');
  const [isNormalDistribution, setIsNormalDistribution] = useState<boolean | undefined>(undefined);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'chart' | 'classification'>('table');

  const classification: DataClassification = { variableType, subType, isNormalDistribution };
  const recommendedTypes = getRecommendedChartTypes(classification);
  const recommendedMethod = getRecommendedStatMethod(classification);

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

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newData = { ...tableData };
    newData.rows = [...newData.rows];
    newData.rows[rowIdx] = [...newData.rows[rowIdx]];
    newData.rows[rowIdx][colIdx] = value;
    setTableData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    const newData = { ...tableData };
    newData.headers = [...newData.headers];
    newData.headers[colIdx] = value;
    setTableData(newData);
  };

  const addRow = () => {
    const newRow = new Array(tableData.headers.length).fill('');
    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (tableData.rows.length <= 1) return;
    setTableData({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIdx),
    });
  };

  const addColumn = () => {
    setTableData({
      headers: [...tableData.headers, `Колонка ${tableData.headers.length + 1}`],
      rows: tableData.rows.map(row => [...row, '']),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (tableData.headers.length <= 2) return;
    setTableData({
      headers: tableData.headers.filter((_, i) => i !== colIdx),
      rows: tableData.rows.map(row => row.filter((_, i) => i !== colIdx)),
    });
    // Update column references
    if (labelColumn >= colIdx) {
      setLabelColumn(Math.max(0, labelColumn - 1));
    }
    setDataColumns(dataColumns.filter(c => c !== colIdx).map(c => c > colIdx ? c - 1 : c));
  };

  const toggleDataColumn = (idx: number) => {
    if (dataColumns.includes(idx)) {
      setDataColumns(dataColumns.filter(c => c !== idx));
    } else {
      setDataColumns([...dataColumns, idx]);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Введите название');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const result = await apiCreateStatistic(projectId, {
        type: 'chart',
        title: title.trim(),
        description: description.trim() || undefined,
        config: {
          type: chartType,
          title: title.trim(),
          labelColumn,
          dataColumns,
          bins,
          xColumn,
          yColumn,
          dataClassification: classification,
        },
        tableData,
        dataClassification: classification,
        chartType,
      });
      
      onCreated(result.statistic);
    } catch (err: any) {
      setError(err?.message || 'Ошибка создания');
    } finally {
      setSaving(false);
    }
  };

  const allChartTypes: ChartType[] = ['bar', 'histogram', 'stacked', 'pie', 'line', 'boxplot', 'scatter', 'doughnut'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal statistic-edit-modal" style={{ maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
        <div className="row space" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>➕ Создать таблицу и график</h3>
          <button className="btn secondary" onClick={onClose}>✕</button>
        </div>
        
        {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button 
            className={`tab ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            1️⃣ Ввод данных
          </button>
          <button 
            className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            2️⃣ Тип графика
          </button>
          <button 
            className={`tab ${activeTab === 'classification' ? 'active' : ''}`}
            onClick={() => setActiveTab('classification')}
          >
            3️⃣ Классификация
          </button>
        </div>

        {/* Step 1: Table Data */}
        {activeTab === 'table' && (
          <div>
            <div className="row gap" style={{ marginBottom: 16 }}>
              <label className="stack" style={{ flex: 1 }}>
                <span>Название графика</span>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Например: Распределение по возрасту"
                />
              </label>
            </div>
            
            <div className="row space" style={{ marginBottom: 12 }}>
              <span className="muted">
                📋 Таблица данных: {tableData.rows.length} строк × {tableData.headers.length} колонок
              </span>
              <div className="row gap">
                <button 
                  className="btn secondary" 
                  onClick={addColumn}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  + Колонка
                </button>
                <button 
                  className="btn secondary" 
                  onClick={addRow}
                  style={{ padding: '6px 12px', fontSize: 12 }}
                >
                  + Строка
                </button>
              </div>
            </div>

            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              <table className="chart-source-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>#</th>
                    {tableData.headers.map((h, i) => (
                      <th key={i}>
                        <div className="row gap" style={{ alignItems: 'center' }}>
                          <input
                            type="text"
                            value={h}
                            onChange={e => handleHeaderChange(i, e.target.value)}
                            className="chart-data-input header-input"
                            style={{ flex: 1 }}
                          />
                          {tableData.headers.length > 2 && (
                            <button
                              className="btn secondary"
                              onClick={() => removeColumn(i)}
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              title="Удалить колонку"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ textAlign: 'center' }}>
                        <div className="row gap" style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <span className="muted">{ri + 1}</span>
                          {tableData.rows.length > 1 && (
                            <button
                              className="btn secondary"
                              onClick={() => removeRow(ri)}
                              style={{ padding: '1px 4px', fontSize: 9 }}
                              title="Удалить строку"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      {row.map((cell, ci) => (
                        <td key={ci}>
                          <input
                            type="text"
                            value={cell}
                            onChange={e => handleCellChange(ri, ci, e.target.value)}
                            className="chart-data-input"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="card" style={{ marginTop: 16, padding: 12 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                💡 Введите данные в таблицу, затем перейдите к выбору типа графика
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Chart Type */}
        {activeTab === 'chart' && (
          <div className="row gap" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 16 }}>
                <span className="muted" style={{ display: 'block', marginBottom: 8 }}>Выберите тип графика</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allChartTypes.map(t => {
                    const info = CHART_TYPE_INFO[t] ?? { name: String(t), icon: '📊', description: '' };
                    return (
                      <button
                        key={t}
                        className={`btn ${chartType === t ? '' : 'secondary'}`}
                        onClick={() => setChartType(t)}
                        style={{ 
                          padding: '8px 12px', 
                          fontSize: 12,
                          border: recommendedTypes.includes(t) ? '2px solid var(--success)' : undefined,
                        }}
                        title={info.description}
                      >
                        {info.icon} {info.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {chartType === 'scatter' ? (
                <>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Ось X (горизонтальная)</span>
                    <select value={xColumn} onChange={e => setXColumn(Number(e.target.value))}>
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Ось Y (вертикальная)</span>
                    <select value={yColumn} onChange={e => setYColumn(Number(e.target.value))}>
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : chartType === 'histogram' ? (
                <>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Колонка с данными для гистограммы</span>
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
                    <span>Количество интервалов: {bins}</span>
                    <input
                      type="range"
                      min={3}
                      max={20}
                      value={bins}
                      onChange={e => setBins(Number(e.target.value))}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Колонка меток (подписи на оси X)</span>
                    <select value={labelColumn} onChange={e => setLabelColumn(Number(e.target.value))}>
                      {tableData.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ marginBottom: 12 }}>
                    <span className="muted">Колонки с данными (значения на оси Y)</span>
                    <div className="row gap" style={{ marginTop: 8, flexWrap: 'wrap' }}>
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

            {/* Preview */}
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
              <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>Предпросмотр:</div>
              {(chartType === 'scatter' || chartType === 'histogram' || dataColumns.length > 0) ? (
                <ChartFromTable tableData={tableData} config={config} height={280} />
              ) : (
                <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                  Выберите колонки с данными
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Classification */}
        {activeTab === 'classification' && (
          <div>
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div className="row space" style={{ marginBottom: 12 }}>
                <strong style={{ fontSize: 14 }}>🔬 Классификация данных</strong>
                <span className="muted" style={{ fontSize: 12 }}>
                  Рекомендуемый метод: {recommendedMethod}
                </span>
              </div>
              
              <div className="row gap" style={{ flexWrap: 'wrap', gap: 16 }}>
                <label className="stack" style={{ minWidth: 200 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Тип переменной</span>
                  <select
                    value={variableType}
                    onChange={e => setVariableType(e.target.value as any)}
                  >
                    <option value="quantitative">Количественные</option>
                    <option value="qualitative">Качественные</option>
                  </select>
                </label>
                
                <label className="stack" style={{ minWidth: 200 }}>
                  <span className="muted" style={{ fontSize: 12 }}>Подтип</span>
                  <select
                    value={subType}
                    onChange={e => setSubType(e.target.value as any)}
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
                </label>
                
                {variableType === 'quantitative' && (
                  <label className="stack" style={{ minWidth: 200 }}>
                    <span className="muted" style={{ fontSize: 12 }}>Распределение</span>
                    <select
                      value={isNormalDistribution === undefined ? '' : isNormalDistribution ? 'yes' : 'no'}
                      onChange={e => {
                        if (e.target.value === '') setIsNormalDistribution(undefined);
                        else setIsNormalDistribution(e.target.value === 'yes');
                      }}
                    >
                      <option value="">Неизвестно</option>
                      <option value="yes">Нормальное</option>
                      <option value="no">Ненормальное</option>
                    </select>
                  </label>
                )}
              </div>
            </div>
            
            <label className="stack" style={{ marginBottom: 16 }}>
              <span>Описание (необязательно)</span>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Описание графика или метода анализа..."
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </label>

            {/* Explanation cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: 13 }}>📊 Количественные данные</h5>
                <p className="muted" style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  <strong>Непрерывные:</strong> возраст, рост, вес, давление<br/>
                  <strong>Дискретные:</strong> количество детей, число визитов
                </p>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: 13 }}>🏷️ Качественные данные</h5>
                <p className="muted" style={{ fontSize: 11, margin: 0, lineHeight: 1.5 }}>
                  <strong>Номинальные:</strong> группа крови, пол<br/>
                  <strong>Дихотомические:</strong> да/нет, жив/умер<br/>
                  <strong>Порядковые:</strong> степень тяжести
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="row space" style={{ marginTop: 20 }}>
          <div className="row gap">
            {activeTab !== 'table' && (
              <button
                className="btn secondary"
                onClick={() => setActiveTab(activeTab === 'classification' ? 'chart' : 'table')}
              >
                ← Назад
              </button>
            )}
            {activeTab !== 'classification' && (
              <button
                className="btn secondary"
                onClick={() => setActiveTab(activeTab === 'table' ? 'chart' : 'classification')}
              >
                Далее →
              </button>
            )}
          </div>
          <div className="row gap">
            <button className="btn secondary" onClick={onClose}>
              Отмена
            </button>
            <button
              className="btn"
              onClick={handleCreate}
              disabled={saving || !title.trim()}
            >
              {saving ? '⏳ Создание...' : '✅ Создать график'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
