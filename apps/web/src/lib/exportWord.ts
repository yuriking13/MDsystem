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
 * Конвертировать HTML контент в параграфы Word
 */
function htmlToDocxParagraphs(html: string, styleConfig: CitationStyleConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
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
  
  // Обрабатываем каждый блочный элемент
  const body = doc.body;
  const blockElements = body.querySelectorAll("p, h1, h2, h3, li, blockquote");
  
  if (blockElements.length === 0) {
    // Если нет блочных элементов, обрабатываем весь body
    const runs = processNode(body);
    if (runs.length > 0) {
      paragraphs.push(new Paragraph({ 
        children: runs,
        alignment: getAlignment(body),
        spacing: {
          line: styleConfig.lineSpacing * 240, // 240 = single spacing
        },
      }));
    }
  } else {
    blockElements.forEach((block) => {
      const tagName = block.tagName.toLowerCase();
      const runs = processNode(block);
      
      if (runs.length === 0 && tagName !== 'p') return;
      
      let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
      
      if (tagName === "h1") heading = HeadingLevel.HEADING_1;
      if (tagName === "h2") heading = HeadingLevel.HEADING_2;
      if (tagName === "h3") heading = HeadingLevel.HEADING_3;
      
      const hasIndent = block.classList.contains('indent');
      
      paragraphs.push(
        new Paragraph({
          children: runs.length > 0 ? runs : [new TextRun({ text: '' })],
          heading,
          alignment: getAlignment(block),
          spacing: {
            line: styleConfig.lineSpacing * 240,
            after: 120, // Small space after paragraph
          },
          indent: hasIndent ? {
            firstLine: cmToTwip(styleConfig.paragraphIndent),
          } : undefined,
        })
      );
    });
  }
  
  return paragraphs;
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
  const sections: Paragraph[] = [];
  
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
    const contentParagraphs = htmlToDocxParagraphs(mergedContent, styleConfig);
    sections.push(...contentParagraphs);
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
      
      // Содержимое
      if (doc.content) {
        const contentParagraphs = htmlToDocxParagraphs(doc.content, styleConfig);
        sections.push(...contentParagraphs);
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
  const filename = `${projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_")}.docx`;
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
    }
    th, td {
      border: 1px solid #1e293b;
      padding: 8px;
      text-align: left;
    }
    th { background: #f1f5f9; font-weight: 600; }
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
 * Экспорт в PDF через печать браузера
 */
export function exportToPdf(
  projectName: string,
  documents: ExportDocument[],
  bibliography: ExportBibItem[],
  citationStyle: string,
  mergedContent?: string
): void {
  const html = generatePrintHtml(projectName, documents, bibliography, citationStyle, mergedContent);
  
  // Открываем новое окно с HTML и вызываем печать
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Ждём загрузки и вызываем печать
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
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
    }
  </style>
</head>
<body>
  <h1>СПИСОК ЛИТЕРАТУРЫ</h1>
  <p class="subtitle">Проект: ${projectName}<br>Стиль: ${citationStyle.toUpperCase()} | Дата: ${new Date().toLocaleDateString("ru-RU")}</p>
  ${bibliography.map(item => `<div class="bib-item">${item.number}. ${item.formatted}</div>`).join('\n')}
</body>
</html>`;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}
