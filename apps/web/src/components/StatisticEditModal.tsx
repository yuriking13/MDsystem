import React, { useState, useEffect } from 'react';
import ChartFromTable, { 
  CHART_TYPE_INFO, 
  type ChartType, 
  type ChartConfig,
  type TableData,
  type DataClassification,
  getRecommendedChartTypes,
  getRecommendedStatMethod,
} from './ChartFromTable';
import { type ProjectStatistic } from '../lib/api';

type Props = {
  statistic: ProjectStatistic;
  onClose: () => void;
  onSave: (updates: {
    title?: string;
    description?: string;
    config?: Record<string, any>;
    tableData?: Record<string, any>;
    dataClassification?: DataClassification;
    chartType?: string;
  }) => Promise<void>;
};

export default function StatisticEditModal({ statistic, onClose, onSave }: Props) {
  const [title, setTitle] = useState(statistic.title);
  const [description, setDescription] = useState(statistic.description || '');
  const [chartType, setChartType] = useState<ChartType>(
    (statistic.chart_type as ChartType) || 'bar'
  );
  const [tableData, setTableData] = useState<TableData | null>(
    statistic.table_data as TableData | null
  );
  const [labelColumn, setLabelColumn] = useState(
    (statistic.config as ChartConfig)?.labelColumn ?? 0
  );
  const [dataColumns, setDataColumns] = useState<number[]>(
    (statistic.config as ChartConfig)?.dataColumns ?? [1]
  );
  const [bins, setBins] = useState(
    (statistic.config as ChartConfig)?.bins ?? 10
  );
  const [xColumn, setXColumn] = useState(
    (statistic.config as ChartConfig)?.xColumn ?? 1
  );
  const [yColumn, setYColumn] = useState(
    (statistic.config as ChartConfig)?.yColumn ?? 2
  );
  
  // Data classification
  const [variableType, setVariableType] = useState<'quantitative' | 'qualitative'>(
    statistic.data_classification?.variableType ?? 'quantitative'
  );
  const [subType, setSubType] = useState<DataClassification['subType']>(
    statistic.data_classification?.subType ?? 'continuous'
  );
  const [isNormalDistribution, setIsNormalDistribution] = useState<boolean | undefined>(
    statistic.data_classification?.isNormalDistribution
  );
  
  const [saving, setSaving] = useState(false);
  const [editingData, setEditingData] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'classification'>('chart');

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
    if (!tableData) return;
    const newData = { ...tableData };
    newData.rows = [...newData.rows];
    newData.rows[rowIdx] = [...newData.rows[rowIdx]];
    newData.rows[rowIdx][colIdx] = value;
    setTableData(newData);
  };

  const handleHeaderChange = (colIdx: number, value: string) => {
    if (!tableData) return;
    const newData = { ...tableData };
    newData.headers = [...newData.headers];
    newData.headers[colIdx] = value;
    setTableData(newData);
  };

  const addRow = () => {
    if (!tableData) return;
    const newRow = new Array(tableData.headers.length).fill('');
    setTableData({
      ...tableData,
      rows: [...tableData.rows, newRow],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (!tableData || tableData.rows.length <= 1) return;
    setTableData({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIdx),
    });
  };

  const addColumn = () => {
    if (!tableData) return;
    setTableData({
      headers: [...tableData.headers, `Колонка ${tableData.headers.length + 1}`],
      rows: tableData.rows.map(row => [...row, '']),
    });
  };

  const removeColumn = (colIdx: number) => {
    if (!tableData || tableData.headers.length <= 2) return;
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        title,
        description: description || undefined,
        config: {
          type: chartType,
          title,
          labelColumn,
          dataColumns,
          bins,
          xColumn,
          yColumn,
          dataClassification: classification,
        },
        tableData: tableData || undefined,
        dataClassification: classification,
        chartType,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save statistic:', err);
    } finally {
      setSaving(false);
    }
  };

  const allChartTypes: ChartType[] = ['bar', 'histogram', 'stacked', 'pie', 'line', 'boxplot', 'scatter', 'doughnut'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal statistic-edit-modal" style={{ maxWidth: 1000 }} onClick={e => e.stopPropagation()}>
        <div className="row space" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>
            {statistic.type === 'chart' ? '📊 Редактировать график' : '📋 Редактировать таблицу'}
          </h3>
          <button className="btn secondary" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button 
            className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
            onClick={() => setActiveTab('chart')}
          >
            📈 Тип графика
          </button>
          <button 
            className={`tab ${activeTab === 'table' ? 'active' : ''}`}
            onClick={() => setActiveTab('table')}
          >
            📋 Данные таблицы
          </button>
          <button 
            className={`tab ${activeTab === 'classification' ? 'active' : ''}`}
            onClick={() => setActiveTab('classification')}
          >
            🔬 Классификация
          </button>
        </div>

        {/* Chart Type Tab */}
        {activeTab === 'chart' && (
          <div className="row gap" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label className="stack" style={{ marginBottom: 12 }}>
                <span>Заголовок</span>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Название графика"
                />
              </label>

              <label className="stack" style={{ marginBottom: 12 }}>
                <span>Описание</span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Необязательное описание..."
                  rows={2}
                  style={{ resize: 'vertical' }}
                />
              </label>

              <div style={{ marginBottom: 12 }}>
                <span className="muted" style={{ display: 'block', marginBottom: 8 }}>Тип графика</span>
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
                      {CHART_TYPE_INFO[t].icon} {CHART_TYPE_INFO[t].name.length > 12 
                        ? CHART_TYPE_INFO[t].name.slice(0, 10) + '...' 
                        : CHART_TYPE_INFO[t].name}
                    </button>
                  ))}
                </div>
              </div>

              {chartType === 'scatter' ? (
                <>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Ось X</span>
                    <select value={xColumn} onChange={e => setXColumn(Number(e.target.value))}>
                      {tableData?.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Ось Y</span>
                    <select value={yColumn} onChange={e => setYColumn(Number(e.target.value))}>
                      {tableData?.headers.map((h, i) => (
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
                      {tableData?.headers.map((h, i) => (
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
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="stack" style={{ marginBottom: 12 }}>
                    <span>Колонка меток (X)</span>
                    <select value={labelColumn} onChange={e => setLabelColumn(Number(e.target.value))}>
                      {tableData?.headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Колонка ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ marginBottom: 12 }}>
                    <span className="muted">Колонки данных (Y)</span>
                    <div className="row gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {tableData?.headers.map((h, i) => (
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
              {tableData && (chartType === 'scatter' || chartType === 'histogram' || dataColumns.length > 0) ? (
                <ChartFromTable tableData={tableData} config={config} height={280} />
              ) : (
                <div className="muted" style={{ textAlign: 'center', padding: 40 }}>
                  Выберите колонки данных
                </div>
              )}
            </div>
          </div>
        )}

        {/* Table Data Tab */}
        {activeTab === 'table' && tableData && (
          <div>
            <div className="row space" style={{ marginBottom: 12 }}>
              <span className="muted">
                {tableData.rows.length} строк × {tableData.headers.length} колонок
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

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="chart-source-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    {tableData.headers.map((h: string, i: number) => (
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
                  {tableData.rows.map((row: string[], ri: number) => (
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
                      {row.map((cell: string, ci: number) => (
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
                💡 Подсказка: Изменения в таблице автоматически отразятся на графике
              </div>
            </div>
          </div>
        )}

        {/* Classification Tab */}
        {activeTab === 'classification' && (
          <div>
            <div className="card" style={{ padding: 12, marginBottom: 16 }}>
              <div className="row space" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 13 }}>📊 Классификация данных</strong>
                <span className="muted" style={{ fontSize: 11 }}>
                  Рекомендуемый метод: {recommendedMethod}
                </span>
              </div>
              
              <div className="row gap" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <label className="stack" style={{ minWidth: 200 }}>
                  <span className="muted" style={{ fontSize: 11 }}>Тип переменной</span>
                  <select
                    value={variableType}
                    onChange={e => setVariableType(e.target.value as any)}
                  >
                    <option value="quantitative">Количественные</option>
                    <option value="qualitative">Качественные</option>
                  </select>
                </label>
                
                <label className="stack" style={{ minWidth: 200 }}>
                  <span className="muted" style={{ fontSize: 11 }}>Подтип</span>
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
                    <span className="muted" style={{ fontSize: 11 }}>Распределение</span>
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

              {recommendedTypes.length > 0 && (
                <div>
                  <span className="muted" style={{ fontSize: 11 }}>Рекомендуемые типы графиков: </span>
                  <div className="row gap" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                    {recommendedTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => {
                          setChartType(t);
                          setActiveTab('chart');
                        }}
                        className={`id-badge ${chartType === t ? 'stats-q3' : ''}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {CHART_TYPE_INFO[t].icon} {CHART_TYPE_INFO[t].name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  <strong>Порядковые:</strong> степень тяжести, стадия заболевания
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="row gap" style={{ marginTop: 20 }}>
          <button
            className="btn"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? '⏳ Сохранение...' : '💾 Сохранить изменения'}
          </button>
          <button className="btn secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
