/**
 * Локальный менеджер библиографических данных документа
 * 
 * Ключевые инварианты:
 * 1. Нумерация всегда компактная (без пропусков)
 * 2. Всегда начинается с 1
 * 3. Один источник может иметь несколько цитат (n#1, n#2, n#3)
 * 4. При удалении номера перераспределяются
 * 5. Локальная нумерация полностью автономна от глобальной
 */

import type { Citation } from './api';

export interface LocalCitation {
  id: string;
  articleId: string;
  inlineNumber: number;  // n - номер источника в документе
  subNumber: number;     // k - номер цитаты этого источника (1, 2, 3...)
  note?: string | null;
  pageRange?: string | null;
}

export interface CitationInfo {
  citationId: string;
  articleId: string;
  number: number;        // inline number [n]
  subNumber: number;     // sub number #k
  displayId: string;     // n#k format
  article?: Citation['article'];
}

/**
 * Парсит цитаты из HTML контента редактора
 */
export function parseCitationsFromHTML(html: string): Map<string, { number: number; articleId: string }> {
  const citations = new Map<string, { number: number; articleId: string }>();
  
  if (!html) return citations;
  
  // Регулярное выражение для поиска citation spans
  const citationRegex = /<span[^>]*class="citation-ref"[^>]*data-citation-id="([^"]+)"[^>]*data-citation-number="(\d+)"[^>]*data-article-id="([^"]+)"[^>]*>/g;
  const citationRegex2 = /<span[^>]*data-citation-id="([^"]+)"[^>]*data-citation-number="(\d+)"[^>]*data-article-id="([^"]+)"[^>]*class="citation-ref"[^>]*>/g;
  
  let match;
  while ((match = citationRegex.exec(html)) !== null) {
    citations.set(match[1], { number: parseInt(match[2], 10), articleId: match[3] });
  }
  while ((match = citationRegex2.exec(html)) !== null) {
    citations.set(match[1], { number: parseInt(match[2], 10), articleId: match[3] });
  }
  
  return citations;
}

/**
 * Находит минимальный свободный номер для нового источника
 */
export function findMinFreeSourceNumber(existingNumbers: number[]): number {
  if (existingNumbers.length === 0) return 1;
  
  const sorted = [...new Set(existingNumbers)].sort((a, b) => a - b);
  
  // Ищем первый пропуск
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      return i + 1;
    }
  }
  
  // Все номера подряд, берём следующий
  return sorted.length + 1;
}

/**
 * Находит минимальный свободный sub_number для цитаты источника
 */
export function findMinFreeSubNumber(existingSubNumbers: number[]): number {
  if (existingSubNumbers.length === 0) return 1;
  
  const sorted = [...existingSubNumbers].sort((a, b) => a - b);
  
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) {
      return i + 1;
    }
  }
  
  return sorted.length + 1;
}

/**
 * Пересчитывает номера источников после удаления
 * Возвращает мапинг старый номер -> новый номер
 */
export function recalculateSourceNumbers(
  citations: LocalCitation[]
): Map<number, number> {
  // Группируем по articleId и находим минимальный номер для каждого
  const articleToMinNumber = new Map<string, number>();
  
  for (const citation of citations) {
    const current = articleToMinNumber.get(citation.articleId);
    if (current === undefined || citation.inlineNumber < current) {
      articleToMinNumber.set(citation.articleId, citation.inlineNumber);
    }
  }
  
  // Сортируем статьи по их минимальному номеру
  const sortedArticles = [...articleToMinNumber.entries()]
    .sort((a, b) => a[1] - b[1]);
  
  // Создаём новую последовательную нумерацию
  const oldToNew = new Map<number, number>();
  let newNumber = 1;
  
  for (const [_articleId, oldNumber] of sortedArticles) {
    if (!oldToNew.has(oldNumber)) {
      oldToNew.set(oldNumber, newNumber);
      newNumber++;
    }
  }
  
  return oldToNew;
}

/**
 * Компактифицирует нумерацию (убирает пропуски)
 */
export function compactifyNumbers(citations: LocalCitation[]): LocalCitation[] {
  if (citations.length === 0) return [];
  
  // Группируем по articleId
  const byArticle = new Map<string, LocalCitation[]>();
  for (const c of citations) {
    const list = byArticle.get(c.articleId) || [];
    list.push(c);
    byArticle.set(c.articleId, list);
  }
  
  // Находим порядок статей по первому появлению (минимальный inlineNumber)
  const articleOrder: { articleId: string; minNumber: number }[] = [];
  for (const [articleId, citationList] of byArticle) {
    const minNum = Math.min(...citationList.map(c => c.inlineNumber));
    articleOrder.push({ articleId, minNumber: minNum });
  }
  articleOrder.sort((a, b) => a.minNumber - b.minNumber);
  
  // Присваиваем новые номера
  const result: LocalCitation[] = [];
  let currentNumber = 1;
  
  for (const { articleId } of articleOrder) {
    const citationList = byArticle.get(articleId)!;
    // Сортируем цитаты по subNumber
    citationList.sort((a, b) => a.subNumber - b.subNumber);
    
    let currentSubNumber = 1;
    for (const citation of citationList) {
      result.push({
        ...citation,
        inlineNumber: currentNumber,
        subNumber: currentSubNumber,
      });
      currentSubNumber++;
    }
    currentNumber++;
  }
  
  return result;
}

/**
 * Генерирует отображаемый идентификатор цитаты (n#k или просто n)
 */
export function formatCitationId(inlineNumber: number, subNumber: number, totalSubNumbers: number): string {
  if (totalSubNumbers <= 1) {
    return String(inlineNumber);
  }
  return `${inlineNumber}#${subNumber}`;
}

/**
 * Обновляет HTML контент с новыми номерами цитат
 */
export function updateCitationNumbersInHTML(
  html: string,
  updates: Map<string, { oldNumber: number; newNumber: number }>
): string {
  if (!html || updates.size === 0) return html;
  
  let updatedHtml = html;
  
  for (const [citationId, { oldNumber, newNumber }] of updates) {
    if (oldNumber === newNumber) continue;
    
    // Обновляем data-citation-number атрибут
    const attrRegex = new RegExp(
      `(<span[^>]*data-citation-id="${citationId}"[^>]*)data-citation-number="${oldNumber}"`,
      'g'
    );
    updatedHtml = updatedHtml.replace(attrRegex, `$1data-citation-number="${newNumber}"`);
    
    // Обновляем текст [n] внутри span
    const textRegex = new RegExp(
      `(<span[^>]*data-citation-id="${citationId}"[^>]*>)\\[${oldNumber}\\](<\\/span>)`,
      'g'
    );
    updatedHtml = updatedHtml.replace(textRegex, `$1[${newNumber}]$2`);
  }
  
  return updatedHtml;
}

/**
 * Конвертирует Citation API формат в LocalCitation
 */
export function apiToLocalCitation(citation: Citation): LocalCitation {
  return {
    id: citation.id,
    articleId: citation.article_id,
    inlineNumber: citation.inline_number,
    subNumber: citation.sub_number || 1,
    note: citation.note,
    pageRange: citation.page_range,
  };
}

/**
 * Группирует цитаты по источнику для отображения в сайдбаре
 */
export function groupCitationsBySource(citations: Citation[]): Map<string, CitationInfo[]> {
  const groups = new Map<string, CitationInfo[]>();
  
  for (const citation of citations) {
    const articleId = citation.article_id;
    const list = groups.get(articleId) || [];
    
    // Подсчитываем сколько всего цитат у этого источника
    const totalSubs = citations.filter(c => c.article_id === articleId).length;
    
    list.push({
      citationId: citation.id,
      articleId: citation.article_id,
      number: citation.inline_number,
      subNumber: citation.sub_number || 1,
      displayId: formatCitationId(citation.inline_number, citation.sub_number || 1, totalSubs),
      article: citation.article,
    });
    
    groups.set(articleId, list);
  }
  
  // Сортируем цитаты внутри каждой группы
  for (const [, list] of groups) {
    list.sort((a, b) => a.subNumber - b.subNumber);
  }
  
  return groups;
}

/**
 * Сортирует цитаты для отображения в списке литературы
 * Порядок: по номеру источника, затем по sub_number
 */
export function sortCitationsForDisplay(citations: Citation[]): Citation[] {
  return [...citations].sort((a, b) => {
    if (a.inline_number !== b.inline_number) {
      return a.inline_number - b.inline_number;
    }
    return (a.sub_number || 1) - (b.sub_number || 1);
  });
}

/**
 * Проверяет, нужно ли отображать sub_number для данного источника
 */
export function shouldShowSubNumber(citations: Citation[], articleId: string): boolean {
  const count = citations.filter(c => c.article_id === articleId).length;
  return count > 1;
}

/**
 * Определяет, какой номер присвоить новой цитате источника
 */
export function getNextCitationNumbers(
  existingCitations: Citation[],
  articleId: string
): { inlineNumber: number; subNumber: number } {
  // Проверяем, есть ли уже цитаты этого источника
  const existingForArticle = existingCitations.filter(c => c.article_id === articleId);
  
  if (existingForArticle.length > 0) {
    // Используем тот же inline_number
    const inlineNumber = existingForArticle[0].inline_number;
    
    // Находим минимальный свободный sub_number
    const existingSubNumbers = existingForArticle.map(c => c.sub_number || 1);
    const subNumber = findMinFreeSubNumber(existingSubNumbers);
    
    return { inlineNumber, subNumber };
  }
  
  // Новый источник - находим минимальный свободный номер
  const existingInlineNumbers = [...new Set(existingCitations.map(c => c.inline_number))];
  const inlineNumber = findMinFreeSourceNumber(existingInlineNumbers);
  
  return { inlineNumber, subNumber: 1 };
}

/**
 * Валидирует целостность нумерации
 */
export function validateNumbering(citations: Citation[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (citations.length === 0) {
    return { valid: true, errors: [] };
  }
  
  // Проверка 1: Нумерация начинается с 1
  const minNumber = Math.min(...citations.map(c => c.inline_number));
  if (minNumber !== 1) {
    errors.push(`Нумерация должна начинаться с 1, найден минимум: ${minNumber}`);
  }
  
  // Проверка 2: Нет пропусков в номерах
  const uniqueNumbers = [...new Set(citations.map(c => c.inline_number))].sort((a, b) => a - b);
  for (let i = 0; i < uniqueNumbers.length; i++) {
    if (uniqueNumbers[i] !== i + 1) {
      errors.push(`Пропуск в нумерации: ожидался ${i + 1}, найден ${uniqueNumbers[i]}`);
      break;
    }
  }
  
  // Проверка 3: Все цитаты одного источника имеют одинаковый inline_number
  const byArticle = new Map<string, Set<number>>();
  for (const c of citations) {
    const set = byArticle.get(c.article_id) || new Set();
    set.add(c.inline_number);
    byArticle.set(c.article_id, set);
  }
  
  for (const [articleId, numbers] of byArticle) {
    if (numbers.size > 1) {
      errors.push(`Источник ${articleId} имеет разные номера: ${[...numbers].join(', ')}`);
    }
  }
  
  // Проверка 4: sub_number компактны внутри каждого источника
  for (const [articleId, ] of byArticle) {
    const subs = citations
      .filter(c => c.article_id === articleId)
      .map(c => c.sub_number || 1)
      .sort((a, b) => a - b);
    
    for (let i = 0; i < subs.length; i++) {
      if (subs[i] !== i + 1) {
        errors.push(`Источник ${articleId}: пропуск в sub_number`);
        break;
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
