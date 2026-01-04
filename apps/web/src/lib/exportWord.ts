import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
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

/**
 * Конвертировать HTML контент в параграфы Word
 */
function htmlToDocxParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // Простой парсер HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "<p></p>", "text/html");
  
  const processNode = (node: Node): TextRun[] => {
    const runs: TextRun[] = [];
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim()) {
        runs.push(new TextRun({ text }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tagName = el.tagName.toLowerCase();
      
      // Рекурсивно обрабатываем детей
      const childRuns: TextRun[] = [];
      el.childNodes.forEach((child) => {
        childRuns.push(...processNode(child));
      });
      
      // Применяем форматирование в зависимости от тега
      if (tagName === "strong" || tagName === "b") {
        childRuns.forEach((run) => {
          runs.push(new TextRun({ ...run, bold: true }));
        });
      } else if (tagName === "em" || tagName === "i") {
        childRuns.forEach((run) => {
          runs.push(new TextRun({ ...run, italics: true }));
        });
      } else if (tagName === "u") {
        childRuns.forEach((run) => {
          runs.push(new TextRun({ ...run, underline: {} }));
        });
      } else {
        runs.push(...childRuns);
      }
    }
    
    return runs;
  };
  
  // Обрабатываем каждый блочный элемент
  const body = doc.body;
  const blockElements = body.querySelectorAll("p, h1, h2, h3, li, blockquote");
  
  if (blockElements.length === 0) {
    // Если нет блочных элементов, обрабатываем весь body
    const runs = processNode(body);
    if (runs.length > 0) {
      paragraphs.push(new Paragraph({ children: runs }));
    }
  } else {
    blockElements.forEach((block) => {
      const tagName = block.tagName.toLowerCase();
      const runs = processNode(block);
      
      if (runs.length === 0) return;
      
      let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined;
      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] | undefined;
      
      if (tagName === "h1") heading = HeadingLevel.HEADING_1;
      if (tagName === "h2") heading = HeadingLevel.HEADING_2;
      if (tagName === "h3") heading = HeadingLevel.HEADING_3;
      
      // Проверяем text-align
      const style = (block as HTMLElement).style?.textAlign;
      if (style === "center") alignment = AlignmentType.CENTER;
      if (style === "right") alignment = AlignmentType.RIGHT;
      if (style === "justify") alignment = AlignmentType.JUSTIFIED;
      
      paragraphs.push(
        new Paragraph({
          children: runs,
          heading,
          alignment,
        })
      );
    });
  }
  
  return paragraphs;
}

/**
 * Экспортировать проект в Word документ
 * @param mergedContent - если передан, экспортирует как единый документ с общей нумерацией цитат
 */
export async function exportToWord(
  projectName: string,
  documents: ExportDocument[],
  bibliography: ExportBibItem[],
  citationStyle: string,
  mergedContent?: string
): Promise<void> {
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
      children: [new TextRun({ text: `Стиль цитирования: ${citationStyle.toUpperCase()}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 500 },
    })
  );
  
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: `Дата экспорта: ${new Date().toLocaleDateString("ru-RU")}`, size: 24 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    })
  );
  
  // Разрыв страницы
  sections.push(new Paragraph({ children: [new PageBreak()] }));
  
  // Оглавление (простое)
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: "СОДЕРЖАНИЕ", bold: true })],
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    })
  );
  
  documents.forEach((doc, idx) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `${idx + 1}. ${doc.title}` })],
        spacing: { before: 100 },
      })
    );
  });
  
  if (bibliography.length > 0) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Список литературы" })],
        spacing: { before: 100 },
      })
    );
  }
  
  // Разрыв страницы
  sections.push(new Paragraph({ children: [new PageBreak()] }));
  
  // Документы (главы)
  if (mergedContent) {
    // Экспорт объединённого документа с общей нумерацией цитат
    const contentParagraphs = htmlToDocxParagraphs(mergedContent);
    sections.push(...contentParagraphs);
  } else {
    // Экспорт отдельных глав
    documents.forEach((doc, idx) => {
      // Заголовок главы
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${doc.title}`, bold: true })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      
      // Содержимое
      if (doc.content) {
        const contentParagraphs = htmlToDocxParagraphs(doc.content);
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
        children: [new TextRun({ text: "СПИСОК ЛИТЕРАТУРЫ", bold: true })],
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );
    
    bibliography.forEach((item) => {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: `${item.number}. ${item.formatted}` })],
          spacing: { before: 100 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    });
  }
  
  // Создаём документ
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: sections,
      },
    ],
  });
  
  // Генерируем и скачиваем
  const blob = await Packer.toBlob(doc);
  const filename = `${projectName.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, "").replace(/\s+/g, "_")}.docx`;
  saveAs(blob, filename);
}
