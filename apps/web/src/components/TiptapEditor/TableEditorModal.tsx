import React, { useEffect, useRef, useState } from "react";
import { Modal, Button } from "flowbite-react";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import "./TabulatorModal.css";

export type TableEditorPayload = {
  data: string[][];
  colWidths?: number[];
  rowHeights?: number[];
  statisticId?: string | null;
};

interface TableEditorModalProps {
  open: boolean;
  initialData: string[][];
  initialColWidths?: number[];
  initialRowHeights?: number[];
  onClose: () => void;
  onSave: (payload: TableEditorPayload) => void;
}

// Helper to build column definitions for Tabulator
const buildColumns = (cols: number, widths?: number[]) => {
  const columns: any[] = [];
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
  const ModalAny = Modal as any;
  const ModalHeader = ModalAny?.Header || ((props: any) => <div {...props} />);
  const ModalBody = ModalAny?.Body || ((props: any) => <div {...props} />);
  const ModalFooter = ModalAny?.Footer || ((props: any) => <div {...props} />);

  // Handle row height change
  const handleRowHeightChange = (height: number) => {
    const table = tableRef.current;
    if (!table || selectedRowIdx === null) return;
    const rows = table.rowManager?.rows || [];
    const row = rows[selectedRowIdx];
    if (row) {
      const el = row.getElement?.();
      if (el) {
        el.style.height = `${height}px`;
      }
    }
  };

  // Initialize table on open
  useEffect(() => {
    if (!open) {
      // destroy on close
      if (tableRef.current) {
        tableRef.current.destroy();
        tableRef.current = null;
      }
      return;
    }

    const cols = Math.max(
      1,
      initialData.reduce((max, row) => Math.max(max, row.length), 0),
    );
    setColumnsCount(cols);

    // Delay to allow setColumnsCount to settle
    setTimeout(() => {
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
      });

      tableRef.current = table;
    }, 0);
  }, [open, initialData, initialColWidths]);

  const handleAddRow = () => {
    const table = tableRef.current;
    if (!table) return;
    const cols = columnsCount;
    const rowObj: Record<string, any> = { id: Date.now() };
    for (let c = 0; c < cols; c++) {
      rowObj[`c${c}`] = "";
    }
    table.addRow(rowObj, true);
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

  const handleSave = () => {
    const table = tableRef.current;
    if (!table) return;
    const cols = columnsCount;
    const rows = table.getData();
    const data = rowsToData(rows, cols);
    const colDefs = table.getColumns();
    const colWidths = colDefs.map((c: any) => c.getWidth());

    // Get row heights from Tabulator rows
    const rowElements = table.rowManager?.rows || [];
    const rowHeights = rowElements.map((row: any) => {
      const height = row.getElement?.()?.offsetHeight;
      return height ? Math.max(20, Math.round(height)) : 30;
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
          </div>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <label
              htmlFor="row-select"
              style={{ marginRight: "8px", fontSize: "14px" }}
            >
              Высота строки:
            </label>
            <input
              id="row-select"
              type="number"
              min="10"
              max="400"
              value={selectedRowIdx !== null ? 30 : ""}
              placeholder="Высота (px)"
              onChange={(e) => handleRowHeightChange(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                fontSize: "14px",
                width: "100px",
              }}
            />
          </div>
        </div>
        <div className="tabulator-container" ref={containerRef} />
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
