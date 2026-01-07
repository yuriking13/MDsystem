import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  convertInchesToTwip,
  NumberFormat,
  Footer,
  Header,
  PageNumber,
  TextDirection,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ImageRun,
  VerticalAlign,
} from "docx";
import { saveAs } from "file-saver";

export type ExportDocument = {
  title: string;
  content?: string | null;
};

export type ExportBibItem = {
  number: number;
  formatted: string;
};

export type CitationStyleConfig = {
  fontSize: number;
  lineSpacing: number;
  paragraphIndent: number; // in cm
  marginTop: number; // in mm
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  pageNumberPosition: 'center-top' | 'right-top' | 'center-bottom';
};

const STYLE_CONFIGS: Record<string, CitationStyleConfig> = {
  gost: {
    fontSize: 14,
    lineSpacing: 1.5,
    paragraphIndent: 1.25,
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 10,
    textAlign: 'justify',
    pageNumberPosition: 'center-top',
  },
  vancouver: {
    fontSize: 12,
    lineSpacing: 2.0,
    paragraphIndent: 0,
    marginTop: 25,
    marginBottom: 25,
    marginLeft: 25,
    marginRight: 25,
    textAlign: 'left',
    pageNumberPosition: 'right-top',
  },
  apa: {
    fontSize: 12,
    lineSpacing: 2.0,
    paragraphIndent: 1.27,
    marginTop: 25.4,
    marginBottom: 25.4,
    marginLeft: 25.4,
    marginRight: 25.4,
    textAlign: 'left',
    pageNumberPosition: 'right-top',
  },
};

function mmToTwip(mm: number): number {
  return Math.round(mm * 56.7);
}

function cmToTwip(cm: number): number {
  return Math.round(cm * 567);
}

/**
 * Конвертировать HTML таблицу в docx Table
 */
function htmlTableToDocxTable(tableEl: Element, styleConfig: CitationStyleConfig): Table {
  const rows: TableRow[] = [];
  const tableRows = tableEl.querySelectorAll('tr');
  
  // Определяем количество колонок
  let maxCols = 0;
  tableRows.forEach(row => {
    let colCount = 0;
    row.querySelectorAll('th, td').forEach(cell => {
      const colspan = parseInt((cell as HTMLElement).getAttribute('colspan') || '1', 10);
      colCount += colspan;
    });
    maxCols = Math.max(maxCols, colCount);
  });
  
  if (maxCols === 0) maxCols = 1;
  const colWidth = Math.floor(9000 / maxCols); // Примерная ширина в twips
  
  tableRows.forEach((row, rowIdx) => {
    const cells: TableCell[] = [];
    const cellElements = row.querySelectorAll('th, td');
    
    cellElements.forEach(cellEl => {
      const isHeader = cellEl.tagName.toLowerCase() === 'th';
      const colspan = parseInt((cellEl as HTMLElement).getAttribute('colspan') || '1', 10);
      const rowspan = parseInt((cellEl as HTMLElement).getAttribute('rowspan') || '1', 10);
      const text = cellEl.textContent || '';
      
      const cellChildren: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader,
              size: styleConfig.fontSize * 2,
            }),
          ],
          alignment: AlignmentType.LEFT,
        }),
      ];
      
      cells.push(
        new TableCell({
          children: cellChildren,
          width: { size: colWidth * colspan, type: WidthType.DXA },
          columnSpan: colspan > 1 ? colspan : undefined,
          rowSpan: rowspan > 1 ? rowspan : undefined,
          shading: isHeader ? { fill: 'f3f4f6' } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          },
        })
      );
    });
    
    // Добавляем пустые ячейки если нужно
    while (cells.length < maxCols) {
      cells.push(
        new TableCell({
          children: [new Paragraph({ children: [] })],
          width: { size: colWidth, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
          },
        })
      );
    }
    
    rows.push(new TableRow({ children: cells }));
  });
  
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/**
 * Конвертировать data URL в буфер для изображения
 */
function dataUrlToBuffer(dataUrl: string): { buffer: Buffer | Uint8Array; type: 'png' | 'jpg' | 'gif' | 'bmp' } | null {
  try {
    const matches = dataUrl.match(/^data:image\/(png|jpeg|jpg|gif|webp|bmp);base64,(.+)$/);
    if (!matches) return null;
    
    let type = matches[1];
    // Normalize jpeg to jpg for docx library compatibility
    if (type === 'jpeg') type = 'jpg';
    // webp is not supported, skip
    if (type === 'webp') return null;
    
    const base64 = matches[2];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return { buffer: bytes, type: type as 'png' | 'jpg' | 'gif' | 'bmp' };
  } catch (e) {
    console.error('Error converting data URL to buffer:', e);
    return null;
  }
}

/**
 * Рендерить график (canvas) в изображение
 */
async function renderChartToImage(chartEl: Element): Promise<string | null> {
  try {
    const canvas = chartEl.querySelector('canvas');
    if (canvas && canvas instanceof HTMLCanvasElement) {
      return canvas.toDataURL('image/png');
    }
    return null;
  } catch (e) {
    console.error('Error rendering chart to image:', e);
    return null;
  }
}

/**
 * Захват графиков из текущего DOM и создание карты chartId -> dataUrl
 */
export function captureChartsFromDOM(): Map<string, string> {
  const chartImages = new Map<string, string>();
  
  if (typeof window === 'undefined') return chartImages;
  
  // Ищем все графики в текущем DOM
  const chartNodes = document.querySelectorAll('[data-chart-id], .chart-node-wrapper[data-chart-id]');
  
  for (const chartNode of Array.from(chartNodes)) {
    const chartId = chartNode.getAttribute('data-chart-id');
    if (!chartId) continue;
    
    const canvas = chartNode.querySelector('canvas');
    if (canvas && canvas instanceof HTMLCanvasElement) {
      try {
        const dataUrl = canvas.toDataURL('image/png');
        chartImages.set(chartId, dataUrl);
      } catch (e) {
        console.error('Error capturing chart:', chartId, e);
      }
    }
  }
  
  return chartImages;
}

/**
 * Подготовить HTML контент для экспорта (заменить графики на изображения)
 * @param html - исходный HTML контент
 * @param chartImages - карта chartId -> dataUrl изображений графиков
 */
export async function prepareHtmlForExport(html: string, chartImages?: Map<string, string>): Promise<string> {
  if (typeof window === 'undefined' || !html) return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Сначала пробуем найти уже отрендеренные canvas
  const chartNodes = doc.querySelectorAll('.chart-node, [data-chart-id], [data-type="chart-node"]');
  
  for (const chartNode of Array.from(chartNodes)) {
    const chartId = chartNode.getAttribute('data-chart-id');
    const title = chartNode.getAttribute('data-title') || 
                  chartNode.querySelector('.chart-node-title')?.textContent ||
                  'График';
    
    // Проверяем есть ли уже canvas
    const canvas = chartNode.querySelector('canvas');
    
    let dataUrl: string | null = null;
    
    if (canvas && canvas instanceof HTMLCanvasElement) {
      // Canvas найден - конвертируем в изображение
      try {
        dataUrl = canvas.toDataURL('image/png');
      } catch (e) {
        console.error('Error converting chart to image:', e);
      }
    } else if (chartId && chartImages?.has(chartId)) {
      // Используем предзахваченное изображение
      dataUrl = chartImages.get(chartId) || null;
    }
    
    if (dataUrl) {
      // Заменяем chartNode на изображение с подписью
      const figure = doc.createElement('figure');
      figure.style.textAlign = 'center';
      figure.style.margin = '1em 0';
      figure.style.pageBreakInside = 'avoid';
      
      const img = doc.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.setAttribute('data-chart-image', 'true');
      
      const caption = doc.createElement('figcaption');
      caption.textContent = title;
      caption.style.fontSize = '0.9em';
      caption.style.color = '#64748b';
      caption.style.marginTop = '0.5em';
      
      figure.appendChild(img);
      figure.appendChild(caption);
      
      chartNode.replaceWith(figure);
    } else {
      // Нет данных для графика - оставляем placeholder
      const placeholder = doc.createElement('div');
      placeholder.style.textAlign = 'center';
      placeholder.style.padding = '20px';
      placeholder.style.background = '#f8fafc';
      placeholder.style.border = '1px dashed #cbd5e1';
      placeholder.style.borderRadius = '4px';
      placeholder.style.margin = '1em 0';
      placeholder.innerHTML = `<em style="color: #64748b">[${title}]</em>`;
      
      chartNode.replaceWith(placeholder);
    }
  }
  
  return doc.body.innerHTML;
}

/**
 * Конвертировать HTML контент в элементы Word (параграфы, таблицы, изображения)
 */
function htmlToDocxElements(html: string, styleConfig: CitationStyleConfig): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  
  // Простой парсер HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "<p></p>", "text/html");
  
  const processNode = (node: Node): TextRun[] => {
    const runs: TextRun[] = [];
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim() || text.includes(' ')) {
        runs.push(new TextRun({ 
          text,
          size: styleConfig.fontSize * 2, // docx uses half-points
        }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      // Handle citations [1], [2], etc.
      if (el.classList.contains('citation-ref')) {
        const citationText = el.textContent || '';
        runs.push(new TextRun({
          text: citationText,
          size: styleConfig.fontSize * 2,
          color: '2563EB', // Blue color for citations
        }));
        return runs;
      }
      
      // Рекурсивно обрабатываем детей
      const childRuns: TextRun[] = [];
      el.childNodes.forEach((child) => {
        childRuns.push(...processNode(child));
      });
      
      // Применяем форматирование в зависимости от тега
      if (tagName === "strong" || tagName === "b") {
        childRuns.forEach((run) => {
          const runData = {
            text: (run as any).text || '',
            bold: true,
            size: styleConfig.fontSize * 2,
          };
          runs.push(new TextRun(runData));
        });
      } else if (tagName === "em" || tagName === "i") {
        childRuns.forEach((run) => {
          const runData = {
            text: (run as any).text || '',
            italics: true,
            size: styleConfig.fontSize * 2,
          };
          runs.push(new TextRun(runData));
        });
      } else if (tagName === "u") {
        childRuns.forEach((run) => {
          const runData = {
            text: (run as any).text || '',
            underline: {},
            size: styleConfig.fontSize * 2,
          };
          runs.push(new TextRun(runData));
        });
      } else if (tagName === "s" || tagName === "strike") {
        childRuns.forEach((run) => {
          const runData = {
            text: (run as any).text || '',
            strike: true,
            size: styleConfig.fontSize * 2,
          };
          runs.push(new TextRun(runData));
        });
      } else {
        runs.push(...childRuns);
      }
    }
    
    return runs;
  };
  
  const getAlignment = (el: Element): typeof AlignmentType[keyof typeof AlignmentType] | undefined => {
    const style = (el as HTMLElement).style?.textAlign || (el as HTMLElement).getAttribute('data-text-align');
    if (style === 'center') return AlignmentType.CENTER;
    if (style === 'right') return AlignmentType.RIGHT;
    if (style === 'justify') return AlignmentType.JUSTIFIED;
    if (style === 'left') return AlignmentType.LEFT;
    // Default based on style config
    const alignMap: Record<string, typeof AlignmentType[keyof typeof AlignmentType]> = {
      'left': AlignmentType.LEFT,
      'center': AlignmentType.CENTER,
      'right': AlignmentType.RIGHT,
      'justify': AlignmentType.JUSTIFIED,
    };
    return alignMap[styleConfig.textAlign];
  };
  
  // Обработка всех элементов по порядку, включая таблицы и изображения
  const processBodyChildren = () => {
    const body = doc.body;
    
    // Проходим по всем дочерним элементам в порядке их появления
    const walk = (parent: Element) => {
      const children = Array.from(parent.children);
      
      for (const child of children) {
        const tagName = child.tagName.toLowerCase();
        
        // Обработка таблиц
        if (tagName === 'table') {
          const table = htmlTableToDocxTable(child, styleConfig);
          elements.push(table);
          // Добавляем пустой параграф после таблицы
          elements.push(new Paragraph({ children: [], spacing: { after: 200 } }));
          continue;
        }
        
        // Обработка изображений
        if (tagName === 'img') {
          const src = child.getAttribute('src');
          if (src && src.startsWith('data:image')) {
            const imageData = dataUrlToBuffer(src);
            if (imageData) {
              try {
                const imageRun = new ImageRun({
                  data: imageData.buffer,
                  transformation: {
                    width: 500,
                    height: 300,
                  },
                  type: imageData.type,
                });
                elements.push(new Paragraph({
                  children: [imageRun],
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 200, after: 200 },
                }));
              } catch (e) {
                console.error('Error adding image to docx:', e);
                // Добавляем placeholder текст если изображение не удалось вставить
                elements.push(new Paragraph({
                  children: [new TextRun({ text: '[Изображение]', italics: true, color: '666666' })],
                  alignment: AlignmentType.CENTER,
                }));
              }
            }
          }
          continue;
        }
        
        // Обработка div-ов с графиками
        if (tagName === 'div' && (child.classList.contains('chart-node') || child.hasAttribute('data-chart-id'))) {
          // Ищем canvas внутри и пытаемся получить изображение
          const canvas = child.querySelector('canvas');
          const title = child.querySelector('.chart-node-title')?.textContent || 'График';
          
          // Добавляем placeholder с названием графика
          elements.push(new Paragraph({
            children: [new TextRun({ text: `[${title}]`, italics: true, color: '666666' })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }));
          continue;
        }
        
        // Обработка параграфов и заголовков
        if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const runs = processNode(child);
          
          let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
          if (tagName === "h1") heading = HeadingLevel.HEADING_1;
          if (tagName === "h2") heading = HeadingLevel.HEADING_2;
          if (tagName === "h3") heading = HeadingLevel.HEADING_3;
          
          const hasIndent = child.classList.contains('indent');
          
          elements.push(
            new Paragraph({
              children: runs.length > 0 ? runs : [new TextRun({ text: '' })],
              heading,
              alignment: getAlignment(child),
              spacing: {
                line: styleConfig.lineSpacing * 240,
                after: 120,
              },
              indent: hasIndent ? {
                firstLine: cmToTwip(styleConfig.paragraphIndent),
              } : undefined,
            })
          );
          continue;
        }
        
        // Обработка списков
        if (tagName === 'ul' || tagName === 'ol') {
          const items = child.querySelectorAll('li');
          items.forEach((item, idx) => {
            const runs = processNode(item);
            const bullet = tagName === 'ul' ? '• ' : `${idx + 1}. `;
            elements.push(
              new Paragraph({
                children: [
                  new TextRun({ text: bullet, size: styleConfig.fontSize * 2 }),
                  ...runs,
                ],
                spacing: { line: styleConfig.lineSpacing * 240, after: 60 },
                indent: { left: cmToTwip(0.5) },
              })
            );
          });
          continue;
        }
        
        // Обработка blockquote
        if (tagName === 'blockquote') {
          const runs = processNode(child);
          elements.push(
            new Paragraph({
              children: runs,
              spacing: { line: styleConfig.lineSpacing * 240, after: 120 },
              indent: { left: cmToTwip(1), right: cmToTwip(1) },
              shading: { fill: 'f5f5f5' },
            })
          );
          continue;
        }
        
        // Обработка вложенных div
        if (tagName === 'div') {
          walk(child);
          continue;
        }
        
        // Для остальных элементов пробуем обработать как текст
        const runs = processNode(child);
        if (runs.length > 0) {
          elements.push(
            new Paragraph({
              children: runs,
              alignment: getAlignment(child),
              spacing: { line: styleConfig.lineSpacing * 240, after: 120 },
            })
          );
        }
      }
    };
    
    walk(body);
  };
  
  processBodyChildren();
  
  // Если ничего не обработано, добавляем пустой параграф
  if (elements.length === 0) {
    elements.push(new Paragraph({ children: [] }));
  }
  
  return elements;
}

/**
 * Конвертировать HTML контент в параграфы Word (обратная совместимость)
 */
function htmlToDocxParagraphs(html: string, styleConfig: CitationStyleConfig): Paragraph[] {
  const elements = htmlToDocxElements(html, styleConfig);
  // Возвращаем только параграфы для обратной совместимости
  return elements.filter((el): el is Paragraph => el instanceof Paragraph);
}

/**
 * Экспортировать проект в Word документ
 */
export async function exportToWord(
  projectName: string,
  documents: ExportDocument[],
  bibliography: ExportBibItem[],
  citationStyle: string,
  mergedContent?: string
): Promise<void> {
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  const sections: (Paragraph | Table)[] = [];
  
  // Титульная страница
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: projectName, bold: true, size: 48 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [new TextRun({ 
        text: `Стиль цитирования: ${citationStyle.toUpperCase()}`, 
        size: 24,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 500 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [new TextRun({ 
        text: `Дата экспорта: ${new Date().toLocaleDateString("ru-RU")}`, 
        size: 24,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );
  
  // Разрыв страницы
  sections.push(new Paragraph({ children: [new PageBreak()] }));
  
  // Оглавление (простое)
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "СОДЕРЖАНИЕ", bold: true, size: styleConfig.fontSize * 2 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    })
  );
  
  documents.forEach((doc, idx) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `${idx + 1}. ${doc.title}`, size: styleConfig.fontSize * 2 })],
        spacing: { before: 100 },
      })
    );
  });
  
  if (bibliography.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Список литературы", size: styleConfig.fontSize * 2 })],
        spacing: { before: 100 },
      })
    );
  }
  
  // Разрыв страницы
  sections.push(new Paragraph({ children: [new PageBreak()] }));
  
  // Документы (главы)
  if (mergedContent) {
    // Экспорт объединённого документа с общей нумерацией цитат
    const contentElements = htmlToDocxElements(mergedContent, styleConfig);
    sections.push(...contentElements);
  } else {
    // Экспорт отдельных глав
    documents.forEach((doc, idx) => {
      // Заголовок главы
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${doc.title}`, bold: true, size: styleConfig.fontSize * 2 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      
      // Содержимое (теперь с поддержкой таблиц и изображений)
      if (doc.content) {
        const contentElements = htmlToDocxElements(doc.content, styleConfig);
        sections.push(...contentElements);
      }
      
      // Разрыв страницы после главы (кроме последней)
      if (idx < documents.length - 1) {
        sections.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });
  }
  
  // Список литературы
  if (bibliography.length > 0) {
    sections.push(new Paragraph({ children: [new PageBreak()] }));
    
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "СПИСОК ЛИТЕРАТУРЫ", bold: true, size: styleConfig.fontSize * 2 })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
    
    bibliography.forEach((item) => {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `${item.number}. ${item.formatted}`, size: styleConfig.fontSize * 2 })],
          spacing: { before: 100 },
          alignment: AlignmentType.JUSTIFIED,
          indent: {
            hanging: cmToTwip(1), // Hanging indent for bibliography
          },
        })
      );
    });
  }
  
  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: mmToTwip(styleConfig.marginTop),
              bottom: mmToTwip(styleConfig.marginBottom),
              left: mmToTwip(styleConfig.marginLeft),
              right: mmToTwip(styleConfig.marginRight),
            },
          },
        },
        headers: {
          default: new Header({
            children: styleConfig.pageNumberPosition.includes('top') ? [
              new Paragraph({
                children: [new TextRun({ children: [PageNumber.CURRENT] })],
                alignment: styleConfig.pageNumberPosition === 'center-top' 
                  ? AlignmentType.CENTER 
                  : AlignmentType.RIGHT,
              }),
            ] : [],
          }),
        },
        children: sections,
      },
    ],
  });
  
  // Генерируем и скачиваем
  const blob = await Packer.toBlob(doc);
  const baseFilename = projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_");
  const filename = mergedContent 
    ? `${baseFilename}_объединённый.docx`
    : `${baseFilename}_главы.docx`;
  saveAs(blob, filename);
}

/**
 * Экспортировать только список литературы в Word
 */
export async function exportBibliographyToWord(
  projectName: string,
  bibliography: ExportBibItem[],
  citationStyle: string
): Promise<void> {
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  const sections: Paragraph[] = [];
  
  // Заголовок
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "СПИСОК ЛИТЕРАТУРЫ", bold: true, size: styleConfig.fontSize * 2 })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [new TextRun({ 
        text: `Проект: ${projectName}`, 
        size: styleConfig.fontSize * 2,
        italics: true,
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [new TextRun({ 
        text: `Стиль: ${citationStyle.toUpperCase()} | Дата: ${new Date().toLocaleDateString("ru-RU")}`, 
        size: 20,
        color: '64748b',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Список литературы
  bibliography.forEach((item) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `${item.number}. ${item.formatted}`, size: styleConfig.fontSize * 2 })],
        spacing: { before: 120, after: 60 },
        alignment: AlignmentType.JUSTIFIED,
        indent: {
          hanging: cmToTwip(1),
        },
      })
    );
  });
  
  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: mmToTwip(styleConfig.marginTop),
              bottom: mmToTwip(styleConfig.marginBottom),
              left: mmToTwip(styleConfig.marginLeft),
              right: mmToTwip(styleConfig.marginRight),
            },
          },
        },
        children: sections,
      },
    ],
  });
  
  // Генерируем и скачиваем
  const blob = await Packer.toBlob(doc);
  const filename = `${projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_")}_bibliography.docx`;
  saveAs(blob, filename);
}

/**
 * Экспортировать только список литературы в TXT
 */
export function exportBibliographyToTxt(
  projectName: string,
  bibliography: ExportBibItem[],
  citationStyle: string
): void {
  let content = `СПИСОК ЛИТЕРАТУРЫ\n`;
  content += `Проект: ${projectName}\n`;
  content += `Стиль: ${citationStyle.toUpperCase()}\n`;
  content += `Дата: ${new Date().toLocaleDateString("ru-RU")}\n`;
  content += `\n${'='.repeat(60)}\n\n`;
  
  bibliography.forEach((item) => {
    content += `${item.number}. ${item.formatted}\n\n`;
  });
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const filename = `${projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_")}_bibliography.txt`;
  saveAs(blob, filename);
}

/**
 * Генерация HTML для печати/PDF
 */
export function generatePrintHtml(
  projectName: string,
  documents: ExportDocument[],
  bibliography: ExportBibItem[],
  citationStyle: string,
  mergedContent?: string
): string {
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  
  const styles = `
    @page {
      size: A4;
      margin: ${styleConfig.marginTop}mm ${styleConfig.marginRight}mm ${styleConfig.marginBottom}mm ${styleConfig.marginLeft}mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${styleConfig.fontSize}pt;
      line-height: ${styleConfig.lineSpacing};
      text-align: ${styleConfig.textAlign};
      color: #1e293b;
      margin: 0;
      padding: 20px;
    }
    h1, h2, h3 {
      page-break-after: avoid;
    }
    h1 { font-size: 18pt; margin: 1em 0 0.5em; }
    h2 { font-size: 16pt; margin: 0.8em 0 0.4em; }
    h3 { font-size: 14pt; margin: 0.6em 0 0.3em; }
    p { margin: 0 0 0.5em; }
    p.indent { text-indent: ${styleConfig.paragraphIndent}cm; }
    .citation-ref { color: #2563eb; font-weight: 600; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #1e293b;
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th { 
      background: #f1f5f9; 
      font-weight: 600; 
      text-align: center;
    }
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1em auto;
      page-break-inside: avoid;
    }
    .chart-node, [data-chart-id] {
      page-break-inside: avoid;
      margin: 1em 0;
    }
    figure {
      margin: 1em 0;
      text-align: center;
      page-break-inside: avoid;
    }
    figcaption {
      font-size: 0.9em;
      color: #64748b;
      margin-top: 0.5em;
    }
    .title-page {
      text-align: center;
      padding-top: 200px;
      page-break-after: always;
    }
    .title-page h1 { font-size: 24pt; }
    .toc { page-break-after: always; }
    .chapter { page-break-before: always; }
    .bibliography { page-break-before: always; }
    .bib-item { 
      margin-bottom: 12px; 
      text-indent: -1cm;
      padding-left: 1cm;
    }
    @media print {
      body { padding: 0; }
    }
  `;
  
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName}</title>
  <style>${styles}</style>
</head>
<body>
`;

  // Title page
  html += `
  <div class="title-page">
    <h1>${projectName}</h1>
    <p>Стиль цитирования: ${citationStyle.toUpperCase()}</p>
    <p>Дата: ${new Date().toLocaleDateString("ru-RU")}</p>
  </div>
`;

  // TOC
  html += `
  <div class="toc">
    <h1 style="text-align: center;">СОДЕРЖАНИЕ</h1>
    <ul style="list-style: none; padding: 0;">
`;
  documents.forEach((doc, idx) => {
    html += `      <li>${idx + 1}. ${doc.title}</li>\n`;
  });
  if (bibliography.length > 0) {
    html += `      <li>Список литературы</li>\n`;
  }
  html += `    </ul>
  </div>
`;

  // Content
  if (mergedContent) {
    html += `<div class="content">${mergedContent}</div>`;
  } else {
    documents.forEach((doc, idx) => {
      html += `
    <div class="chapter">
      <h1>${idx + 1}. ${doc.title}</h1>
      ${doc.content || ''}
    </div>
`;
    });
  }

  // Bibliography
  if (bibliography.length > 0) {
    html += `
  <div class="bibliography">
    <h1 style="text-align: center;">СПИСОК ЛИТЕРАТУРЫ</h1>
`;
    bibliography.forEach((item) => {
      html += `    <div class="bib-item">${item.number}. ${item.formatted}</div>\n`;
    });
    html += `  </div>
`;
  }

  html += `</body></html>`;
  
  return html;
}

/**
 * Экспорт в PDF через новое окно браузера
 * Открывает окно с готовым документом, пользователь выбирает "Сохранить как PDF" в диалоге печати
 */
export function exportToPdf(
  projectName: string,
  documents: ExportDocument[],
  bibliography: ExportBibItem[],
  citationStyle: string,
  mergedContent?: string
): void {
  const html = generatePrintHtml(projectName, documents, bibliography, citationStyle, mergedContent);
  
  // Открываем новое окно с документом
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Устанавливаем заголовок окна
    const baseFilename = projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_");
    const filename = mergedContent 
      ? `${baseFilename}_объединённый`
      : `${baseFilename}_главы`;
    printWindow.document.title = filename;
    
    // Ждём полной загрузки и открываем диалог печати
    printWindow.onload = () => {
      setTimeout(() => {
        // Добавляем подсказку для пользователя
        const hint = printWindow.document.createElement('div');
        hint.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; background: #1e40af; color: white; padding: 10px; text-align: center; z-index: 10000; font-family: sans-serif;">
            💡 Для сохранения как PDF: выберите "Сохранить как PDF" в качестве принтера
            <button onclick="this.parentElement.remove(); window.print();" style="margin-left: 20px; padding: 5px 15px; cursor: pointer; border: none; border-radius: 4px; background: white; color: #1e40af;">
              Печать / Сохранить PDF
            </button>
          </div>
        `;
        printWindow.document.body.insertBefore(hint, printWindow.document.body.firstChild);
      }, 300);
    };
  } else {
    alert('Не удалось открыть окно для печати. Проверьте блокировщик всплывающих окон.');
  }
}

/**
 * Экспорт только библиографии в PDF
 */
export function exportBibliographyToPdf(
  projectName: string,
  bibliography: ExportBibItem[],
  citationStyle: string
): void {
  const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName} - Список литературы</title>
  <style>
    @page {
      size: A4;
      margin: ${styleConfig.marginTop}mm ${styleConfig.marginRight}mm ${styleConfig.marginBottom}mm ${styleConfig.marginLeft}mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: ${styleConfig.fontSize}pt;
      line-height: ${styleConfig.lineSpacing};
      color: #1e293b;
      margin: 0;
      padding: 20px;
    }
    h1 { text-align: center; margin-bottom: 20px; }
    .subtitle { text-align: center; color: #64748b; margin-bottom: 30px; }
    .bib-item { 
      margin-bottom: 12px; 
      text-align: justify;
      text-indent: -1cm;
      padding-left: 1cm;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>СПИСОК ЛИТЕРАТУРЫ</h1>
  <p class="subtitle">Проект: ${projectName}<br>Стиль: ${citationStyle.toUpperCase()} | Дата: ${new Date().toLocaleDateString("ru-RU")}</p>
  ${bibliography.map(item => `<div class="bib-item">${item.number}. ${item.formatted}</div>`).join('\n')}
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = `${projectName}_bibliography`;
    
    printWindow.onload = () => {
      setTimeout(() => {
        const hint = printWindow.document.createElement('div');
        hint.className = 'no-print';
        hint.innerHTML = `
          <div style="position: fixed; top: 0; left: 0; right: 0; background: #1e40af; color: white; padding: 10px; text-align: center; z-index: 10000; font-family: sans-serif;">
            💡 Для сохранения как PDF: выберите "Сохранить как PDF" в качестве принтера
            <button onclick="this.parentElement.remove(); window.print();" style="margin-left: 20px; padding: 5px 15px; cursor: pointer; border: none; border-radius: 4px; background: white; color: #1e40af;">
              Печать / Сохранить PDF
            </button>
          </div>
        `;
        printWindow.document.body.insertBefore(hint, printWindow.document.body.firstChild);
      }, 300);
    };
  } else {
    alert('Не удалось открыть окно для печати. Проверьте блокировщик всплывающих окон.');
  }
}
