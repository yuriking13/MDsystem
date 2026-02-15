import React, { useEffect, useRef, useState, useCallback } from "react";
import { Modal, Button } from "flowbite-react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import "./TabulatorModal.css";

export type TableEditorPayload = {
  data: string[][];
  colWidths?: number[];
  rowHeights?: Array<number | null>;
  statisticId?: string | null;
};

interface TableEditorModalProps {
  open: boolean;
  initialData: string[][];
  initialColWidths?: number[];
  initialRowHeights?: Array<number | null>;
  onClose: () => void;
  onSave: (payload: TableEditorPayload) => void;
}

// Helper to build column definitions for Tabulator
const buildColumns = (cols: number, widths?: number[]) => {
  const columns: any[] = [
    {
      title: "#",
      field: "_rowNum",
      formatter: "rownum",
      headerSort: false,
      resizable: false,
      width: 40,
      cssClass: "row-number-col",
      editor: false as any,
      frozen: true,
    },
  ];
  for (let i = 0; i < cols; i++) {
    columns.push({
      title: `Колонка ${i + 1}`,
      field: `c${i}`,
      editor: "input",
      headerSort: false,
      resizable: true,
      minWidth: 50,
      width: widths?.[i],
    });
  }
  return columns;
};

// Convert 2D array to tabulator row objects
const dataToRows = (data: string[][], cols: number) => {
  return data.map((row, idx) => {
    const obj: Record<string, any> = { id: idx };
    for (let c = 0; c < cols; c++) {
      obj[`c${c}`] = row[c] ?? "";
    }
    return obj;
  });
};

// Convert tabulator rows back to 2D array
const rowsToData = (rows: any[], cols: number) => {
  return rows.map((rowObj) => {
    const arr: string[] = [];
    for (let c = 0; c < cols; c++) {
      arr.push(rowObj[`c${c}`] ?? "");
    }
    return arr;
  });
};

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
  open,
  initialData,
  initialColWidths,
  initialRowHeights,
  onClose,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<any | null>(null);
  const [columnsCount, setColumnsCount] = useState<number>(0);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
  const [selectedRowHeight, setSelectedRowHeight] = useState<number>(30);
  const ModalAny = Modal as any;
  const ModalHeader = ModalAny?.Header || ((props: any) => <div {...props} />);
  const ModalBody = ModalAny?.Body || ((props: any) => <div {...props} />);
  const ModalFooter = ModalAny?.Footer || ((props: any) => <div {...props} />);

  // Apply height to a specific row
  const applyRowHeight = useCallback((rowIdx: number, height: number) => {
    const table = tableRef.current;
    if (!table) return;
    const safeHeight = Math.max(10, Math.min(500, height));
    const rows = table.getRows();
    const row = rows[rowIdx];
    if (row) {
      const el = row.getElement();
      if (el) {
        el.style.height = `${safeHeight}px`;
        el.style.minHeight = `${safeHeight}px`;
      }
    }
  }, []);

  // Handle row height change from input
  const handleRowHeightChange = useCallback(
    (height: number) => {
      if (selectedRowIdx === null) return;
      const safeHeight = Math.max(10, Math.min(500, height));
      setSelectedRowHeight(safeHeight);
      applyRowHeight(selectedRowIdx, safeHeight);
    },
    [selectedRowIdx, applyRowHeight],
  );

  // Get height of a row element
  const getRowHeight = useCallback((rowIdx: number): number => {
    const table = tableRef.current;
    if (!table) return 30;
    const rows = table.getRows();
    const row = rows[rowIdx];
    if (row) {
      const el = row.getElement();
      if (el) return el.offsetHeight || 30;
    }
    return 30;
  }, []);

  // Select row by clicking on it
  const selectRow = useCallback(
    (rowIdx: number) => {
      const table = tableRef.current;
      if (!table) return;
      const rows = table.getRows();
      rows.forEach((r: any, idx: number) => {
        const el = r.getElement();
        if (el) {
          if (idx === rowIdx) {
            el.style.outline = "2px solid #3b82f6";
            el.style.outlineOffset = "-2px";
          } else {
            el.style.outline = "";
            el.style.outlineOffset = "";
          }
        }
      });
      setSelectedRowIdx(rowIdx);
      // Read actual height from DOM after a tick
      setTimeout(() => {
        setSelectedRowHeight(getRowHeight(rowIdx));
      }, 10);
    },
    [getRowHeight],
  );

  // Initialize table on open
  useEffect(() => {
    if (!open) {
      if (tableRef.current) {
        tableRef.current.destroy();
        tableRef.current = null;
      }
      setSelectedRowIdx(null);
      return;
    }

    const cols = Math.max(
      1,
      initialData.reduce((max, row) => Math.max(max, row.length), 0),
    );
    setColumnsCount(cols);

    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const table = new Tabulator(containerRef.current, {
        data: dataToRows(initialData, cols),
        columns: buildColumns(cols, initialColWidths),
        layout: "fitColumns",
        reactiveData: false,
        selectable: false,
        columnDefaults: {
          editor: "input",
          resizable: true,
          minWidth: 50,
        },
      }) as any;

      table.on("tableBuilt", () => {
        // Apply initial row heights
        if (initialRowHeights && initialRowHeights.length > 0) {
          const rows = table.getRows();
          initialRowHeights.forEach((h, idx) => {
            if (typeof h === "number" && h >= 10 && rows[idx]) {
              const el = rows[idx].getElement();
              if (el) {
                const safeHeight = Math.max(10, Math.min(500, Math.round(h)));
                el.style.height = `${safeHeight}px`;
                el.style.minHeight = `${safeHeight}px`;
                try {
                  rows[idx].revalidate?.();
                } catch (err) {
                  // revalidate may not exist in older Tabulator versions
                }
              }
            }
          });
        }

        // Add row click handlers for selection
        const rows = table.getRows();
        rows.forEach((_: any, idx: number) => {
          const el = rows[idx].getElement();
          if (el) {
            el.style.cursor = "pointer";
          }
        });
      });

      // Row click to select (use both rowClick and cellClick for reliability)
      const handleRowSelect = (row: any) => {
        const rows = table.getRows();
        const idx = rows.indexOf(row);
        if (idx >= 0) {
          selectRow(idx);
        }
      };
      table.on("rowClick", (_e: any, row: any) => handleRowSelect(row));
      table.on("cellClick", (_e: any, cell: any) => {
        const row = cell.getRow();
        if (row) handleRowSelect(row);
      });

      tableRef.current = table;
    }, 50);

    return () => clearTimeout(timer);
  }, [open]);

  const handleAddRow = () => {
    const table = tableRef.current;
    if (!table) return;
    const cols = columnsCount;
    const rowObj: Record<string, any> = { id: Date.now() };
    for (let c = 0; c < cols; c++) {
      rowObj[`c${c}`] = "";
    }
    table.addRow(rowObj, false);
  };

  const handleDeleteRow = () => {
    if (selectedRowIdx === null) return;
    const table = tableRef.current;
    if (!table) return;
    const rows = table.getRows();
    if (rows.length <= 1) {
      alert("Нельзя удалить последнюю строку");
      return;
    }
    const row = rows[selectedRowIdx];
    if (row) {
      row.delete();
      setSelectedRowIdx(null);
    }
  };

  const handleAddColumn = () => {
    const table = tableRef.current;
    if (!table) return;
    const newIndex = columnsCount;
    const field = `c${newIndex}`;
    const colDef = {
      title: `Колонка ${newIndex + 1}`,
      field,
      editor: "input",
      resizable: true,
      minWidth: 50,
    } as any;
    table.addColumn(colDef, false, undefined, undefined, true);
    table.getData().forEach((row: any) => {
      row[field] = row[field] ?? "";
    });
    setColumnsCount(newIndex + 1);
  };

  const handleSetAllRowHeights = () => {
    const heightStr = prompt(
      "Введите высоту для всех строк (10-500 px):",
      "30",
    );
    if (!heightStr) return;
    const height = Math.max(10, Math.min(500, Number(heightStr)));
    if (isNaN(height)) return;
    const table = tableRef.current;
    if (!table) return;
    const rows = table.getRows();
    rows.forEach((_: any, idx: number) => {
      applyRowHeight(idx, height);
    });
    if (selectedRowIdx !== null) {
      setSelectedRowHeight(height);
    }
  };

  const handleResetAllRowHeights = () => {
    const table = tableRef.current;
    if (!table) return;
    const rows = table.getRows();
    rows.forEach((row: any) => {
      const el = row.getElement();
      if (el) {
        el.style.height = "";
        el.style.minHeight = "";
      }
    });
    if (selectedRowIdx !== null) {
      setTimeout(() => {
        setSelectedRowHeight(getRowHeight(selectedRowIdx));
      }, 10);
    }
  };

  const handleSave = () => {
    const table = tableRef.current;
    if (!table) return;
    const cols = columnsCount;
    const rows = table.getData();
    const data = rowsToData(rows, cols);
    const colDefs = table.getColumns();
    // Skip the first "#" row-number column
    const colWidths = colDefs.slice(1).map((c: any) => c.getWidth());

    // Get row heights from DOM
    const tabulatorRows = table.getRows();
    const rowHeights = tabulatorRows.map((row: any) => {
      const el = row.getElement();
      if (!el) return 30;

      // Priority 1: Use explicitly set inline style (most reliable)
      const styleHeight = el.style.height;
      if (styleHeight) {
        const parsed = parseInt(styleHeight, 10);
        if (!Number.isNaN(parsed) && parsed >= 10) {
          return Math.max(10, Math.min(500, parsed));
        }
      }

      // Priority 2: Fall back to offsetHeight if style not set
      const offsetHeight = el.offsetHeight;
      if (offsetHeight && offsetHeight >= 10) {
        return Math.max(10, Math.min(500, Math.round(offsetHeight)));
      }

      // Fallback: return default only if nothing is set
      return 30;
    });

    onSave({ data, colWidths, rowHeights });
  };

  return (
    <Modal
      show={open}
      size="6xl"
      dismissible
      onClose={onClose}
      className="tabulator-modal"
    >
      <ModalHeader>Редактирование таблицы</ModalHeader>
      <ModalBody>
        <div className="tabulator-controls">
          <div className="tabulator-buttons">
            <Button size="sm" color="gray" onClick={handleAddRow}>
              + Строка
            </Button>
            <Button size="sm" color="gray" onClick={handleAddColumn}>
              + Колонка
            </Button>
            {selectedRowIdx !== null && (
              <Button size="sm" color="failure" onClick={handleDeleteRow}>
                ✕ Удалить строку {selectedRowIdx + 1}
              </Button>
            )}
          </div>
        </div>

        {/* Row height controls */}
        <div className="tabulator-row-height-controls">
          <span className="tabulator-row-height-label">Высота строки:</span>
          {selectedRowIdx !== null ? (
            <>
              <span className="tabulator-row-height-selected-label">
                Строка {selectedRowIdx + 1}
              </span>
              <input
                type="number"
                min="10"
                max="500"
                step="5"
                value={selectedRowHeight}
                onChange={(e) => handleRowHeightChange(Number(e.target.value))}
                className="tabulator-row-height-input"
              />
              <span className="tabulator-row-height-unit">px</span>
              <input
                type="range"
                min="10"
                max="300"
                value={selectedRowHeight}
                onChange={(e) => handleRowHeightChange(Number(e.target.value))}
                className="tabulator-row-height-range"
              />
            </>
          ) : (
            <span className="tabulator-row-height-hint">
              Кликните на строку для выбора
            </span>
          )}
          <div className="tabulator-row-height-actions">
            <Button size="xs" color="gray" onClick={handleSetAllRowHeights}>
              Всем строкам
            </Button>
            <Button size="xs" color="gray" onClick={handleResetAllRowHeights}>
              Сбросить всё
            </Button>
          </div>
        </div>

        <div className="tabulator-container" ref={containerRef} />
        <p className="tabulator-row-height-footnote">
          💡 Кликните на строку чтобы выбрать её и изменить высоту.
          Перетаскивайте границы колонок для изменения ширины.
        </p>
      </ModalBody>
      <ModalFooter>
        <Button color="light" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleSave}>Сохранить</Button>
      </ModalFooter>
    </Modal>
  );
};

export default TableEditorModal;
