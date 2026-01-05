import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button } from 'flowbite-react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import './TabulatorModal.css';

export type TableEditorPayload = {
  data: string[][];
  colWidths?: number[];
  statisticId?: string | null;
};

interface TableEditorModalProps {
  open: boolean;
  initialData: string[][];
  initialColWidths?: number[];
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
      editor: 'input',
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
      obj[`c${c}`] = row[c] ?? '';
    }
    return obj;
  });
};

// Convert tabulator rows back to 2D array
const rowsToData = (rows: any[], cols: number) => {
  return rows.map((rowObj) => {
    const arr: string[] = [];
    for (let c = 0; c < cols; c++) {
      arr.push(rowObj[`c${c}`] ?? '');
    }
    return arr;
  });
};

export const TableEditorModal: React.FC<TableEditorModalProps> = ({
  open,
  initialData,
  initialColWidths,
  onClose,
  onSave,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<any | null>(null);
  const [columnsCount, setColumnsCount] = useState<number>(0);
  const ModalAny = Modal as any;

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

    const cols = Math.max(1, initialData.reduce((max, row) => Math.max(max, row.length), 0));
    setColumnsCount(cols);

    // Delay to allow setColumnsCount to settle
    setTimeout(() => {
      if (!containerRef.current) return;

      const table = new Tabulator(containerRef.current, {
        data: dataToRows(initialData, cols),
        columns: buildColumns(cols, initialColWidths),
        layout: 'fitColumns',
        reactiveData: false,
        selectable: false,
        columnDefaults: {
          editor: 'input',
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
      rowObj[`c${c}`] = '';
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
      editor: 'input',
      resizable: true,
      minWidth: 50,
    } as any;
    table.addColumn(colDef, false, undefined, undefined, true);
    table.getData().forEach((row: any) => {
      row[field] = row[field] ?? '';
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
    onSave({ data, colWidths });
  };

  return (
    <Modal show={open} size="6xl" dismissible onClose={onClose} className="tabulator-modal">
      <ModalAny.Header>Редактирование таблицы</ModalAny.Header>
      <ModalAny.Body>
        <div className="tabulator-controls">
          <div className="tabulator-buttons">
            <Button size="sm" color="gray" onClick={handleAddRow}>
              + Строка
            </Button>
            <Button size="sm" color="gray" onClick={handleAddColumn}>
              + Колонка
            </Button>
          </div>
        </div>
        <div className="tabulator-container" ref={containerRef} />
      </ModalAny.Body>
      <ModalAny.Footer>
        <Button color="light" onClick={onClose}>
          Отмена
        </Button>
        <Button onClick={handleSave}>Сохранить</Button>
      </ModalAny.Footer>
    </Modal>
  );
};

export default TableEditorModal;
